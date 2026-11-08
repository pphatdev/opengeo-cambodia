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
 *   pnpm generate:sitemap
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

// 2. Machine-Readable Specifications, LLM Documentation & OpenAPI
const specResources: SitemapUrl[] = [
    {
        loc: `${DOMAIN}/api/info`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.8",
    },
    {
        loc: `${DOMAIN}/llms.txt`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.8",
    },
    {
        loc: `${DOMAIN}/llms-full.txt`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.8",
    },
    {
        loc: `${DOMAIN}/opengeo-cambodia.postman_collection.json`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/api/admin/stats`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.8",
    },
    {
        loc: `${DOMAIN}/api/boundaries/stats`,
        lastmod: TODAY,
        changefreq: "weekly",
        priority: "0.8",
    },
];

// 3. Core Geographic & Administrative Endpoints
const apiEndpoints: SitemapUrl[] = [
    {
        loc: `${DOMAIN}/api/admin/provinces`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.8",
    },
    {
        loc: `${DOMAIN}/api/boundaries/provinces`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.8",
    },
    {
        loc: `${DOMAIN}/api/boundaries/districts`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/api/boundaries/communes`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/api/boundaries/zone`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.8",
    },
];

// 4. Official 25 Cambodian Provinces (GeoJSON boundaries & administrative records)
const PROVINCES = [
    { code: "01", name: "Banteay Meanchey" },
    { code: "02", name: "Battambang" },
    { code: "03", name: "Kampong Cham" },
    { code: "04", name: "Kampong Chhnang" },
    { code: "05", name: "Kampong Speu" },
    { code: "06", name: "Kampong Thom" },
    { code: "07", name: "Kampot" },
    { code: "08", name: "Kandal" },
    { code: "09", name: "Koh Kong" },
    { code: "10", name: "Kratie" },
    { code: "11", name: "Mondulkiri" },
    { code: "12", name: "Phnom Penh" },
    { code: "13", name: "Preah Vihear" },
    { code: "14", name: "Prey Veng" },
    { code: "15", name: "Pursat" },
    { code: "16", name: "Ratanakiri" },
    { code: "17", name: "Siem Reap" },
    { code: "18", name: "Preah Sihanouk" },
    { code: "19", name: "Stung Treng" },
    { code: "20", name: "Svay Rieng" },
    { code: "21", name: "Takeo" },
    { code: "22", name: "Oddar Meanchey" },
    { code: "23", name: "Kep" },
    { code: "24", name: "Pailin" },
    { code: "25", name: "Tboung Khmum" },
];

const provinceEndpoints: SitemapUrl[] = PROVINCES.flatMap((p) => [
    {
        loc: `${DOMAIN}/api/boundaries/provinces/${p.code}`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/api/admin/provinces/${p.code}/districts`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
]);

// 5. Raw Boundary GeoJSON & Open Data CSV Downloads
const downloadResources: SitemapUrl[] = [
    {
        loc: `${DOMAIN}/boundaries/province.geojson`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/boundaries/district.geojson`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/boundaries/commune.geojson`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/api/boundaries/raw/provinces.geojson`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
    {
        loc: `${DOMAIN}/api/boundaries/raw/districts.geojson`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
    {
        loc: `${DOMAIN}/api/boundaries/raw/communes.geojson`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
    {
        loc: `${DOMAIN}/data/CambodiaGeographicalList.csv`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.7",
    },
    {
        loc: `${DOMAIN}/data/CambodiaProvinceList.csv`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
    {
        loc: `${DOMAIN}/data/CambodiaDistrictList.csv`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
    {
        loc: `${DOMAIN}/data/CambodiaCommuneList.csv`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
    {
        loc: `${DOMAIN}/data/CambodiaVillagesList.csv`,
        lastmod: TODAY,
        changefreq: "monthly",
        priority: "0.6",
    },
];

// Combine all entries
const allUrls: SitemapUrl[] = [
    ...webPages,
    ...specResources,
    ...apiEndpoints,
    ...provinceEndpoints,
    ...downloadResources,
];

// Generate XML content
function buildXml(urls: SitemapUrl[]): string {
    const lines: string[] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ];

    for (const u of urls) {
        lines.push("    <url>");
        lines.push(`        <loc>${u.loc}</loc>`);
        if (u.alternates) {
            for (const alt of u.alternates) {
                lines.push(`        <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`);
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generate-sitemap.ts") || process.argv[1]?.endsWith("generate-sitemap.js")) {
    console.log("🚀 Building XML Sitemap for OpenGeo Cambodia...");
    generateSitemap();
    console.log(`✅ Sitemap generation completed (${allUrls.length} indexable URLs)!`);
}

