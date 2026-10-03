import "dotenv/config";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set. Put it in .env (local) or export it before running this script."
    );
    process.exit(1);
  }
  return url;
}

export function sslForUrl(url: string) {
  const isCloud =
    url.includes("supabase.com") ||
    url.includes("neon.tech") ||
    url.includes("sslmode=") ||
    url.includes("pooler.supabase.com");
  return isCloud ? { rejectUnauthorized: false } : undefined;
}
