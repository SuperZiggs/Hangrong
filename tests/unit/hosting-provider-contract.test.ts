import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { prepareGatewayRequest } from '../../worker/gateway';

type HeaderTransform = {
  type: string;
  op: string;
  target: { key: string };
  args: string;
  env?: string[];
};
type ProxyRoute = {
  src: string;
  dest: string;
  env?: string[];
  transforms?: HeaderTransform[];
};

const config = JSON.parse(readFileSync(new URL('../../deploy/vercel/vercel.json', import.meta.url), 'utf8')) as { routes: ProxyRoute[] };
const operatorSettings = {
  CLOUDFLARE_ORIGIN: 'https://hangrong.provider-account.workers.dev',
  HANGRONG_ORIGIN_SECRET: 'operator-owned-origin-secret-at-least-32-characters',
};
const publicOrigin = 'https://hangrong.vercel.app';

function references(template: string) {
  return Array.from(template.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g), match => match[1]);
}

function routeFor(pathname: string) {
  const route = config.routes.find(candidate => new RegExp(`^${candidate.src}$`).test(pathname));
  if (!route) throw new Error(`No configured Vercel route matches ${pathname}`);
  return route;
}

/** Expand only env inputs that the route/transform declares to the provider. */
function expand(template: string, declared: string[] = []) {
  return template.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_placeholder, name: string) => {
    if (!declared.includes(name)) throw new Error(`Provider is not configured to supply ${name}`);
    const value = operatorSettings[name as keyof typeof operatorSettings];
    if (value === undefined) throw new Error(`Proxy requires an unprovisionable operator setting: ${name}`);
    return value;
  });
}

/** Evaluate this deployment artifact's HTTP destination and request-header transforms. */
function evaluateProxy(request: Request) {
  const incoming = new URL(request.url);
  const route = routeFor(incoming.pathname);
  const captures = incoming.pathname.match(new RegExp(`^${route.src}$`))!;
  const destination = new URL(expand(route.dest, route.env).replace(/\$(\d+)/g, (_placeholder, index: string) => captures[Number(index)] ?? ''));
  destination.search = incoming.search;
  const proxied = new Request(destination, request);
  for (const transform of route.transforms ?? []) {
    if (transform.type !== 'request.headers' || transform.op !== 'set') throw new Error('Unsupported provider transform in this contract evaluator');
    proxied.headers.set(transform.target.key, expand(transform.args, transform.env));
  }
  return proxied;
}

describe('Vercel operator environment contract', () => {
  it('requires only operator-provisionable env inputs for the active HTTP proxy route', () => {
    const route = routeFor('/api/arcade/rooms');
    const required = new Set([
      ...route.env ?? [], ...references(route.dest),
      ...(route.transforms ?? []).flatMap(transform => [...transform.env ?? [], ...references(transform.args)]),
    ]);
    expect([...required].filter(name => name.startsWith('VERCEL_'))).toEqual([]);
    expect(required).toEqual(new Set(Object.keys(operatorSettings)));
  });

  it('injects the provisioned app secret and the actual Worker accepts that same env contract', async () => {
    const body = JSON.stringify({ requestId: 'provider-contract-request', name: 'Nhóm Cà phê' });
    const request = evaluateProxy(new Request(`${publicOrigin}/api/arcade/rooms?probe=one%20two&repeat=1&repeat=2`, {
      method: 'POST', body,
      headers: {
        origin: publicOrigin, 'content-type': 'application/json', authorization: 'Bearer retained-player-capability',
        'x-origin-secret': 'forged-client-secret', 'x-real-ip': '2001:db8::19',
      },
    }));
    expect(request.url).toBe(`${operatorSettings.CLOUDFLARE_ORIGIN}/api/arcade/rooms?probe=one%20two&repeat=1&repeat=2`);
    expect(request.headers.get('x-origin-secret')).toBe(operatorSettings.HANGRONG_ORIGIN_SECRET);
    const env = { PUBLIC_SITE_ORIGIN: publicOrigin, HANGRONG_ORIGIN_SECRET: operatorSettings.HANGRONG_ORIGIN_SECRET };
    const result = prepareGatewayRequest(request, env);
    expect(result).toBeInstanceOf(Request);
    const accepted = result as Request;
    expect(accepted.url).toBe(`${publicOrigin}/api/arcade/rooms?probe=one%20two&repeat=1&repeat=2`);
    expect(accepted.method).toBe('POST');
    expect(await accepted.text()).toBe(body);
    expect(accepted.headers.get('authorization')).toBe('Bearer retained-player-capability');
    expect(accepted.headers.get('cf-connecting-ip')).toBe('2001:db8::19');
    expect(accepted.headers.get('x-origin-secret')).toBeNull();
  });
});
