import { expect, it } from 'vitest';
import { discardRejectedBody } from '../../worker/gateway';

function request(body: ReadableStream<Uint8Array>) {
  const init: RequestInit & { duplex: 'half' } = { method: 'POST', body, duplex: 'half' };
  return new Request('https://private.example/api/rooms', init);
}

it('finishes a small rejected upload so workerd can deliver the original rejection response', async () => {
  const incoming = request(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"requestId":"no-access"}')); controller.close(); } }));
  await discardRejectedBody(incoming);
  expect(incoming.bodyUsed).toBe(true);
  expect((await incoming.body!.getReader().read()).done).toBe(true);
});

it('cancels a continuous rejected upload within a small byte budget instead of draining it forever', async () => {
  let produced = 0, cancelled = false;
  const incoming = request(new ReadableStream({
    pull(controller) { produced += 4096; controller.enqueue(new Uint8Array(4096)); },
    cancel() { cancelled = true; },
  }));
  await discardRejectedBody(incoming);
  expect(cancelled).toBe(true);
  // One prefetched chunk may exist in addition to the chunks the consumer reads.
  expect(produced).toBeLessThanOrEqual(16384);
});

it('cancels a stalled rejected upload instead of waiting indefinitely for a sender', async () => {
  let cancelled = false;
  const incoming = request(new ReadableStream({ cancel() { cancelled = true; } }));
  await discardRejectedBody(incoming);
  expect(cancelled).toBe(true);
});

it('retains the authorization rejection even if the upload transport has already failed', async () => {
  const incoming = request(new ReadableStream({ start(controller) { controller.error(new Error('Disconnected sender')); } }));
  await expect(discardRejectedBody(incoming)).resolves.toBeUndefined();
});
