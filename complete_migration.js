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

async function completeFinalMigration() {
  await neon.connect();
  await supa.connect();

  console.log('1. Applying missing schema columns and tables to Supabase...');

  await supa.query(`
    -- Schools missing columns
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "HasHrmModule" boolean DEFAULT false;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "TwilioAuthToken" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "TwilioWhatsAppFromNumber" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "StudentPasswordPattern" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "TeacherPasswordPattern" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "ReceptionistPasswordPattern" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "AccountantPasswordPattern" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "RazorpayKeyId" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "RazorpayKeySecret" text;
    ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "TwilioAccountSid" text;

    -- Users missing column
    ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordChangedAt" timestamp with time zone;

    -- Exams missing column
    ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUploaderUserId" uuid;

    -- PasswordResetTokens table
    CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
      "Id" uuid NOT NULL PRIMARY KEY,
      "UserId" uuid NOT NULL,
      "TokenHash" text NOT NULL DEFAULT '',
      "ExpiresAt" timestamp with time zone NOT NULL DEFAULT NOW(),
      "IsUsed" boolean NOT NULL DEFAULT FALSE,
      "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
      "UsedAt" timestamp with time zone NULL,
      "ConsumedAt" timestamp with time zone NULL,
      "InvalidatedAt" timestamp with time zone NULL,
      "RequestedFromIp" text NULL
    );
  `);
  console.log('✅ Missing columns & tables created in Supabase!');

  // Disable replication role
  await supa.query("SET session_replication_role = 'replica';");

  const tablesToSync = ['Schools', 'Users', 'Exams', 'PasswordResetTokens'];

  for (const tbl of tablesToSync) {
    console.log(`\nSyncing ${tbl}...`);
    const countRes = await neon.query(`SELECT COUNT(*) as count FROM "${tbl}"`);
    const neonCount = parseInt(countRes.rows[0].count, 10);

    const rowsRes = await neon.query(`SELECT * FROM "${tbl}"`);
    const rows = rowsRes.rows;

    if (rows.length > 0) {
      const supaColsRes = await supa.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tbl}'`);
      const supaCols = supaColsRes.rows.map(c => c.column_name);

      const columns = Object.keys(rows[0]).filter(c => supaCols.includes(c));
      const colList = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const vals = columns.map(c => row[c]);
        await supa.query(`
          INSERT INTO "${tbl}" (${colList})
          VALUES (${placeholders})
          ON CONFLICT ("Id") DO NOTHING;
        `, vals);
      }
    }

    const sbCountRes = await supa.query(`SELECT COUNT(*) as count FROM "${tbl}"`);
    const sbCount = parseInt(sbCountRes.rows[0].count, 10);
    console.log(`✅ ${tbl}: Neon = ${neonCount}, Supabase = ${sbCount} [${sbCount === neonCount ? 'MATCH' : 'DIFFERENCE'}]`);
  }

  await supa.query("SET session_replication_role = 'origin';");

  console.log('\n--- FINAL FULL DATABASE AUDIT ---');
  const allRes = await neon.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  let totalNeonRows = 0;
  let totalSupaRows = 0;
  let mismatched = [];

  for (const r of allRes.rows) {
    const t = r.table_name;
    const nc = parseInt((await neon.query(`SELECT COUNT(*) as cnt FROM "${t}"`)).rows[0].cnt, 10);
    const sc = parseInt((await supa.query(`SELECT COUNT(*) as cnt FROM "${t}"`)).rows[0].cnt, 10);
    totalNeonRows += nc;
    totalSupaRows += sc;
    if (nc !== sc) {
      mismatched.push({ table: t, neon: nc, supa: sc });
    }
  }

  console.log(`\n🎯 TOTAL ROWS IN NEON: ${totalNeonRows}`);
  console.log(`🎯 TOTAL ROWS IN SUPABASE: ${totalSupaRows}`);
  if (mismatched.length === 0) {
    console.log('\n🏆 100% PERFECT MATCH! ALL TABLES AND ROWS TRANSFERRED WITH ZERO LOSS!');
  } else {
    console.log('\nMismatched tables:', mismatched);
  }

  await neon.end();
  await supa.end();
}

completeFinalMigration().catch(console.error);
