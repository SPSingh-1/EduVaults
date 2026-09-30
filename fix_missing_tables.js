const { Client } = require('./src/EduVault.Express/node_modules/pg');

const neon = new Client({
  host: 'ep-mute-frog-aqsgvfs4-pooler.c-8.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_i25fLQwoSqeK',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

const supa = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  database: 'postgres',
  user: 'postgres.ridnowaogeguaszgxxxk',
  password: 'F86WUPApGvuaAvBn',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  await neon.connect();
  await supa.connect();

  const tables = ['Schools', 'Users', 'Exams', 'PasswordResetTokens'];

  for (const tbl of tables) {
    console.log(`\n--- Diagnosing ${tbl} ---`);
    
    // Check if table exists in Supabase
    try {
      const existRes = await supa.query(`SELECT COUNT(*) FROM "${tbl}"`);
      console.log(`Supabase ${tbl} exists, current count:`, existRes.rows[0].count);
    } catch (e) {
      console.log(`Supabase ${tbl} check error:`, e.message);
    }

    // Get 1 row from Neon
    const r = await neon.query(`SELECT * FROM "${tbl}" LIMIT 1`);
    if (!r.rows.length) {
      console.log(`Neon ${tbl} has 0 rows`);
      continue;
    }

    // Compare columns
    const neonCols = await neon.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tbl}'`);
    const supaCols = await supa.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tbl}'`);

    const neonColNames = neonCols.rows.map(c => c.column_name);
    const supaColNames = supaCols.rows.map(c => c.column_name);

    const missingInSupa = neonColNames.filter(c => !supaColNames.includes(c));
    console.log(`Columns in Neon: ${neonColNames.length}, Columns in Supabase: ${supaColNames.length}`);
    if (missingInSupa.length > 0) {
      console.log(`⚠️ Missing columns in Supabase ${tbl}:`, missingInSupa);
    }

    // Try inserting row
    const row = r.rows[0];
    const commonCols = neonColNames.filter(c => supaColNames.includes(c));
    const colList = commonCols.map(c => `"${c}"`).join(', ');
    const placeholders = commonCols.map((_, i) => `$${i + 1}`).join(', ');
    const vals = commonCols.map(c => row[c]);

    try {
      await supa.query(`INSERT INTO "${tbl}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
      console.log(`✅ Single row insert test succeeded for ${tbl}!`);
    } catch (e) {
      console.error(`❌ Insert error for ${tbl}:`, e.message);
    }
  }

  await neon.end();
  await supa.end();
}

fix().catch(console.error);
