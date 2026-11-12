/**
 * =========================================================================
 * OpenGeo Cambodia - XML Sitemap Generator
 * =========================================================================
 *
 * Generates an SEO-optimized, standards-compliant XML sitemap (sitemaps.org)
 * covering Web Pages, Multilingual Alternates, Core API Endpoints,
 * GeoJSON Boundaries, and Open Data CSV downloads.
 *
 * Outputs to:
 * - public/sitemap.xml (source asset)
 * - dist/client/sitemap.xml (Vite client build output)
 * - dist/public/sitemap.xml (Node dist asset)
 *
 * Usage:
 *   deno task generate:sitemap
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

const DOMAIN = "https://opengeo-cambodia.pphat.me";
const TODAY = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: string;
    alternates?: Array<{ hreflang: string; href: string }>;
}

// 1. Top-Level Web Pages with Multilingual Support (Khmer & English)
const webPages: SitemapUrl[] = [
    {
        loc: `${DOMAIN}/`,
        lastmod: TODAY,
        changefreq: "daily",
        priority: "1.0",
        alternates: [
            { hreflang: "km", href: `${DOMAIN}/?lang=km` },
            { hreflang: "en", href: `${DOMAIN}/?lang=en` },
            { hreflang: "x-default", href: `${DOMAIN}/` },
        ],
    },
    {
        loc: `${DOMAIN}/docs`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.9",
        alternates: [
            { hreflang: "km", href: `${DOMAIN}/docs?lang=km` },
            { hreflang: "en", href: `${DOMAIN}/docs?lang=en` },
            { hreflang: "x-default", href: `${DOMAIN}/docs` },
        ],
    },
    {
        loc: `${DOMAIN}/playground`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.9",
        alternates: [
            { hreflang: "km", href: `${DOMAIN}/playground?lang=km` },
            { hreflang: "en", href: `${DOMAIN}/playground?lang=en` },
            { hreflang: "x-default", href: `${DOMAIN}/playground` },
        ],
    },
    {
        loc: `${DOMAIN}/map`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.8",
        alternates: [
            { hreflang: "km", href: `${DOMAIN}/map?lang=km` },
            { hreflang: "en", href: `${DOMAIN}/map?lang=en` },
            { hreflang: "x-default", href: `${DOMAIN}/map` },
        ],
    },
    {
        loc: `${DOMAIN}/demo`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.8",
        alternates: [
            { hreflang: "km", href: `${DOMAIN}/demo?lang=km` },
            { hreflang: "en", href: `${DOMAIN}/demo?lang=en` },
            { hreflang: "x-default", href: `${DOMAIN}/demo` },
        ],
    },
];

// Combine only user-facing, indexable web pages (Google Search & sitemaps.org guidelines)
// Raw API endpoints, machine specs, and downloads are excluded so they do not trigger
// "Crawled - currently not indexed" warnings in Google Search Console.
const allUrls: SitemapUrl[] = [
    ...webPages,
];

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "'": return "&apos;";
            case '"': return "&quot;";
            default: return c;
        }
    });
}

// Generate XML content
function buildXml(urls: SitemapUrl[]): string {
    const lines: string[] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ];

    for (const u of urls) {
        lines.push("    <url>");
        lines.push(`        <loc>${escapeXml(u.loc)}</loc>`);
        if (u.alternates) {
            for (const alt of u.alternates) {
                lines.push(`        <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}"/>`);
            }
        }
        if (u.lastmod) {
            lines.push(`        <lastmod>${u.lastmod}</lastmod>`);
        }
        if (u.changefreq) {
            lines.push(`        <changefreq>${u.changefreq}</changefreq>`);
        }
        if (u.priority) {
            lines.push(`        <priority>${u.priority}</priority>`);
        }
        lines.push("    </url>");
    }

    lines.push("</urlset>");
    lines.push("");
    return lines.join("\n");
}

export function generateSitemap(): string {
    const xml = buildXml(allUrls);

    // Write targets
    const targets = [
        path.join(rootDir, "public", "sitemap.xml"),
        path.join(rootDir, "dist", "client", "sitemap.xml"),
        path.join(rootDir, "dist", "public", "sitemap.xml"),
    ];

    for (const target of targets) {
        try {
            const dir = path.dirname(target);
            if (fs.existsSync(dir)) {
                fs.writeFileSync(target, xml, "utf-8");
                console.log(`🗺️  Wrote sitemap (${allUrls.length} URLs) -> ${path.relative(rootDir, target)}`);
            }
        } catch (err) {
            console.warn(`⚠️ Failed writing sitemap to ${target}:`, err);
        }
    }

    return xml;
}

// Auto-run if executed as CLI
if (import.meta.main) {
    console.log("🚀 Building XML Sitemap for OpenGeo Cambodia...");
    generateSitemap();
    console.log(`✅ Sitemap generation completed (${allUrls.length} indexable URLs)!`);
}

