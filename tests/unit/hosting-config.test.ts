import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createHostingConfigs } from '../../scripts/prepare-hosting.mjs';

const root = process.cwd();
const build = {
  name: 'quyen-luc-so', main: 'index.js', no_bundle: true,
  compatibility_date: '2026-05-15', compatibility_flags: ['nodejs_compat'],
  assets: { directory: '../client' },
  rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  d1_databases: [{ binding: 'DB', database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000' }],
  vars: { HANGRONG_ORIGIN_SECRET: 'old-secret-that-must-not-escape' },
};
const settings = {
  PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app',
  CLOUDFLARE_WORKERS_SUBDOMAIN: 'my-account',
  CLOUDFLARE_D1_DATABASE_ID: '12345678-1234-4123-8123-123456789abc',
  CLOUDFLARE_D1_DATABASE_NAME: 'hangrong',
  HANGRONG_ORIGIN_SECRET: 'runtime-only-secret-must-not-be-written',
};

describe('operator Cloudflare config preparation', () => {
  it('replaces the placeholder D1 and resolves build files from the config location', () => {
    const { website, realtime } = createHostingConfigs(build, settings, root);
    expect(website.name).toBe('hangrong');
    expect(website.main).toBe(path.resolve(root, 'dist/server/index.js'));
    expect(website.assets.directory).toBe(path.resolve(root, 'dist/client'));
    expect(website.no_bundle).toBe(true);
    expect(website.compatibility_flags).toEqual(['nodejs_compat']);
    expect(website.rules).toEqual([{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }]);
    expect(website.d1_databases).toEqual([{
      binding: 'DB', database_name: 'hangrong',
      database_id: '12345678-1234-4123-8123-123456789abc', migrations_dir: path.resolve(root, 'drizzle'),
    }]);
    expect(website.vars).toEqual({ PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app', ARCADE_SERVICE_URL: 'https://hangrong-realtime.my-account.workers.dev' });
    expect(realtime.main).toBe(path.resolve(root, 'realtime/worker.ts'));
    expect(realtime.durable_objects.bindings).toEqual([{ name: 'ARCADE_ROOMS', class_name: 'ArcadeRoom' }]);
    expect(realtime.migrations).toEqual([{ tag: 'v1', new_sqlite_classes: ['ArcadeRoom'] }]);
    expect(realtime.vars).toEqual({ ARCADE_PUBLIC_WS_URL: 'wss://hangrong-realtime.my-account.workers.dev', ARCADE_ALLOWED_ORIGINS: 'https://hangrong.vercel.app' });
    const serialized = JSON.stringify({ website, realtime });
    expect(serialized).not.toContain('old-secret');
    expect(serialized).not.toContain('runtime-only-secret');
  });

  it('supports operator-selected worker names and origins without changing the durable object migration', () => {
    const { website, realtime } = createHostingConfigs(build, { ...settings, CLOUDFLARE_WEBSITE_NAME: 'school-game', CLOUDFLARE_REALTIME_NAME: 'school-rooms', PUBLIC_SITE_ORIGIN: 'https://game.example.com' }, root);
    expect(website.name).toBe('school-game');
    expect(website.vars.ARCADE_SERVICE_URL).toBe('https://school-rooms.my-account.workers.dev');
    expect(realtime.name).toBe('school-rooms');
    expect(realtime.vars.ARCADE_PUBLIC_WS_URL).toBe('wss://school-rooms.my-account.workers.dev');
    expect(realtime.vars.ARCADE_ALLOWED_ORIGINS).toBe('https://game.example.com');
    expect(realtime.migrations).toEqual([{ tag: 'v1', new_sqlite_classes: ['ArcadeRoom'] }]);
  });

  it.each([
    { PUBLIC_SITE_ORIGIN: 'http://hangrong.vercel.app' },
    { PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app/arcade' },
    { PUBLIC_SITE_ORIGIN: 'https://user:password@hangrong.vercel.app' },
    { PUBLIC_SITE_ORIGIN: 'https://*.vercel.app' },
    { PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app?token=sensitive' },
    { CLOUDFLARE_D1_DATABASE_ID: '00000000-0000-4000-8000-000000000000' },
    { CLOUDFLARE_D1_DATABASE_ID: 'YOUR_DATABASE_UUID' },
    { CLOUDFLARE_WORKERS_SUBDOMAIN: 'YOUR_ACCOUNT_SUBDOMAIN' },
    { CLOUDFLARE_WEBSITE_NAME: '../escape' },
    { CLOUDFLARE_REALTIME_NAME: 'hangrong' },
  ])('rejects invalid public settings before writing deployment output: %j', invalid => {
    expect(() => createHostingConfigs(build, { ...settings, ...invalid }, root)).toThrow();
  });

  it('rejects build output without the game database instead of deploying an unusable website', () => {
    expect(() => createHostingConfigs({ ...build, d1_databases: [] }, settings, root)).toThrow();
  });
});
