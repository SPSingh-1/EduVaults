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

async function checkStudentCols() {
  const client = new Client(pgConfig);
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Students' 
    ORDER BY column_name;
  `);
  console.table(res.rows);
  await client.end();
}

checkStudentCols().catch(console.error);
