/**
 * Shared rate limiting utility for API routes
 * In-memory store - suitable for serverless with sticky sessions or single instance
 * For production multi-instance, replace with Redis/Upstash
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 }
): RateLimitResult {
  const now = Date.now();
  const prefixedKey = `${config.keyPrefix ?? "api"}:${key}`;
  const record = rateLimitMap.get(prefixedKey);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(prefixedKey, { count: 1, resetAt: now + config.windowMs });
    return { 
      allowed: true, 
      remaining: config.maxRequests - 1, 
      resetAt: now + config.windowMs 
    };
  }
  
  if (record.count >= config.maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
      remaining: 0,
      resetAt: record.resetAt 
    };
  }
  
  record.count += 1;
  return { 
    allowed: true, 
    remaining: config.maxRequests - record.count, 
    resetAt: record.resetAt 
  };
}

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.remaining + (result.allowed ? 1 : 0)),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
  };
}

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? 
         request.headers.get("x-real-ip") ?? 
         "unknown";
}
