import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createHostingConfigs } from '../../scripts/prepare-hosting.mjs';

const root = process.cwd();
const build = {
  name: 'cuoc-dua-gianh-khach', main: 'index.js', no_bundle: true,
  compatibility_date: '2026-05-15', compatibility_flags: ['nodejs_compat'],
  assets: { directory: '../client' },
  rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  vars: { HANGRONG_ORIGIN_SECRET: 'old-secret-that-must-not-escape' },
};
const settings = {
  PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app',
  CLOUDFLARE_WORKERS_SUBDOMAIN: 'my-account',
  HANGRONG_ORIGIN_SECRET: 'runtime-only-secret-must-not-be-written',
};

describe('operator Cloudflare config preparation', () => {
  it('prepares arcade website and SQLite realtime configs without D1 settings or bindings', () => {
    const { website, realtime } = createHostingConfigs(build, settings, root);
    expect(website.name).toBe('hangrong');
    expect(website.main).toBe(path.resolve(root, 'dist/server/index.js'));
    expect(website.assets.directory).toBe(path.resolve(root, 'dist/client'));
    expect(website.no_bundle).toBe(true);
    expect(website.compatibility_flags).toEqual(expect.arrayContaining(['nodejs_compat', 'global_fetch_strictly_public']));
    expect(website.rules).toEqual([{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }]);
    expect(website.d1_databases ?? []).toEqual([]);
    expect(website.vars).toEqual({ PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app', ARCADE_SERVICE_URL: 'https://hangrong-realtime.my-account.workers.dev' });
    expect(realtime.main).toBe(path.resolve(root, 'realtime/worker.ts'));
    expect(realtime.durable_objects.bindings).toEqual([{ name: 'ARCADE_ROOMS', class_name: 'ArcadeRoom' }]);
    expect(realtime.migrations).toEqual([{ tag: 'v1', new_sqlite_classes: ['ArcadeRoom'] }]);
    expect(realtime.vars).toEqual({ ARCADE_PUBLIC_WS_URL: 'wss://hangrong-realtime.my-account.workers.dev', ARCADE_ALLOWED_ORIGINS: 'https://hangrong.vercel.app' });
    const serialized = JSON.stringify({ website, realtime });
    expect(serialized).not.toContain('old-secret');
    expect(serialized).not.toContain('runtime-only-secret');
    expect(serialized).not.toMatch(/migrations_dir|drizzle|"binding":"DB"/);
  });

  it.each([
    { compatibilityFlags: ['nodejs_compat', 'streams_enable_constructors'] },
    { compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public', 'streams_enable_constructors'] },
  ])('enables public Worker fetch once while preserving existing website flags and realtime flags: %j', ({ compatibilityFlags }) => {
    const originalFlags = [...compatibilityFlags];
    const { website, realtime } = createHostingConfigs({ ...build, compatibility_flags: compatibilityFlags }, settings, root);
    expect(website.compatibility_flags).toEqual(expect.arrayContaining(originalFlags));
    expect(website.compatibility_flags.filter((flag: string) => flag === 'global_fetch_strictly_public')).toHaveLength(1);
    expect(new Set(website.compatibility_flags).size).toBe(website.compatibility_flags.length);
    expect(realtime.compatibility_flags).toEqual(['nodejs_compat']);
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
    { CLOUDFLARE_WORKERS_SUBDOMAIN: 'YOUR_ACCOUNT_SUBDOMAIN' },
    { CLOUDFLARE_WEBSITE_NAME: '../escape' },
    { CLOUDFLARE_REALTIME_NAME: 'hangrong' },
  ])('rejects invalid public settings before writing deployment output: %j', invalid => {
    expect(() => createHostingConfigs(build, { ...settings, ...invalid }, root)).toThrow();
  });

  it('drops inherited D1 bindings so arcade deployment cannot depend on a quiz database', () => {
    const inherited = { ...build, d1_databases: [{ binding: 'DB', database_name: 'stale-quiz', database_id: '00000000-0000-4000-8000-000000000000' }] };
    const { website, realtime } = createHostingConfigs(inherited, settings, root);
    expect(website.d1_databases ?? []).toEqual([]);
    expect(realtime.d1_databases ?? []).toEqual([]);
    expect(JSON.stringify({ website, realtime })).not.toContain('stale-quiz');
  });

  it.each([{ name: 'quyen-luc-so' }, { topLevelName: 'quyen-luc-so' }])('rejects the known legacy quiz build identity even when operator settings could rename it: %j', identity => {
    const legacy = { ...build, ...identity, d1_databases: [{ binding: 'DB', database_name: 'old-quiz', database_id: '00000000-0000-4000-8000-000000000000' }] };
    const formerlyValidSettings = { ...settings, CLOUDFLARE_D1_DATABASE_ID: '12345678-1234-4123-8123-123456789abc', CLOUDFLARE_D1_DATABASE_NAME: 'old-quiz' };
    expect(() => createHostingConfigs(legacy, formerlyValidSettings, root)).toThrow(/quyen-luc-so|quiz|Quyền lực/i);
  });

  it.each([{ main: '' }, { assets: undefined }])('still rejects incomplete Worker build output: %j', missing => {
    expect(() => createHostingConfigs({ ...build, ...missing }, settings, root)).toThrow();
  });
});
