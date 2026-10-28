import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(root);
const publicOrigin = 'https://hangrong.vercel.app';
const secret = 'hosting-acceptance-only-shared-secret-2026';
const buildRoot = process.env.HOSTING_BUILD_ROOT ? resolve(process.env.HOSTING_BUILD_ROOT) : root;
const websiteConfig = resolve(buildRoot, 'dist/server/wrangler.json');
const state = resolve('.wrangler/hosting-acceptance', `${Date.now()}-${process.pid}`);
mkdirSync(state, { recursive: true });
const children = [];
let proxy;
let stopping = false;
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: resolve(state, 'wrangler.log') };

function command(args, label) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    let output = '';
    child.stdout.on('data', bytes => { output += bytes; });
    child.stderr.on('data', bytes => { output += bytes; });
    child.once('error', reject);
    child.once('exit', code => {
      writeFileSync(resolve(state, `${label}.log`), output);
      if (code === 0) accept();
      else reject(new Error(`${label} failed (${code}):\n${output.slice(-6000)}`));
    });
  });
}

function server(args, label) {
  const serverEnv = {
    ...env,
    WRANGLER_REGISTRY_PATH: resolve(state, label, 'dev-registry'),
    MINIFLARE_REGISTRY_PATH: resolve(state, label, 'registry'),
  };
  const child = spawn(process.execPath, args, { cwd: root, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  let output = '';
  child.stdout.on('data', bytes => { output += bytes; writeFileSync(resolve(state, `${label}.log`), output); });
  child.stderr.on('data', bytes => { output += bytes; writeFileSync(resolve(state, `${label}.log`), output); });
  return { child, log: () => { writeFileSync(resolve(state, `${label}.log`), output); return output; } };
}

async function ready(url, processInfo, headers) {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (processInfo.child.exitCode !== null) throw new Error(`Server exited: ${processInfo.log()}`);
    try { const reply = await fetch(url, { headers, signal: AbortSignal.timeout(1500) }); await reply.arrayBuffer(); if (reply.ok) return; } catch {}
    await new Promise(accept => setTimeout(accept, 500));
  }
  throw new Error(`Server failed readiness at ${url}: ${processInfo.log()}`);
}

function stop() {
  if (stopping) return;
  stopping = true;
  proxy?.closeAllConnections();
  proxy?.close();
  for (const child of children.reverse()) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
}
process.once('SIGINT', () => { stop(); process.exit(130); });
process.once('SIGTERM', () => { stop(); process.exit(143); });

const started = [];
try {
  for (const port of [5205, 5206, 5207, 5208]) await new Promise((accept, reject) => {
    const probe = http.createServer(); probe.once('error', reject); probe.listen(port, '127.0.0.1', () => probe.close(accept));
  });
  if (!process.argv.includes('--skip-build') && buildRoot === root) await command(['scripts/run-framework.mjs', 'build'], 'build');
  await command(['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', websiteConfig, '--persist-to', state, '--file', 'drizzle/0000_redundant_gunslinger.sql'], 'migration');
  const common = ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--inspector-port', '0'];
  const realtime = server([...common, '--config', 'realtime/wrangler.jsonc', '--persist-to', resolve(state, 'realtime'), '--port', '5207', '--var', `ARCADE_ALLOWED_ORIGINS:${publicOrigin},http://127.0.0.1:5208`, '--var', 'ARCADE_PUBLIC_WS_URL:ws://127.0.0.1:5207'], 'realtime');
  started.push(realtime);
  await ready('http://127.0.0.1:5207/health', realtime);
  const website = server([...common, '--config', websiteConfig, '--persist-to', state, '--port', '5205', '--var', `PUBLIC_SITE_ORIGIN:${publicOrigin}`, '--var', `VERCEL_ORIGIN_SECRET:${secret}`, '--var', 'ARCADE_SERVICE_URL:http://127.0.0.1:5207'], 'website');
  started.push(website);
  await ready('http://127.0.0.1:5205/', website, { 'x-origin-secret': secret, 'x-real-ip': '192.0.2.253' });
  const local = server([...common, '--config', websiteConfig, '--persist-to', state, '--port', '5208', '--var', 'PUBLIC_SITE_ORIGIN:', '--var', 'VERCEL_ORIGIN_SECRET:', '--var', 'ARCADE_SERVICE_URL:http://127.0.0.1:5207'], 'direct-mode');
  started.push(local);
  await ready('http://127.0.0.1:5208/', local);
  proxy = http.createServer((incoming, outgoing) => {
    appendFileSync(resolve(state, 'proxy.log'), `${incoming.method} ${incoming.url}\n`);
    // Vercel supplies x-real-ip; Cloudflare sees the same Vercel peer for all visitors.
    // x-test-visitor-ip exists only at this test proxy boundary, never in the application.
    const visitor = incoming.headers['x-test-visitor-ip'] ?? '192.0.2.200';
    const peer = incoming.headers['x-test-peer-ip'] ?? '203.0.113.250';
    const headers = { ...incoming.headers, host: '127.0.0.1:5205', 'x-origin-secret': secret, 'x-real-ip': visitor, 'cf-connecting-ip': peer };
    delete headers['x-test-visitor-ip'];
    delete headers['x-test-peer-ip'];
    delete headers.connection;
    headers['x-forwarded-host'] ??= new URL(publicOrigin).host;
    headers['x-forwarded-proto'] ??= 'https';
    headers['x-forwarded-for'] ??= visitor;
    const upstream = http.request(`http://127.0.0.1:5205${incoming.url}`, { method: incoming.method, headers, agent: false }, response => {
      appendFileSync(resolve(state, 'proxy.log'), `→ ${response.statusCode} ${incoming.method} ${incoming.url}\n`);
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    upstream.on('error', error => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(error.message); });
    outgoing.once('close', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  await new Promise(accept => proxy.listen(5206, '127.0.0.1', accept));
  console.log(`Hosting acceptance: gateway :5206 → website :5205 → realtime :5207; direct :5208; state ${state}`);
  await command(['./node_modules/@playwright/test/cli.js', 'test', '--config', 'tests/hosting/playwright.config.ts', ...process.argv.slice(2).filter(arg => arg !== '--skip-build')], 'playwright');
  console.log(`Hosting acceptance passed. Logs: ${state}`);
} catch (error) {
  console.error(error.message);
  console.error(`Logs and isolated state: ${state}`);
  process.exitCode = 1;
} finally {
  for (const processInfo of started) processInfo.log();
  stop();
}
