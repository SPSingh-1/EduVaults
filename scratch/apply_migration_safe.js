const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../src/EduVault.Express/node_modules/pg'));

const pgConfig = {
  host: 'ep-mute-frog-aqsgvfs4-pooler.c-8.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_AtsjP8Okzbe4',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

async function applyMigration() {
  const client = new Client(pgConfig);
  await client.connect();
  console.log("Connected to PostgreSQL NeonDB.");

  let sql = fs.readFileSync(path.resolve(__dirname, 'migration_update.sql'), 'utf-8');
  sql = sql.replace(/^\uFEFF/, '').trim();

  // Enhance idempotency:
  sql = sql.replace(/ALTER TABLE\s+([^\s]+)\s+ADD\s+("?[a-zA-Z0-9_]+"?)/gi, 'ALTER TABLE $1 ADD COLUMN IF NOT EXISTS $2');
  sql = sql.replace(/CREATE TABLE\s+("?[a-zA-Z0-9_]+"?)/gi, 'CREATE TABLE IF NOT EXISTS $1');
  sql = sql.replace(/CREATE INDEX\s+("?[a-zA-Z0-9_]+"?)/gi, 'CREATE INDEX IF NOT EXISTS $1');
  sql = sql.replace(/CREATE UNIQUE INDEX\s+("?[a-zA-Z0-9_]+"?)/gi, 'CREATE UNIQUE INDEX IF NOT EXISTS $1');

  try {
    await client.query(sql);
    console.log("Migration script executed successfully!");
  } catch (e) {
    console.error("Migration error:", e.message);
  }

  // Check tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Updated Tables List in NeonDB:");
  console.table(tablesRes.rows.map(r => r.table_name));

  await client.end();
}

applyMigration().catch(console.error);
