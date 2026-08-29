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

async function checkMigrations() {
  const client = new Client(pgConfig);
  await client.connect();
  const res = await client.query('SELECT * FROM "__EFMigrationsHistory" ORDER BY "MigrationId";');
  console.log("Applied Migrations in NeonDB:");
  console.table(res.rows);
  await client.end();
}

checkMigrations().catch(console.error);
