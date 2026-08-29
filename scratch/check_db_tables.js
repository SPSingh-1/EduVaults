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

async function checkTables() {
  const client = new Client(pgConfig);
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Existing Tables in PostgreSQL NeonDB:");
  console.table(res.rows.map(r => r.table_name));
  await client.end();
}

checkTables().catch(console.error);
