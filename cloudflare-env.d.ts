declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SESSION_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
