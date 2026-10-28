import { describe, expect, it } from 'vitest';
import { prepareGatewayRequest } from '../../worker/gateway';

const secret = 'gateway-only-secret-with-at-least-32-characters';
const env = { PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app', VERCEL_ORIGIN_SECRET: secret };
const gatewayHeaders = { 'x-origin-secret': secret, 'x-real-ip': '2001:db8::7', origin: 'https://hangrong.vercel.app' };

describe('gateway configuration and protocol boundaries', () => {
  it('normalizes the public URL without retaining the private upstream port and keeps request contents', async () => {
    const result = prepareGatewayRequest(new Request('http://127.0.0.1:5205/api/rooms?room=abc&repeat=1&repeat=2', {
      method: 'POST', headers: { ...gatewayHeaders, authorization: 'Bearer player-capability', 'x-forwarded-host': 'evil.example' }, body: 'Nhóm Cà phê',
    }), env);
    expect(result).toBeInstanceOf(Request);
    const forwarded = result as Request;
    expect(forwarded.url).toBe('https://hangrong.vercel.app/api/rooms?room=abc&repeat=1&repeat=2');
    expect(forwarded.method).toBe('POST');
    expect(await forwarded.text()).toBe('Nhóm Cà phê');
    expect(forwarded.headers.get('authorization')).toBe('Bearer player-capability');
    expect(forwarded.headers.get('cf-connecting-ip')).toBe('2001:db8::7');
    expect(forwarded.headers.get('x-origin-secret')).toBeNull();
    expect(forwarded.headers.get('x-forwarded-host')).toBeNull();
  });

  it('rejects a non-ASCII secret of the same character length without throwing a crypto error', async () => {
    const result = prepareGatewayRequest(new Request('https://private.example/api/rooms', {
      headers: { ...gatewayHeaders, 'x-origin-secret': 'é'.repeat(secret.length) },
    }), env) as Response;
    expect(result.status).toBe(403);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(await result.text()).not.toContain(secret);
  });

  it.each([
    { PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app' },
    { VERCEL_ORIGIN_SECRET: secret },
    { ...env, VERCEL_ORIGIN_SECRET: 'short' },
    { ...env, PUBLIC_SITE_ORIGIN: 'http://hangrong.vercel.app' },
    { ...env, PUBLIC_SITE_ORIGIN: 'https://*.vercel.app' },
    { ...env, PUBLIC_SITE_ORIGIN: 'https://hangrong.vercel.app/arcade' },
  ])('fails closed for incomplete or malformed operator settings: %j', settings => {
    const result = prepareGatewayRequest(new Request('https://private.example/api/rooms', { headers: gatewayHeaders }), settings) as Response;
    expect(result.status).toBe(503);
    expect(result.headers.get('cache-control')).toBe('no-store');
  });

  it.each(['', 'not-an-ip', '192.0.2.1, 192.0.2.2', '192.0.2.1:443', 'https://192.0.2.1'])('rejects malformed visitor IP %j rather than disabling or pooling rate limits', ip => {
    const result = prepareGatewayRequest(new Request('https://private.example/api/rooms', { headers: { ...gatewayHeaders, 'x-real-ip': ip } }), env) as Response;
    expect(result.status).toBe(502);
  });
});
