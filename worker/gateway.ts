import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export interface GatewayEnv {
  PUBLIC_SITE_ORIGIN?: string;
  VERCEL_ORIGIN_SECRET?: string;
}

export async function discardRejectedBody(request: Request): Promise<void> {
  if (!request.body || request.body.locked) return;
  const reader = request.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  // workerd #7634: unread small uploads can reset an early error response across
  // a service binding. Discard only a bounded prefix, never an unlimited upload.
  const timeout = setTimeout(cancel, 1000);
  try {
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes >= 8192) { cancel(); break; }
    }
  } catch {
    // The sender may have disconnected; preserve the original authorization error.
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, {
    status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

/** Verify the Vercel hop before allowing its origin or visitor IP into the app. */
export function prepareGatewayRequest(request: Request, env: GatewayEnv): Request | Response {
  const { PUBLIC_SITE_ORIGIN: configuredOrigin, VERCEL_ORIGIN_SECRET: secret } = env;
  if (!configuredOrigin && !secret) return request;

  let publicOrigin: URL;
  try {
    publicOrigin = new URL(configuredOrigin ?? '');
    if (publicOrigin.protocol !== 'https:' || publicOrigin.username || publicOrigin.password ||
        publicOrigin.pathname !== '/' || publicOrigin.search || publicOrigin.hash || publicOrigin.hostname.includes('*') ||
        !secret || secret.length < 32) throw new Error('Invalid gateway settings');
  } catch {
    return error('GATEWAY_UNAVAILABLE', 'Cổng truy cập chưa được cấu hình đầy đủ.', 503);
  }

  const supplied = request.headers.get('x-origin-secret');
  const encoder = new TextEncoder();
  const suppliedBytes = encoder.encode(supplied ?? '');
  const expectedBytes = encoder.encode(secret!);
  if (!supplied || suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return error('GATEWAY_FORBIDDEN', 'Cổng truy cập không hợp lệ.', 403);
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== publicOrigin.origin) {
    return error('ORIGIN', 'Nguồn gửi yêu cầu không hợp lệ.', 403);
  }
  const visitorIP = request.headers.get('x-real-ip')?.trim();
  if (!visitorIP || !isIP(visitorIP)) {
    return error('GATEWAY_IP_UNAVAILABLE', 'Cổng truy cập chưa chuyển tiếp đúng địa chỉ người chơi.', 502);
  }

  const logicalURL = new URL(request.url);
  logicalURL.protocol = publicOrigin.protocol;
  logicalURL.host = publicOrigin.host;
  logicalURL.port = publicOrigin.port;
  const forwarded = new Request(logicalURL, request);
  for (const header of ['x-origin-secret', 'x-real-ip', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-vercel-forwarded-for']) {
    forwarded.headers.delete(header);
  }
  forwarded.headers.set('host', publicOrigin.host);
  forwarded.headers.set('cf-connecting-ip', visitorIP);
  return forwarded;
}
