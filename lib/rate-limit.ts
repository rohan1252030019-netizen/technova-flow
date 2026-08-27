import { NextRequest, NextResponse } from "next/server";
import { getClientIp, jsonError } from "@/lib/api";

type RateLimitRecord = {
  timestamps: number[];
};

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 300000);
}

export type RateLimitConfig = {
  windowMs?: number; // default: 60,000ms (1 minute)
  maxRequests?: number; // default: 60 requests per window
  prefix?: string; // namespace prefix (e.g., 'auth', 'uploads')
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds?: number;
};

/**
 * Checks and updates rate limit for a given key
 */
export function checkRateLimit(key: string, config: RateLimitConfig = {}): RateLimitResult {
  const windowMs = config.windowMs || 60000;
  const maxRequests = config.maxRequests || 60;
  const namespace = config.prefix || "global";
  const now = Date.now();

  const fullKey = `${namespace}:${key}`;
  let record = store.get(fullKey);

  if (!record) {
    record = { timestamps: [] };
    store.set(fullKey, record);
  }

  // Filter out timestamps older than window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTime = oldestTimestamp + windowMs;
    const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);

    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  record.timestamps.push(now);
  const remaining = maxRequests - record.timestamps.length;
  const resetTime = now + windowMs;

  return {
    allowed: true,
    limit: maxRequests,
    remaining,
    resetTime,
  };
}

/**
 * Rate limit helper for API routes. Returns an error response if limit exceeded, or null if allowed.
 */
export async function enforceRateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): Promise<NextResponse | null> {
  const ip = await getClientIp(req);
  const result = checkRateLimit(ip, config);

  if (!result.allowed) {
    const res = jsonError(
      `Too many requests. Please try again in ${result.retryAfterSeconds} seconds.`,
      429
    );
    res.headers.set("Retry-After", String(result.retryAfterSeconds));
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", "0");
    res.headers.set("X-RateLimit-Reset", String(Math.floor(result.resetTime / 1000)));
    return res;
  }

  return null;
}
