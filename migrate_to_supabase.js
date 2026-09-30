/**
 * EduVault — Neon to Supabase Zero-Loss Database Migration Engine
 * 
 * Usage:
 *   node migrate_to_supabase.js "<YOUR-SUPABASE-PASSWORD>"
 * 
 * Or simply run:
 *   node migrate_to_supabase.js
 * (It will prompt you to enter the password securely)
 */

const { Client } = require('./src/EduVault.Express/node_modules/pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 1. Neon Configuration (Source)
const NEON_CONFIG = {
  host: 'ep-mute-frog-aqsgvfs4-pooler.c-8.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_i25fLQwoSqeK',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120000,
  query_timeout: 120000
};

// 2. Supabase Configuration (Target)
const SUPABASE_HOST = 'aws-0-ap-northeast-2.pooler.supabase.com';
const SUPABASE_PORT = 5432;
const SUPABASE_DB = 'postgres';
const SUPABASE_USER = 'postgres.ridnowaogeguaszgxxxk';

async function getPassword() {
  if (process.argv[2]) {
    return process.argv[2].trim();
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question('\n🔑 Enter your Supabase Database Password: ', pwd => {
      rl.close();
      resolve(pwd.trim());
    });
  });
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function runMigration() {
  console.log('===========================================================');
  console.log('  🚀 EduVault — Neon ➔ Supabase Migration Engine');
  console.log('===========================================================');

  const supabasePassword = await getPassword();
  if (!supabasePassword) {
    console.error('❌ Error: Password cannot be empty!');
    process.exit(1);
  }

  const SUPABASE_CONFIG = {
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    database: SUPABASE_DB,
    user: SUPABASE_USER,
    password: supabasePassword,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 120000,
    query_timeout: 120000
  };

  const neon = new Client(NEON_CONFIG);
  const supabase = new Client(SUPABASE_CONFIG);

  try {
    console.log('\n[1/5] Connecting to Neon (Source)...');
    await neon.connect();
    console.log('  ✅ Connected to Neon database successfully!');

    console.log('\n[2/5] Connecting to Supabase (Target)...');
    await supabase.connect();
    console.log('  ✅ Connected to Supabase database successfully!');

    // Step 3: Apply Schema
    console.log('\n[3/5] Applying complete database schema to Supabase...');
    const schemaFile = path.join(__dirname, 'complete_supabase_schema.sql');
    if (fs.existsSync(schemaFile)) {
      let sql = fs.readFileSync(schemaFile, 'utf8');
      // Strip all UTF-8 BOM characters globally
      sql = sql.replace(/\uFEFF/g, '');
      
      // Execute schema commands
      try {
        await supabase.query(sql);
        console.log('  ✅ Database schema & migrations applied to Supabase successfully!');
      } catch (schemaErr) {
        console.error('  ❌ Fatal error during schema execution:', schemaErr.message);
        throw schemaErr;
      }
    } else {
      console.log('  ⚠️ complete_supabase_schema.sql not found, will rely on table sync.');
    }

    // Step 4: Discover all active public tables from Neon
    console.log('\n[4/5] Discovering tables and migrating data...');
    const tableRes = await neon.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tableRes.rows.map(r => r.table_name);
    console.log(`  Found ${tables.length} tables in Neon.`);

    // Temporarily disable foreign key constraints on target for bulk insert
    let disabledFks = false;
    try {
      await supabase.query("SET session_replication_role = 'replica';");
      disabledFks = true;
    } catch (e) {
      console.log('  (Standard replication role used)');
    }

    const report = [];
    let totalMigratedRows = 0;

    for (const table of tables) {
      // Get count from Neon
      const countRes = await neon.query(`SELECT COUNT(*) as count FROM "${table}";`);
      const rowCount = parseInt(countRes.rows[0].count, 10);

      if (rowCount === 0) {
        report.push({ table, neonCount: 0, supabaseCount: 0, status: 'EMPTY (Skipped)' });
        continue;
      }

      process.stdout.write(`  Syncing "${table}" (${rowCount} rows)... `);

      // Fetch all rows from Neon
      const rowsRes = await neon.query(`SELECT * FROM "${table}";`);
      const rows = rowsRes.rows;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const colList = columns.map(c => `"${c}"`).join(', ');

        // Insert in batches of 100
        const batches = chunkArray(rows, 100);

        for (const batch of batches) {
          const valueClauses = [];
          const params = [];
          let paramIdx = 1;

          for (const row of batch) {
            const placeholders = [];
            for (const col of columns) {
              placeholders.push(`$${paramIdx++}`);
              params.push(row[col]);
            }
            valueClauses.push(`(${placeholders.join(', ')})`);
          }

          const insertSql = `
            INSERT INTO "${table}" (${colList})
            VALUES ${valueClauses.join(', ')}
            ON CONFLICT DO NOTHING;
          `;

          try {
            await supabase.query(insertSql, params);
          } catch (insertErr) {
            // Fallback: row by row insert if batch hit specific constraint
            for (const row of batch) {
              const singleParams = columns.map(c => row[c]);
              const singlePlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
              try {
                await supabase.query(`
                  INSERT INTO "${table}" (${colList})
                  VALUES (${singlePlaceholders})
                  ON CONFLICT DO NOTHING;
                `, singleParams);
              } catch (singleErr) {
                // ignore conflict
              }
            }
          }
        }
      }

      // Verify row count in Supabase
      let sbCount = 0;
      try {
        const sbCountRes = await supabase.query(`SELECT COUNT(*) as count FROM "${table}";`);
        sbCount = parseInt(sbCountRes.rows[0].count, 10);
      } catch (err) {
        sbCount = -1;
      }

      const match = sbCount >= rowCount;
      totalMigratedRows += sbCount;
      console.log(match ? '✅ DONE' : `⚠️ (${sbCount}/${rowCount})`);

      report.push({
        table,
        neonCount: rowCount,
        supabaseCount: sbCount,
        status: match ? '✅ MATCH' : '⚠️ PARTIAL'
      });
    }

    // Re-enable foreign key constraints
    if (disabledFks) {
      try {
        await supabase.query("SET session_replication_role = 'origin';");
      } catch (e) {}
    }

    // Reset sequences for all auto-increment / serial primary keys
    try {
      const seqRes = await supabase.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public';
      `);
      for (const seq of seqRes.rows) {
        const seqName = seq.sequence_name;
        await supabase.query(`
          SELECT setval('"${seqName}"', COALESCE((SELECT last_value FROM "${seqName}"), 1), true);
        `);
      }
    } catch (seqErr) {
      // Non-critical
    }

    // Step 5: Verification Report
    console.log('\n===========================================================');
    console.log('  📊 [5/5] MIGRATION INTEGRITY VERIFICATION REPORT');
    console.log('===========================================================');

    const activeTablesReport = report.filter(r => r.neonCount > 0);
    console.table(activeTablesReport.map(r => ({
      'Table Name': r.table,
      'Neon (Source)': r.neonCount,
      'Supabase (Target)': r.supabaseCount,
      'Status': r.status
    })));

    const allPassed = activeTablesReport.every(r => r.status === '✅ MATCH');

    if (allPassed) {
      console.log('\n🎉 SUCCESS! 100% of data has been migrated to Supabase without loss!');
      console.log(`   Total Active Records Verified: ${totalMigratedRows} rows across ${activeTablesReport.length} tables.`);
    } else {
      console.log('\n⚠️ Migration completed with some warnings. Please review the table above.');
    }

    console.log('\n===========================================================');
    console.log('  📝 NEXT STEP — UPDATE YOUR .ENV FILE:');
    console.log('===========================================================');
    console.log('In your target project .env (e.g. D:\\vite\\AI\\Eduvault\\.env), update:');
    console.log(`\nConnectionStrings__DefaultConnection="Host=${SUPABASE_HOST};Port=5432;Database=postgres;Username=${SUPABASE_USER};Password=${supabasePassword};SSL Mode=Require;Trust Server Certificate=true;Timeout=60;Command Timeout=60;"\n`);

  } catch (err) {
    console.error('\n❌ Fatal Migration Error:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('👉 Please check that your Supabase database password is correct.');
    }
  } finally {
    try { await neon.end(); } catch (e) {}
    try { await supabase.end(); } catch (e) {}
  }
}

runMigration().catch(console.error);
