declare namespace Cloudflare {
  interface Env {
    ARCADE_SERVICE_URL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
