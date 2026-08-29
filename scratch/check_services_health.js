const http = require('http');

function checkEndpoint(url, name) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`[HEALTH] ${name} (${url}) -> HTTP Status: ${res.statusCode}`);
      resolve(true);
    }).on('error', (err) => {
      console.log(`[HEALTH] ${name} (${url}) -> Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log("Checking services health...");
  await checkEndpoint('http://localhost:5265/api/auth/login', 'C# .NET API');
  await checkEndpoint('http://localhost:5005/api/logs', 'Express Auxiliary');
  await checkEndpoint('http://localhost:5173', 'React Web Frontend');
}

main();
