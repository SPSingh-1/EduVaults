const { spawn } = require('child_process');
const path = require('path');

// ANSI Color formatting
const colors = {
  reset: "\x1b[0m",
  api: "\x1b[36m",     // Cyan
  express: "\x1b[33m", // Yellow
  web: "\x1b[35m",     // Magenta
  system: "\x1b[32m"   // Green
};

function log(service, color, data) {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`${color}[${service}]${colors.reset} ${line}`);
    }
  });
}

console.log(`${colors.system}====================================================${colors.reset}`);
console.log(`${colors.system}🚀 Starting EduVault Local Multi-Service Stack...${colors.reset}`);
console.log(`${colors.system}   - C# API (.NET):      http://localhost:5265${colors.reset}`);
console.log(`${colors.system}   - Express Auxiliary:  http://localhost:5005${colors.reset}`);
console.log(`${colors.system}   - React Web Frontend: http://localhost:5173${colors.reset}`);
console.log(`${colors.system}====================================================\n${colors.reset}`);

const rootDir = __dirname;
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const dotnetCmd = 'dotnet';

// 1. Start C# API
const apiProcess = spawn(dotnetCmd, ['run', '--project', 'src/EduVault.Api/EduVault.Api.csproj'], {
  cwd: rootDir,
  shell: isWindows
});

apiProcess.stdout.on('data', data => log('API', colors.api, data));
apiProcess.stderr.on('data', data => log('API', colors.api, data));

// 2. Start Express Auxiliary Service
const expressProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'src/EduVault.Express'),
  shell: isWindows
});

expressProcess.stdout.on('data', data => log('EXPRESS', colors.express, data));
expressProcess.stderr.on('data', data => log('EXPRESS', colors.express, data));

// 3. Start React Web Frontend
const webProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'src/EduVault.Web'),
  shell: isWindows
});

webProcess.stdout.on('data', data => log('WEB', colors.web, data));
webProcess.stderr.on('data', data => log('WEB', colors.web, data));

// Graceful Shutdown
function killAll() {
  console.log(`\n${colors.system}🛑 Shutting down EduVault local services...${colors.reset}`);
  if (isWindows) {
    spawn('taskkill', ['/pid', apiProcess.pid, '/f', '/t']);
    spawn('taskkill', ['/pid', expressProcess.pid, '/f', '/t']);
    spawn('taskkill', ['/pid', webProcess.pid, '/f', '/t']);
  } else {
    apiProcess.kill();
    expressProcess.kill();
    webProcess.kill();
  }
  process.exit();
}

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);
