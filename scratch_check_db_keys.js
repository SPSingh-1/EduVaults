const { Client } = require('pg');
const client = new Client({
  connectionString: "Host=ep-mute-frog-aqsgvfs4-pooler.c-8.us-east-1.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_AtsjP8Okzbe4;SSL Mode=Require;Trust Server Certificate=true;Channel Binding=Require;Timeout=60;Command Timeout=60;"
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT "Id", "Name", "WhatsAppProvider", "MetaPhoneNumberId", "CustomProviderUrl", "RazorpayKeyId", "PaymentProvider" FROM "Schools"');
  console.log("Schools DB Credentials Status:", JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
