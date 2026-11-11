import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { etag } from "hono/etag";

import { config } from "./config.js";
import {
    adminRateLimiter,
    chatRateLimiter,
    createBotShield,
    globalRateLimiter,
} from "./middleware/rate-limiter.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { boundariesRoutes } from "./routes/boundaries.routes.js";
import { chatRoutes } from "./routes/chat.routes.js";
import { geocodeRoutes } from "./routes/geocode.routes.js";
import { healthRoutes } from "./routes/health.routes.js";

export const app = new Hono();

function resolveAppDir(): string {
    try {
        if (typeof import.meta !== "undefined" && import.meta && import.meta.url) {
            return path.dirname(fileURLToPath(import.meta.url));
        }
    } catch {
        // Edge / Cloudflare Workers runtime
    }
    return "";
}

const currentDir = resolveAppDir();
const rootDir = currentDir ? path.resolve(currentDir, "..") : "";
// React web app build output (`pnpm build:web` → dist/client). Served by Cloudflare Workers Assets in production.
const clientDir = rootDir ? path.resolve(rootDir, "dist", "client") : "";
const spaHtmlPath = clientDir ? path.join(clientDir, "index.html") : "";
const llmsTxtPath = rootDir ? path.resolve(rootDir, "llms.txt") : "";
const llmsFullTxtPath = rootDir ? path.resolve(rootDir, "llms-full.txt") : "";
const publicDir = (rootDir && typeof fs?.existsSync === "function" && fs.existsSync(path.resolve(rootDir, "public")))
    ? path.resolve(rootDir, "public")
    : (currentDir ? path.resolve(currentDir, "..", "public") : "");

// Auto-sync reference logo assets if available
if (rootDir && typeof fs?.existsSync === "function") {
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
}

let cachedSpaHtml: string | null = null;
function getSpaHtml(): string {
    if (config.nodeEnv === "production" && cachedSpaHtml) {
        return cachedSpaHtml;
    }
    if (spaHtmlPath && typeof fs?.existsSync === "function" && fs.existsSync(spaHtmlPath)) {
        const content = fs.readFileSync(spaHtmlPath, "utf-8");
        if (config.nodeEnv === "production") cachedSpaHtml = content;
        return content;
    }
    return "<!DOCTYPE html><html><body style=\"font-family:system-ui;padding:24px\"><h1>OpenGeo Cambodia</h1>"
        + "<p>The web app hasn't been built. Run <code>pnpm build:web</code>, or <code>pnpm dev:web</code> for live development.</p>"
        + "<p>The API is available at <a href=\"/api/info\">/api/info</a>.</p></body></html>";
}

/**
 * Social share covers (og:image / twitter:image) per page, in public/cover/.
 * Link-preview crawlers don't run JS, so these must be in the server-rendered HTML.
 * Keep in sync with web/src/lib/covers.ts.
 */
const SEO_COVERS = {
    home: { path: "/cover/home.webp", width: 1900, height: 1079, alt: "OpenGeo Cambodia — free open API for Cambodia's administrative geography" },
    docs: { path: "/cover/doc.webp", width: 1901, height: 1078, alt: "OpenGeo Cambodia API documentation" },
    playground: { path: "/cover/playground.webp", width: 1919, height: 1079, alt: "OpenGeo Cambodia interactive API playground" },
    map: { path: "/cover/map.webp", width: 1906, height: 1079, alt: "Interactive map of Cambodia province, district and commune boundaries" },
} as const;

function coverFor(reqPath: string): (typeof SEO_COVERS)[keyof typeof SEO_COVERS] {
    if (reqPath.startsWith("/docs")) return SEO_COVERS.docs;
    if (reqPath.startsWith("/playground")) return SEO_COVERS.playground;
    if (reqPath === "/map" || reqPath.startsWith("/map/")) return SEO_COVERS.map;
    return SEO_COVERS.home;
}

function escAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderSeoHtml(rawHtml: string, reqPath: string, lang = "en"): string {
    const isKm = lang === "km";

    // 1. Set <html> language attribute
    let out = rawHtml.replace(/<html(?:\s+lang="[^"]*")?([^>]*)>/, `<html lang="${isKm ? "km" : "en"}"$1>`);

    // 2. Set OpenGraph locale
    if (isKm) {
        out = out
            .replace(/<meta property="og:locale" content="[^"]*">/, '<meta property="og:locale" content="km_KH">')
            .replace(/<meta property="og:locale:alternate" content="[^"]*">/, '<meta property="og:locale:alternate" content="en_US">');
    } else {
        out = out
            .replace(/<meta property="og:locale" content="[^"]*">/, '<meta property="og:locale" content="en_US">')
            .replace(/<meta property="og:locale:alternate" content="[^"]*">/, '<meta property="og:locale:alternate" content="km_KH">');
    }

    let title = isKm
        ? "OpenGeo Cambodia — API បើកចំហសម្រាប់ភូមិសាស្ត្ររដ្ឋបាលកម្ពុជា"
        : "OpenGeo Cambodia — Open API for Cambodia's Administrative Geography";
    let desc = isKm
        ? "API ឥតគិតថ្លៃ និងមិនត្រូវការ API key សម្រាប់ភូមិសាស្ត្ររដ្ឋបាលកម្ពុជា៖ ២៥ រាជធានី-ខេត្ត, ២១០ ក្រុង-ស្រុក-ខណ្ឌ, ១,៦៦១ ឃុំ-សង្កាត់ និង ១៤,៥៧៦ ភូមិ ជាមួយលេខកូដផ្លូវការ ឈ្មោះខ្មែរ-អង់គ្លេស និងព្រំប្រទល់ GeoJSON។"
        : "Free, keyless REST API for Cambodia's administrative geography: 25 provinces, 210 districts, 1,661 communes and 14,576 villages with official NCDD codes, Khmer & English names, GeoJSON boundaries and geocoding.";
    let canonical = isKm
        ? "https://opengeo-cambodia.pphat.me/?lang=km"
        : "https://opengeo-cambodia.pphat.me/";

    if (reqPath.startsWith("/docs")) {
        title = isKm
            ? "ឯកសារ API — OpenGeo Cambodia"
            : "API Documentation — OpenGeo Cambodia";
        desc = isKm
            ? "ឯកសារបច្ចេកទេសសម្រាប់អ្នកអភិវឌ្ឍន៍ ផ្ទាំងសាកល្បង API គំរូទិន្នន័យ JSON កម្រិតកំណត់សំណើ និងកូអរដោនេព្រំប្រទល់ GeoJSON នៃឋានានុក្រមរដ្ឋបាល ៤ កម្រិតនៅកម្ពុជា។"
            : "Developer documentation, interactive API playground, JSON schemas, rate limits, and GeoJSON boundary specifications for Cambodia's 4-tier administrative hierarchy.";
        canonical = isKm
            ? "https://opengeo-cambodia.pphat.me/docs?lang=km"
            : "https://opengeo-cambodia.pphat.me/docs";
    } else if (reqPath.startsWith("/playground")) {
        title = isKm
            ? "ផ្ទាំងសាកល្បង API — OpenGeo Cambodia"
            : "API Playground — OpenGeo Cambodia";
        desc = isKm
            ? "ផ្ទាំងសាកល្បង API អន្តរកម្មសម្រាប់ធ្វើតេស្ត endpoint នៃ OpenGeo Cambodia ជាមួយនឹងការបង្ហាញលទ្ធផលជាទម្រង់ UI និង Raw JSON។"
            : "Interactive API playground for testing OpenGeo Cambodia endpoints with live UI visualization and raw JSON inspection.";
        canonical = isKm
            ? "https://opengeo-cambodia.pphat.me/playground?lang=km"
            : "https://opengeo-cambodia.pphat.me/playground";
    } else if (reqPath === "/map" || reqPath.startsWith("/map/")) {
        title = isKm
            ? "ផែនទីព្រំប្រទល់កម្ពុជា — OpenGeo Cambodia"
            : "Cambodia Boundaries Map — OpenGeo Cambodia";
        desc = isKm
            ? "ផែនទីអន្តរកម្មនៃព្រំប្រទល់ខេត្ត ស្រុក និងឃុំនៅកម្ពុជា លើផែនទី OpenStreetMap ផ្កាយរណប ឬសណ្ឋានដី ជាមួយការស្វែងរកតំបន់តាមការចុច GPS ឬកូអរដោនេ។"
            : "Interactive map of Cambodia province, district and commune boundaries over OpenStreetMap, satellite or terrain basemaps, with point-in-polygon lookup by click, GPS or coordinates.";
        canonical = isKm
            ? "https://opengeo-cambodia.pphat.me/map?lang=km"
            : "https://opengeo-cambodia.pphat.me/map";
    } else if (reqPath.startsWith("/demo")) {
        title = isKm
            ? "ផ្ទាំងបង្ហាញគំរូ — OpenGeo Cambodia"
            : "Live Demo — OpenGeo Cambodia";
        desc = isKm
            ? "ផ្ទាំងបង្ហាញគំរូនូវសមត្ថភាពនៃ API ភូមិសាស្ត្ររដ្ឋបាលកម្ពុជា ជាមួយផែនទីអន្តរកម្ម។"
            : "Live interactive map demonstration of Cambodia's administrative geography API.";
        canonical = isKm
            ? "https://opengeo-cambodia.pphat.me/demo?lang=km"
            : "https://opengeo-cambodia.pphat.me/demo";
    }

    const cover = coverFor(reqPath);
    const coverUrl = `https://opengeo-cambodia.pphat.me${cover.path}`;
    const coverAlt = escAttr(cover.alt);

    return out
        .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${coverUrl}">`)
        .replace(/<meta property="og:image:width" content="[^"]*">/, `<meta property="og:image:width" content="${cover.width}">`)
        .replace(/<meta property="og:image:height" content="[^"]*">/, `<meta property="og:image:height" content="${cover.height}">`)
        .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${coverAlt}">`)
        .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${coverUrl}">`)
        .replace(/<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${coverAlt}">`)
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`)
        .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`)
        .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`)
        .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`)
        .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${desc}">`);
}

/** Serve the React app shell from Workers Assets when deployed, or from dist/client in Node. */
async function serveSpa(c: Context): Promise<Response> {
    const lang = c.req.query("lang") || "en";
    const assets = (c.env as { ASSETS?: { fetch: (req: Request) => Promise<Response> } } | undefined)?.ASSETS;
    if (assets) {
        const res = await assets.fetch(new Request(new URL("/index.html", c.req.url)));
        if (res.ok) {
            const html = await res.text();
            return c.html(renderSeoHtml(html, c.req.path, lang));
        }
    }
    return c.html(renderSeoHtml(getSpaHtml(), c.req.path, lang));
}

let cachedLlmsTxt: string | null = null;
function getLlmsTxt(): string {
    if (config.nodeEnv === "production" && cachedLlmsTxt) {
        return cachedLlmsTxt;
    }
    if (llmsTxtPath && typeof fs?.existsSync === "function" && fs.existsSync(llmsTxtPath)) {
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
    if (llmsFullTxtPath && typeof fs?.existsSync === "function" && fs.existsSync(llmsFullTxtPath)) {
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
                "https://static.cloudflareinsights.com",
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
                "https://cloudflareinsights.com",
            ],
        },
    }),
);

// 2. High-Performance Logging (Enabled in dev/debug, lightweight in production)
if (config.nodeEnv !== "production") {
    app.use("*", logger());
}

// 3. Automatic HTTP ETag generation & conditional request handling (304 Not Modified)
app.use("*", etag());

// 4. Hardened CORS Configuration (Supports ETag / If-None-Match / Mistral AI API key headers)
app.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: [
            "Content-Type",
            "Accept",
            "If-None-Match",
            "User-Agent",
            "x-mistral-api-key",
            "Authorization",
        ],
        exposeHeaders: [
            "ETag",
            "X-Response-Time",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Retry-After",
            "CF-Cache-Status",
            "X-Cache",
        ],
        maxAge: 86400,
    }),
);

// 5. Bot Shield, Malicious Scanner Blocker & Exploit Trap
app.use("*", createBotShield());

// 5b. Search Engine Optimization: Exclude non-HTML APIs, health checks, machine specs, and data files from search indexing
app.use("*", async (c, next) => {
    await next();
    const p = c.req.path;
    if (
        p.startsWith("/api/") ||
        p === "/health" ||
        p === "/robots.txt" ||
        p === "/llms.txt" ||
        p === "/llms-full.txt" ||
        p === "/opengeo-cambodia.postman_collection.json" ||
        p === "/postman" ||
        p.startsWith("/data/") ||
        p.startsWith("/boundaries/")
    ) {
        c.header("X-Robots-Tag", "noindex, nofollow");
    }
});

// 6. Tiered Rate Limiting & Edge Caching
// Administrative and boundary routes: Dedicated 10,000 req/min/IP for immutable geographic datasets
app.use("/api/admin/*", adminRateLimiter);
app.use("/api/boundaries/*", adminRateLimiter);

// Rate limiting: AI Chat endpoint (60 req/min/IP)
app.use("/api/chat/*", chatRateLimiter);
app.use("/api/chat", chatRateLimiter);

// General rate limiter for non-admin API endpoints (e.g. /api/info, 5,000 req/min/IP)
app.use("/api/*", async (c, next) => {
    if (
        c.req.path.startsWith("/api/admin/") ||
        c.req.path.startsWith("/api/geocode/") ||
        c.req.path.startsWith("/api/boundaries") ||
        c.req.path.startsWith("/api/chat")
    ) {
        return next();
    }
    return globalRateLimiter(c, next);
});

// 6. LLM Documentation Endpoints (llmstxt.org Standard)
app.get("/llms.txt", async (c) => {
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL("/llms.txt", c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );
    return c.text(getLlmsTxt());
});

app.get("/llms-full.txt", async (c) => {
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL("/llms-full.txt", c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );
    return c.text(getLlmsFullTxt());
});

// 6b. Postman Collection Endpoints (Auto-discoverable / Direct Download)
app.get("/opengeo-cambodia.postman_collection.json", async (c) => {
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL("/opengeo-cambodia.postman_collection.json", c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    const publicPath = path.join(publicDir, "opengeo-cambodia.postman_collection.json");
    if (fs.existsSync(publicPath)) {
        c.header("Content-Type", "application/json; charset=utf-8");
        c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
        return c.body(fs.readFileSync(publicPath, "utf-8"));
    }
    return c.notFound();
});

app.get("/postman", (c) => {
    return c.redirect("/opengeo-cambodia.postman_collection.json", 302);
});

// 7. Static Branding & Logo Endpoints
app.get("/cover.webp", async (c) => {
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL("/cover.webp", c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    const filePath = path.join(publicDir, "cover.webp");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "image/webp");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath));
    }
    return c.notFound();
});

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

app.get("/robots.txt", async (c) => {
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL("/robots.txt", c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    const filePath = path.join(publicDir, "robots.txt");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "text/plain; charset=utf-8");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath, "utf-8"));
    }
    return c.text(
        "User-agent: *\nAllow: /\nAllow: /api/geocode/reverse?lat=11.5564&lon=104.9282\nAllow: /api/geocode/reverse?lon=104.9282&lat=11.5564\nDisallow: /api/geocode/reverse?*\n\nUser-agent: Googlebot\nAllow: /\nAllow: /api/geocode/reverse?lat=11.5564&lon=104.9282\nAllow: /api/geocode/reverse?lon=104.9282&lat=11.5564\nDisallow: /api/geocode/reverse?*\n\nSitemap: https://opengeo-cambodia.pphat.me/sitemap.xml\n",
    );
});

app.get("/sitemap.xml", async (c) => {
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL("/sitemap.xml", c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    const filePath = path.join(publicDir, "sitemap.xml");
    if (fs.existsSync(filePath)) {
        c.header("Content-Type", "application/xml; charset=utf-8");
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

// Per-page social share covers (public/cover/*.webp). On Cloudflare these are served as static assets;
// this route serves them from disk in Node. Only plain `name.webp` files are allowed (no traversal).
app.get("/cover/:file", async (c) => {
    const file = c.req.param("file");
    if (!/^[a-z0-9-]+\.webp$/i.test(file)) return c.notFound();
    if (c.env && (c.env as any).ASSETS) {
        const assetRes = await (c.env as any).ASSETS.fetch(new Request(new URL(`/cover/${file}`, c.req.url)));
        if (assetRes.ok) return assetRes;
    }
    const filePath = path.join(publicDir, "cover", file);
    if (typeof fs?.existsSync === "function" && fs.existsSync(filePath)) {
        c.header("Content-Type", "image/webp");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath));
    }
    return c.notFound();
});

// Bulk data downloads (public/data). On Cloudflare these are served directly as static assets.
app.get("/data/*", (c) => {
    const relativeSubPath = c.req.path.replace(/^\/data\//, "");
    const safePath = path.normalize(relativeSubPath).replace(/^(\.\.[\/\\])+/, "");
    const dataDir = path.join(publicDir, "data");
    const filePath = path.join(dataDir, safePath);
    if (!filePath.startsWith(dataDir + path.sep)) return c.notFound();

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            ".csv": "text/csv; charset=utf-8",
            ".json": "application/json; charset=utf-8",
        };
        c.header("Content-Type", mimeTypes[ext] || "application/octet-stream");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(fs.readFileSync(filePath));
    }
    return c.notFound();
});

// Hashed JS/CSS bundles of the React app (Node only; Cloudflare serves these as static assets)
app.get("/assets/*", (c) => {
    if (!clientDir) return c.notFound();
    const assetsDir = path.join(clientDir, "assets");
    const filePath = path.join(assetsDir, path.normalize(c.req.path.replace(/^\/assets\//, "")));
    if (!filePath.startsWith(assetsDir + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return c.notFound();
    }
    const types: Record<string, string> = {
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".woff2": "font/woff2",
    };
    c.header("Content-Type", types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return c.body(fs.readFileSync(filePath));
});

// 8. Web app pages (React SPA: landing/explorer, API docs, playground, and engineering blog)
app.get("/docs", serveSpa);
app.get("/docs/*", serveSpa);
app.get("/playground", serveSpa);
app.get("/playground/*", serveSpa);
app.get("/map", serveSpa);
app.get("/demo", serveSpa);
app.get("/blog", serveSpa);
app.get("/blog/*", serveSpa);

// 8. API Root Welcome Endpoint (Auto-detects Browser vs API client)
app.get("/", async (c) => {
    const accept = c.req.header("Accept") || "";
    // Same URL serves HTML or JSON — keep browser/CDN caches from mixing them up
    c.header("Vary", "Accept");
    if (accept.includes("text/html") && !c.req.query("json")) {
        return serveSpa(c);
    }

    c.header(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );
    return c.json({
        name: "OpenGeo Cambodia API",
        purpose: "Open API for Cambodia geography data",
        pillars: [
            "1. Administrative Hierarchy (Provinces, Districts, Communes, Villages)",
            "2. Allow user to use for free (100% Free & Open Access, No API Keys, No Paywalls)",
            "3. Provide fast response time (Sub-1ms in-memory cascading lookups)",
        ],
        description:
            "An Open API for Cambodia geography data providing complete 4-tier administrative hierarchy (25 Provinces, 210 Districts, 1,661 Communes, and 14,576 Villages), 100% free to use, with sub-1ms response times",
        dataSource: "https://data.mef.gov.kh/",
        version: "1.8.0",
        documentation: "/api/info",
        playground: "/playground",
        llms: "/llms.txt",
        llmsFull: "/llms-full.txt",
        postman: "/opengeo-cambodia.postman_collection.json",
        demo: "/demo",
        health: "/health",
        endpoints: {
            provinces: "/api/admin/provinces",
            search: "/api/admin/search?q=:query",
            reverse: "/api/geocode/reverse?lat=:lat&lon=:lon",
            stats: "/api/admin/stats",
            boundaries: "/api/boundaries?level=:level",
            boundaryProvinces: "/api/boundaries/provinces",
            boundaryDistricts: "/api/boundaries/districts?province_code=:code",
            boundaryCommunes: "/api/boundaries/communes?district_code=:code",
            boundaryItem: "/api/boundaries/item/:code",
            chat: "/api/chat",
            chatStatus: "/api/chat/status",
        },
    });
});

// 8. Mount API Routes
app.route("/api/admin", adminRoutes);
app.route("/api/boundaries", boundariesRoutes);
app.route("/api/geocode", geocodeRoutes);
app.route("/api/chat", chatRoutes);
app.route("/", healthRoutes);

// 8. 404 Not Found Handler
app.notFound((c) => {
    const accept = c.req.header("Accept") || "";
    if (accept.includes("text/html") && !c.req.path.startsWith("/api/")) {
        return serveSpa(c);
    }
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
