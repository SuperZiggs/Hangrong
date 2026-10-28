import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function label(value, key) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value ?? '')) {
    throw new Error(`${key} must be a lowercase DNS label (1-63 characters).`);
  }
  return value;
}

export function createHostingConfigs(buildConfig, env, root) {
  const publicURL = new URL(env.PUBLIC_SITE_ORIGIN);
  if (publicURL.protocol !== 'https:' || publicURL.username || publicURL.password ||
      publicURL.pathname !== '/' || publicURL.search || publicURL.hash || publicURL.hostname.includes('*')) {
    throw new Error('PUBLIC_SITE_ORIGIN must be one exact HTTPS origin.');
  }
  const subdomain = label(env.CLOUDFLARE_WORKERS_SUBDOMAIN, 'CLOUDFLARE_WORKERS_SUBDOMAIN');
  const websiteName = label(env.CLOUDFLARE_WEBSITE_NAME || 'hangrong', 'CLOUDFLARE_WEBSITE_NAME');
  const realtimeName = label(env.CLOUDFLARE_REALTIME_NAME || 'hangrong-realtime', 'CLOUDFLARE_REALTIME_NAME');
  if (websiteName === realtimeName) throw new Error('Website and realtime Worker names must differ.');
  const databaseId = env.CLOUDFLARE_D1_DATABASE_ID;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId ?? '') ||
      databaseId === '00000000-0000-4000-8000-000000000000' || /^0+-0+-0+-0+-0+$/.test(databaseId)) {
    throw new Error('CLOUDFLARE_D1_DATABASE_ID must be the real database UUID from Cloudflare.');
  }
  const databaseName = env.CLOUDFLARE_D1_DATABASE_NAME || 'hangrong';
  if (!/^[\w-]{1,64}$/.test(databaseName)) throw new Error('Invalid CLOUDFLARE_D1_DATABASE_NAME.');
  if (!buildConfig.main || !buildConfig.assets?.directory || !buildConfig.d1_databases?.some(db => db.binding === 'DB')) {
    throw new Error('Run npm run build first; the build must include a DB binding and client assets.');
  }
  const website = {
    ...buildConfig,
    name: websiteName,
    topLevelName: websiteName,
    main: path.resolve(root, 'dist/server', buildConfig.main),
    assets: { ...buildConfig.assets, directory: path.resolve(root, 'dist/server', buildConfig.assets.directory) },
    d1_databases: buildConfig.d1_databases.map(db => db.binding !== 'DB' ? db : {
      ...db, database_name: databaseName, database_id: databaseId, migrations_dir: path.resolve(root, 'drizzle'),
    }),
    vars: { PUBLIC_SITE_ORIGIN: publicURL.origin, ARCADE_SERVICE_URL: `https://${realtimeName}.${subdomain}.workers.dev` },
  };
  // The build watcher is local-only; the entry/assets paths above are absolute.
  delete website.build;
  const template = JSON.parse(readFileSync(path.join(root, 'realtime/wrangler.jsonc'), 'utf8'));
  const realtime = {
    ...template, name: realtimeName, main: path.resolve(root, 'realtime', template.main),
    vars: { ARCADE_PUBLIC_WS_URL: `wss://${realtimeName}.${subdomain}.workers.dev`, ARCADE_ALLOWED_ORIGINS: publicURL.origin },
  };
  // Rebase the template's editor schema along with its Worker entrypoint.
  if (realtime.$schema) realtime.$schema = path.resolve(root, 'realtime', realtime.$schema);
  return { website, realtime };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const built = JSON.parse(readFileSync(path.join(root, 'dist/server/wrangler.json'), 'utf8'));
    const configs = createHostingConfigs(built, process.env, root);
    const output = path.join(root, '.hosting');
    mkdirSync(output, { recursive: true });
    for (const [name, config] of Object.entries(configs)) {
      writeFileSync(path.join(output, `${name}.wrangler.json`), `${JSON.stringify(config, null, 2)}\n`);
    }
    console.log('Prepared .hosting/website.wrangler.json and .hosting/realtime.wrangler.json (no remote changes).');
    console.log('Set the same HANGRONG_ORIGIN_SECRET in the website Worker and Vercel before sharing the game.');
  } catch (error) {
    console.error(`Hosting preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
