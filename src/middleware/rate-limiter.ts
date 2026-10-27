import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    message?: string;
    keyPrefix?: string;
}

interface ClientRecord {
    count: number;
    resetAt: number;
}

/**
 * High-performance sliding-window in-memory rate limiter for Hono
 */
export function createRateLimiter(
    options: RateLimitOptions,
): MiddlewareHandler {
    const {
        windowMs,
        maxRequests,
        message = "Too many requests, please try again later.",
        keyPrefix = "rl",
    } = options;

    const store = new Map<string, ClientRecord>();

    // Periodically sweep expired entries to prevent memory leaks
    const sweepInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of store.entries()) {
            if (now > record.resetAt) {
                store.delete(key);
            }
        }
    }, Math.max(30000, windowMs));

    // Ensure background timer does not hold event loop open
    if (sweepInterval.unref) {
        sweepInterval.unref();
    }

    return async (c, next) => {
        const forwarded = c.req.header("x-forwarded-for");
        const realIp = c.req.header("x-real-ip");
        const clientIp = (forwarded ? forwarded.split(",")[0].trim() : "") ||
            realIp || "127.0.0.1";

        const key = `${keyPrefix}:${clientIp}`;
        const now = Date.now();
        let record = store.get(key);

        if (!record || now > record.resetAt) {
            record = {
                count: 1,
                resetAt: now + windowMs,
            };
            store.set(key, record);
        } else {
            record.count++;
        }

        const remaining = Math.max(0, maxRequests - record.count);
        const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

        c.header("X-RateLimit-Limit", String(maxRequests));
        c.header("X-RateLimit-Remaining", String(remaining));
        c.header("X-RateLimit-Reset", String(Math.ceil(record.resetAt / 1000)));

        if (record.count > maxRequests) {
            c.header("Retry-After", String(resetSeconds));
            return c.json(
                {
                    success: false,
                    error: message,
                    retryAfterSeconds: resetSeconds,
                },
                429,
            );
        }

        await next();
    };
}

// Global API rate limit: 120 requests per minute per IP
export const globalRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    message:
        "API rate limit exceeded. Please wait before making more requests.",
    keyPrefix: "global",
});

// Stricter rate limit for Geocoding / Nominatim calls: 30 requests per minute per IP
export const geocodeRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Geocoding rate limit exceeded (maximum 30 requests per minute).",
    keyPrefix: "geocode",
});
