import { expect, it, vi } from 'vitest';

const router = vi.hoisted(() => vi.fn());
vi.mock('vinext/server/fetch-handler', () => ({ default: { fetch: router } }));

import worker from '../../worker/index';

it('finishes an unread POST upload when the actual Worker entry returns a router 404, preserving the rejection', async () => {
  const request = new Request('https://private.example/this-route-does-not-exist', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'deleted-route-post', name: 'Người học' }),
  });
  router.mockImplementation(async (incoming: Request) => {
    // The framework can reject an unknown route without consuming its upload.
    expect(incoming.bodyUsed).toBe(false);
    return new Response('This route no longer exists.', {
      status: 404, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
    });
  });
  const context = { props: {} } as unknown as Parameters<typeof worker.fetch>[2];
  const response = await worker.fetch(request, {}, context);
  expect(response.status).toBe(404);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.text()).toBe('This route no longer exists.');
  expect(request.bodyUsed, 'An unread error upload can reset the following local workerd request.').toBe(true);
  expect((await request.body!.getReader().read()).done).toBe(true);
});
