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
 * Supports Cloudflare Workers (cf-connecting-ip), Proxies (x-forwarded-for), and Direct Node.js
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
    let lastSweep = 0;
    const sweepIntervalMs = Math.max(30000, windowMs);

    return async (c, next) => {
        const now = Date.now();

        // Edge/Serverless compatible lazy sweep without global scope timers
        if (now - lastSweep > sweepIntervalMs) {
            lastSweep = now;
            for (const [k, record] of store.entries()) {
                if (now > record.resetAt) {
                    store.delete(k);
                }
            }
        }

        // Safety cap against memory saturation in edge isolates
        // Uses targeted expiration and FIFO eviction (never clears whole store to prevent DoS)
        if (store.size > 10000) {
            for (const [k, record] of store.entries()) {
                if (now > record.resetAt) {
                    store.delete(k);
                }
            }
            if (store.size > 10000) {
                const overflow = store.size - 9000;
                let evicted = 0;
                for (const k of store.keys()) {
                    store.delete(k);
                    evicted++;
                    if (evicted >= overflow) break;
                }
            }
        }

        // Cloudflare Workers sends cf-connecting-ip as the authoritative client IP.
        // Direct client-supplied X-Forwarded-For headers are never trusted if cf-connecting-ip exists.
        const cfIp = c.req.header("cf-connecting-ip");
        let clientIp = cfIp;
        if (!clientIp) {
            // Local dev / Node fallback
            const realIp = c.req.header("x-real-ip");
            const forwarded = c.req.header("x-forwarded-for");
            clientIp = realIp || (forwarded ? forwarded.split(",")[0].trim() : "") || "127.0.0.1";
        }

        const key = `${keyPrefix}:${clientIp}`;
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

// Dedicated High-Throughput Administrative Data Rate Limit (10,000 req/min/IP)
// Since geography data is 100% in-memory and immutable, high burst access is fully supported.
export const adminRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || "10000", 10),
    message: "Administrative API rate limit exceeded. Please try again shortly.",
    keyPrefix: "admin",
});

// Search API rate limit: 120 requests per minute per IP to mitigate ReDoS and CPU exhaustion
export const searchRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || "120", 10),
    message: "Search rate limit exceeded. Maximum 120 searches per minute.",
    keyPrefix: "search",
});

// General API rate limit (5,000 requests per minute per IP)
export const globalRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || "5000", 10),
    message: "API rate limit exceeded. Please wait before making more requests.",
    keyPrefix: "global",
});

// Stricter rate limit for Geocoding / Nominatim calls: 30 requests per minute per IP
// (Respects OpenStreetMap Nominatim 1 req/sec Fair Use Policy)
export const geocodeRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_GEOCODE_MAX || "30", 10),
    message: "Geocoding rate limit exceeded (maximum 30 requests per minute).",
    keyPrefix: "geocode",
});

/**
 * Known malicious automated vulnerability scanners and exploitation tool patterns
 */
const MALICIOUS_BOT_PATTERNS = [
    /sqlmap/i,
    /nikto/i,
    /masscan/i,
    /acunetix/i,
    /dirbuster/i,
    /zgrab/i,
    /nmap/i,
    /wpscan/i,
    /havij/i,
    /gobuster/i,
    /hydra/i,
    /medusa/i,
    /burpcollaborator/i,
    /shodan/i,
    /censys/i,
    /nessus/i,
    /openvas/i,
    /arachni/i,
    /nuclei/i,
    /ffuf/i,
    /projectdiscovery/i,
    /python-requests\/[0-1]\./i,
];

/**
 * Malicious URL probes, path traversals, and common web application exploit patterns
 */
const SUSPICIOUS_PATH_PATTERNS = [
    /\/\.env/i,
    /\/\.git/i,
    /\/\.svn/i,
    /\/\.ds_store/i,
    /\.php$/i,
    /\.asp$/i,
    /\.aspx$/i,
    /\.jsp$/i,
    /wp-admin/i,
    /wp-login/i,
    /xmlrpc/i,
    /phpmyadmin/i,
    /actuator/i,
    /\/\.\./,      // Path traversal: /..
    /%2e%2e/i,     // URL-encoded path traversal: ..
    /\${jndi:/i,   // Log4j / JNDI injection
];

/**
 * Edge Bot Shield Middleware
 * Drops unauthenticated requests with missing User-Agents, malicious scanners, exploit probes,
 * or disallowed HTTP mutation verbs.
 */
export function createBotShield(): MiddlewareHandler {
    return async (c, next) => {
        const path = c.req.path;
        const rawUrl = c.req.url;

        // 1. Block common exploit probes and path traversal scanning
        for (const pattern of SUSPICIOUS_PATH_PATTERNS) {
            if (pattern.test(path) || pattern.test(rawUrl)) {
                return c.json(
                    {
                        success: false,
                        error: "Access Denied: Malicious probe or unauthorized traversal pattern detected.",
                    },
                    400,
                );
            }
        }

        // 2. Reject missing User-Agent on API endpoints
        const userAgent = c.req.header("user-agent") || "";
        if (!userAgent && path.startsWith("/api/")) {
            return c.json(
                {
                    success: false,
                    error: "Access Denied: Missing User-Agent header.",
                },
                403,
            );
        }

        // 3. Reject known automated exploit scanner signatures
        for (const pattern of MALICIOUS_BOT_PATTERNS) {
            if (pattern.test(userAgent)) {
                return c.json(
                    {
                        success: false,
                        error: "Access Denied: Automated probe or scanner signature detected.",
                    },
                    403,
                );
            }
        }

        // 4. Enforce Read-Only API: Reject POST, PUT, DELETE, PATCH mutations on public API
        if (
            path.startsWith("/api/") &&
            c.req.method !== "GET" &&
            c.req.method !== "HEAD" &&
            c.req.method !== "OPTIONS"
        ) {
            return c.json(
                {
                    success: false,
                    error: `Method ${c.req.method} Not Allowed. OpenGeo Cambodia is a read-only public API.`,
                },
                405,
            );
        }

        await next();
    };
}

