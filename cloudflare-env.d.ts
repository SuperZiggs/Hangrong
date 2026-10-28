declare namespace Cloudflare {
  interface Env {
    PUBLIC_SITE_ORIGIN?: string;
    HANGRONG_ORIGIN_SECRET?: string;
    ARCADE_SERVICE_URL?: string;
    BUCKET?: R2Bucket;
  }
}
