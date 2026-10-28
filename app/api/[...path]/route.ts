import { discardRejectedBody } from "../../../worker/gateway";

async function notFound(request: Request) {
  // Vinext transfers body ownership to the route's Request during dispatch.
  await discardRejectedBody(request);
  return Response.json({ error: { code: "NOT_FOUND", message: "API không tồn tại." } }, {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

// API misses should not enter the framework's streamed HTML error renderer.
export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH,
  notFound as DELETE, notFound as HEAD, notFound as OPTIONS };
