import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { etag } from "hono/etag";

import { config } from "./config.js";
import { globalRateLimiter } from "./middleware/rate-limiter.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { geocodeRoutes } from "./routes/geocode.routes.js";
import { healthRoutes } from "./routes/health.routes.js";

export const app = new Hono();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const demoHtmlPath = path.resolve(__dirname, "views", "demo.html");
const llmsTxtPath = path.resolve(rootDir, "llms.txt");
const llmsFullTxtPath = path.resolve(rootDir, "llms-full.txt");
const publicDir = fs.existsSync(path.resolve(rootDir, "public"))
    ? path.resolve(rootDir, "public")
    : path.resolve(__dirname, "..", "public");

// Auto-sync reference logo assets if available
try {
    const khmerDatetimeLogoDir = path.resolve(
        rootDir,
        "..",
        "..",
        "labs",
        "libs",
        "kfe",
        "khmer-datetime.pphat.me",
        "public",
        "logo",
    );
    const localLogoDir = path.join(publicDir, "logo");
    if (!fs.existsSync(localLogoDir) && fs.existsSync(khmerDatetimeLogoDir)) {
        fs.mkdirSync(localLogoDir, { recursive: true });
        fs.cpSync(khmerDatetimeLogoDir, localLogoDir, { recursive: true });
    }
} catch {
    // Non-blocking fallback
}

let cachedDemoHtml: string | null = null;
function getDemoHtml(): string {
    if (config.nodeEnv === "production" && cachedDemoHtml) {
        return cachedDemoHtml;
    }
    if (fs.existsSync(demoHtmlPath)) {
        const content = fs.readFileSync(demoHtmlPath, "utf-8");
        if (config.nodeEnv === "production") cachedDemoHtml = content;
        return content;
    }
    return "<!DOCTYPE html><html><body><h1>Demo page not found</h1></body></html>";
}

let cachedLlmsTxt: string | null = null;
function getLlmsTxt(): string {
    if (config.nodeEnv === "production" && cachedLlmsTxt) {
        return cachedLlmsTxt;
    }
    if (fs.existsSync(llmsTxtPath)) {
        const content = fs.readFileSync(llmsTxtPath, "utf-8");
        if (config.nodeEnv === "production") cachedLlmsTxt = content;
        return content;
    }
    return "# OpenGeo Cambodia API\n> Documentation available at /api/info\n";
}

let cachedLlmsFullTxt: string | null = null;
function getLlmsFullTxt(): string {
    if (config.nodeEnv === "production" && cachedLlmsFullTxt) {
        return cachedLlmsFullTxt;
    }
    if (fs.existsSync(llmsFullTxtPath)) {
        const content = fs.readFileSync(llmsFullTxtPath, "utf-8");
        if (config.nodeEnv === "production") cachedLlmsFullTxt = content;
        return content;
    }
    return "# OpenGeo Cambodia API - Full Reference\n> Documentation available at /api/info\n";
}

// 1. Essential HTTP Security Headers (OWASP Recommended)
app.use(
    "*",
    secureHeaders({
        xContentTypeOptions: "nosniff",
        xFrameOptions: "SAMEORIGIN",
        xXssProtection: "0",
        referrerPolicy: "strict-origin-when-cross-origin",
        strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
        contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com",
                "https://unpkg.com",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://unpkg.com",
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'",
                "https://opengeo-cambodia.pphat.me",
                "https://nominatim.openstreetmap.org",
                "https://unpkg.com",
                "https://cdn.tailwindcss.com",
            ],
        },
    }),
);

// 2. Request Logging & JSON Formatting
app.use("*", logger());
app.use("*", prettyJSON());

// 3. Automatic HTTP ETag generation & conditional request handling (304 Not Modified)
app.use("*", etag());

// 4. Hardened CORS Configuration (Supports ETag / If-None-Match)
app.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: ["Content-Type", "Accept", "If-None-Match"],
        exposeHeaders: [
            "ETag",
            "X-Response-Time",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Retry-After",
        ],
        maxAge: 86400,
    }),
);

// 5. Rate Limiting for all API routes (120 req/min/IP)
app.use("/api/*", globalRateLimiter);

// 6. LLM Documentation Endpoints (llmstxt.org Standard)
app.get("/llms.txt", (c) => {
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );
    return c.text(getLlmsTxt());
});

app.get("/llms-full.txt", (c) => {
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );
    return c.text(getLlmsFullTxt());
});

// 7. Static Branding & Logo Endpoints
app.get("/logo.jpg", (c) => {
    const filePath = path.join(publicDir, "logo.jpg");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "image/jpeg");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath));
    }
    return c.notFound();
});

app.get("/logo.jpeg", (c) => {
    return c.redirect("/logo.jpg", 301);
});

app.get("/logo.png", (c) => {
    const filePath = path.join(publicDir, "logo.png");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "image/png");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath));
    }
    const fallbackPath = path.join(
        publicDir,
        "logo",
        "4light",
        "android-chrome-512x512.png",
    );
    if (fs.existsSync(fallbackPath)) {
        c.header("Content-Type", "image/png");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(fallbackPath));
    }
    return c.notFound();
});

app.get("/logo.svg", (c) => {
    const filePath = path.join(publicDir, "logo.svg");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "image/svg+xml");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath, "utf-8"));
    }
    return c.redirect("/logo.jpg", 302);
});

app.get("/logo-icon.svg", (c) => {
    const filePath = path.join(publicDir, "logo-icon.svg");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "image/svg+xml");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath, "utf-8"));
    }
    return c.redirect("/logo.svg", 302);
});

app.get("/site.webmanifest", (c) => {
    const filePath = path.join(publicDir, "site.webmanifest");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "application/manifest+json");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath, "utf-8"));
    }
    return c.notFound();
});

app.get("/favicon.ico", (c) => {
    const darkFavicon = path.join(publicDir, "logo", "4dark", "favicon.ico");
    const lightFavicon = path.join(publicDir, "logo", "4light", "favicon.ico");
    const target = fs.existsSync(darkFavicon)
        ? darkFavicon
        : fs.existsSync(lightFavicon)
        ? lightFavicon
        : null;
    if (target) {
        c.header("Content-Type", "image/x-icon");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(target));
    }
    return c.redirect("/logo.jpg", 302);
});

app.get("/logo/*", (c) => {
    const relativeSubPath = c.req.path.replace(/^\/logo\//, "");
    const safePath = path.normalize(relativeSubPath).replace(
        /^(\.\.[\/\\])+/,
        "",
    );
    const filePath = path.join(publicDir, "logo", safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            ".png": "image/png",
            ".ico": "image/x-icon",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".webp": "image/webp",
            ".json": "application/json",
            ".webmanifest": "application/manifest+json",
        };
        c.header("Content-Type", mimeTypes[ext] || "application/octet-stream");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath));
    }
    return c.notFound();
});

// 8. Interactive Demo UI Endpoint
app.get("/demo", (c) => {
    return c.html(getDemoHtml());
});

// 8. API Root Welcome Endpoint (Auto-detects Browser vs API client)
app.get("/", (c) => {
    const accept = c.req.header("Accept") || "";
    if (accept.includes("text/html") && !c.req.query("json")) {
        return c.html(getDemoHtml());
    }

    c.header(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );
    return c.json({
        name: "OpenGeo Cambodia API",
        description:
            "Sub-1ms cascading lookups across all 25 Provinces, 210 Districts, 1,661 Communes, and 14,576 Villages with smart OpenStreetMap geocoding",
        version: "1.0.0",
        documentation: "/api/info",
        llms: "/llms.txt",
        llmsFull: "/llms-full.txt",
        demo: "/demo",
        health: "/health",
        endpoints: {
            provinces: "/api/admin/provinces",
            search: "/api/admin/search?q=:query",
            reverse: "/api/geocode/reverse?lat=:lat&lon=:lon",
            stats: "/api/admin/stats",
        },
    });
});

// 8. Mount API Routes
app.route("/api/admin", adminRoutes);
app.route("/api/geocode", geocodeRoutes);
app.route("/", healthRoutes);

// 8. 404 Not Found Handler
app.notFound((c) => {
    return c.json(
        {
            success: false,
            error: "Endpoint not found",
            path: c.req.path,
            documentation: "/api/info",
        },
        404,
    );
});

// 9. Global Error Handler with Production Sanitization (CWE-209 Prevention)
app.onError((err, c) => {
    console.error("[Hono Error]", err);
    const isProd = config.nodeEnv === "production";
    const errorMessage = isProd
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    return c.json(
        {
            success: false,
            error: errorMessage,
        },
        500,
    );
});

export default app;
