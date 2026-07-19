/**
 * Production start for Next.js output: 'standalone'.
 * Copies static assets if needed and runs node server.js
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = path.join(root, '.next', 'standalone');
const serverJs = path.join(standalone, 'server.js');

if (!existsSync(serverJs)) {
  console.error('Missing .next/standalone/server.js — run: npm run build');
  process.exit(1);
}

// Ensure static files are available next to standalone server
const staticSrc = path.join(root, '.next', 'static');
const staticDest = path.join(standalone, '.next', 'static');
const publicSrc = path.join(root, 'public');
const publicDest = path.join(standalone, 'public');

if (existsSync(staticSrc)) {
  mkdirSync(path.dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
}
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

const port = process.env.PORT || '3000';
const hostname = process.env.HOSTNAME || '0.0.0.0';

const child = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  env: { ...process.env, PORT: port, HOSTNAME: hostname },
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
