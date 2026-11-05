/**
 * Di Chùa Online — launcher. Running `node index.js` starts the app on port 14578.
 *
 * Defaults mirror BAT-LIVE.bat: LIVE_MODE=1 (the live stage page never hot-reloads mid-stream)
 * and the dashboard opens automatically after ~8s. Override with env vars if needed:
 *   PORT=14578        port to listen on (server.ts binds 127.0.0.1 only)
 *   LIVE_MODE=0       allow Vite hot reload (for editing, NOT while live)
 *   NO_OPEN=1         don't open the browser
 *
 * Then open:
 *   http://localhost:14578/              dashboard (silent)
 *   http://lvh.me:14578/?view=stage      the page TikTok LIVE Studio / OBS should load
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '14578';
const LIVE_MODE = process.env.LIVE_MODE ?? '1';
const NO_OPEN = process.env.NO_OPEN === '1';

console.log(`Di Chua Online - dang khoi dong o cong ${PORT}...`);
console.log(`  Dashboard:        http://localhost:${PORT}/`);
console.log(`  Link cho LIVE Studio / OBS: http://lvh.me:${PORT}/?view=stage`);

const tsxCli = path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');

if (!fs.existsSync(tsxCli)) {
  console.error('Chua cai thu vien (node_modules/tsx khong ton tai).');
  console.error('Hay chay: npm install --legacy-peer-deps');
  process.exit(1);
}

const child = spawn(process.execPath, [tsxCli, 'server.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT, LIVE_MODE },
});

let childGone = false;
child.on('error', (err) => {
  childGone = true;
  console.error('Khong khoi dong duoc server:', err.message);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  childGone = true;
  if (signal) console.log(`Server dung boi tin hieu ${signal}`);
  process.exit(code ?? 0);
});

// Stop the server cleanly on Ctrl+C / taskkill so the port is released
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (!childGone) child.kill(sig);
  });
}

// Open the dashboard once the server has had time to boot (like BAT-LIVE.bat)
if (!NO_OPEN && process.platform === 'win32') {
  setTimeout(() => {
    if (childGone) return;
    spawn('cmd', ['/c', 'start', '', `http://localhost:${PORT}`], { detached: true, stdio: 'ignore' }).unref();
  }, 8000);
}
