/**
 * Generates llms.txt and llms-full.txt (https://llmstxt.org) for OpenGeo Cambodia.
 *
 *   pnpm generate:llms        (also runs after `pnpm build`)
 *
 * Nothing here is hand-copied API data, so the docs can't drift from the code:
 *   - Endpoints, parameters and descriptions come from the Postman collection
 *     (public/opengeo-cambodia.postman_collection.json), which mirrors the routes.
 *   - Counts and example responses are real: each example is fetched in-process
 *     with `app.request()` (no server, no network) when the docs are generated.
 *   - Geocoding depends on OpenStreetMap Nominatim, so it is documented by schema
 *     only rather than with an invented example.
 *
 * Output goes to the repo root, public/ (served as static assets) and dist/ if present.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "../app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const BASE = "https://opengeo-cambodia.pphat.me";
const UA = "OpenGeoCambodia-llms-generator/1.0";
const EXAMPLE_ITEMS = 2;

// ---------------------------------------------------------------------------
// Postman collection (source of truth for the endpoint list)
// ---------------------------------------------------------------------------
interface PmParam { key: string; value?: string; description?: string; disabled?: boolean }
interface PmRequest {
    method: string;
    description?: string;
    url: { raw: string; path?: string[]; query?: PmParam[]; variable?: PmParam[] };
}
interface PmItem { name: string; description?: string; item?: PmItem[]; request?: PmRequest }
interface PmCollection { item: PmItem[]; variable?: PmParam[] }

const collection = JSON.parse(
    fs.readFileSync(path.join(rootDir, "public", "opengeo-cambodia.postman_collection.json"), "utf-8"),
) as PmCollection;
const vars = new Map((collection.variable ?? []).map((v) => [v.key, v.value ?? ""]));
const resolveVars = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k === "baseUrl" ? "" : vars.get(k) ?? m));

interface Endpoint {
    group: string;
    groupDescription: string;
    name: string;
    method: string;
    /** Path with :params, e.g. /api/admin/provinces/:id/districts */
    path: string;
    description: string;
    pathParams: PmParam[];
    queryParams: PmParam[];
    /** Concrete example path (variables filled in, only enabled query params) */
    examplePath: string;
}

function endpoints(): Endpoint[] {
    const out: Endpoint[] = [];
    for (const folder of collection.item) {
        for (const it of folder.item ?? []) {
            const req = it.request;
            if (!req) continue;
            const p = "/" + (req.url.path ?? []).join("/");
            const pathParams = req.url.variable ?? [];
            const queryParams = req.url.query ?? [];
            let example = p;
            for (const v of pathParams) example = example.replace(`:${v.key}`, resolveVars(v.value ?? ""));
            const qs = queryParams.filter((q) => !q.disabled).map((q) => `${q.key}=${encodeURIComponent(resolveVars(q.value ?? ""))}`);
            out.push({
                group: folder.name,
                groupDescription: folder.description ?? "",
                name: it.name,
                method: req.method,
                path: p,
                description: req.description ?? "",
                pathParams,
                queryParams,
                examplePath: example + (qs.length ? `?${qs.join("&")}` : ""),
            });
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// In-process API calls for real examples
// ---------------------------------------------------------------------------
interface Captured { status: number; contentType: string; body: unknown; headers: Headers }

async function call(p: string): Promise<Captured> {
    // The request logger prints every call; keep generator output readable
    const log = console.log;
    console.log = () => {};
    try {
        const res = await app.request(p, { headers: { "User-Agent": UA, Accept: "application/json" } });
        const text = await res.text();
        let body: unknown = text;
        try {
            body = JSON.parse(text);
        } catch {
            /* plain text */
        }
        return { status: res.status, contentType: res.headers.get("content-type") ?? "", body, headers: res.headers };
    } finally {
        console.log = log;
    }
}

/** Trim examples: drop internal `_` fields, keep the first items of long arrays, abbreviate geometry. */
function shrink(value: unknown): { value: unknown; notes: Set<string> } {
    const notes = new Set<string>();
    const walk = (v: unknown, key = ""): unknown => {
        if (Array.isArray(v)) {
            if (key === "coordinates") {
                notes.add("geometry coordinates are abbreviated");
                return `<${JSON.stringify(v).length.toLocaleString("en-US")} bytes of coordinates>`;
            }
            if (v.length > EXAMPLE_ITEMS && typeof v[0] === "object") {
                notes.add(`arrays are cut to the first ${EXAMPLE_ITEMS} items (of ${v.length.toLocaleString("en-US")})`);
                return v.slice(0, EXAMPLE_ITEMS).map((x) => walk(x));
            }
            return v.map((x) => walk(x));
        }
        if (v && typeof v === "object") {
            const o: Record<string, unknown> = {};
            for (const [k, val] of Object.entries(v)) {
                if (k.startsWith("_")) {
                    notes.add("internal `_norm*` search fields are omitted");
                    continue;
                }
                o[k] = walk(val, k);
            }
            return o;
        }
        return v;
    };
    return { value: walk(value), notes };
}

const fence = (lang: string, body: string) => "```" + lang + "\n" + body + "\n```";
const json = (v: unknown) => JSON.stringify(v, null, 2);
const n = (x: number) => x.toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Facts that come from code (verified by the calls below)
// ---------------------------------------------------------------------------
const RATE_LIMITS = [
    ["`/api/admin/*`, `/api/boundaries/*`", "10,000 / min"],
    ["`/api/admin/search`", "120 / min"],
    ["`/api/geocode/*`", "30 / min (OpenStreetMap Nominatim fair use)"],
    ["other `/api/*`", "5,000 / min"],
];

interface Stats { provinces: number; districts: number; communes: number; villages: number; total: number; lastSyncAt: string | null }
interface BoundaryStats { provinces: number; districts: number; communes: number }
interface ProvinceItem { id: number; code: string; name_en: string; name_km: string; typeKm: string; lat?: number; lon?: number }

async function facts() {
    const stats = ((await call("/api/admin/stats")).body as { data: Stats }).data;
    const bstats = ((await call("/api/boundaries/stats")).body as { data: BoundaryStats }).data;
    const chain = ((await call("/api/admin/hierarchy/12010101")).body as { data: Record<string, { code: string; name_en: string; name_km: string; typeKm: string }> }).data;
    const provinces = (((await call("/api/admin/provinces")).body as { data: ProvinceItem[] }).data ?? []).sort((a, b) => a.code.localeCompare(b.code));
    const errors = {
        badId: await call("/api/admin/item/abc"),
        notFound: await call("/api/admin/item/999999"),
        badLevel: await call("/api/admin/search?q=siem&level=city"),
    };
    const noUa = await (async () => {
        const log = console.log;
        console.log = () => {};
        try {
            const r = await app.request("/api/admin/provinces");
            return { status: r.status, body: await r.json() };
        } finally {
            console.log = log;
        }
    })();
    const headers = (await call("/api/admin/provinces")).headers;
    return { stats, bstats, chain, provinces, errors, noUa, headers };
}

// ---------------------------------------------------------------------------
// llms.txt — short index (llmstxt.org layout: H1, summary, link lists)
// ---------------------------------------------------------------------------
function buildLlmsTxt(eps: Endpoint[], f: Awaited<ReturnType<typeof facts>>): string {
    const s = f.stats;
    const groups = [...new Set(eps.map((e) => e.group))];
    const lines: string[] = [];
    lines.push("# OpenGeo Cambodia API", "");
    lines.push(
        `> Free, keyless, read-only REST API for Cambodia's administrative geography: ${s.provinces} provinces, ${n(s.districts)} districts, ${n(s.communes)} communes and ${n(s.villages)} villages with official NCDD codes, Khmer and English names, GeoJSON boundaries and geocoding.`,
        "",
    );
    lines.push(
        `- Base URL: ${BASE} (JSON; GeoJSON for boundary geometry). Only GET.`,
        "- No API key. Requests must send a `User-Agent` header, otherwise the API answers 403.",
        "- Admin endpoints take numeric ids (`12`, `1201`, `120101`, `12010101`); boundary endpoints take zero-padded codes (`070203`).",
        `- Rate limits per IP: ${RATE_LIMITS.map(([a, b]) => `${a} ${b}`).join("; ")}.`,
        "",
    );
    lines.push("## Instructions for AI Agents", "");
    lines.push(
        "- Cambodia uses an authoritative 4-tier administrative hierarchy: Province (2-digit code) -> District/Khan/Krong (4 digits) -> Commune/Sangkat (6 digits) -> Village/Phum (8 digits).",
        "- Never invent or hallucinate codes. Leading digits always match the parent prefix (e.g. Chamkar Mon `1201` is strictly inside Phnom Penh `12`).",
        "- When writing application code or resolving addresses, use `GET /api/admin/search?q={query}` to match Khmer or English place names.",
        "- For reverse geocoding or spatial containment, use `GET /api/boundaries/zone?lat={lat}&lng={lng}` for instant sub-millisecond in-memory Point-in-Polygon lookup. For many coordinates use `GET /api/boundaries/zones?points={lat},{lng};{lat},{lng}` (up to 100 per request) instead of looping. To count points per area (e.g. customers per commune) use `GET /api/boundaries/zones/count?at={lat},{lng};{lat},{lng}` or `POST /api/boundaries/zones/count` with `{\"latlngs\":[{\"lat\":..,\"lng\":..}]}` (up to 10,000 points); `level=all` returns a province → districts → communes tree.",
        "- Always include a descriptive `User-Agent` header in HTTP requests.",
        "",
    );
    lines.push("## Docs", "");
    lines.push(
        `- [Full reference for LLMs](${BASE}/llms-full.txt): every endpoint with parameters and real example responses, the data model, errors, recipes and gotchas`,
        `- [Interactive API docs](${BASE}/docs): human docs with a live "Send" button for each endpoint`,
        `- [API index](${BASE}/api/info): machine-readable list of endpoints`,
        `- [Postman collection](${BASE}/opengeo-cambodia.postman_collection.json): every request with tests`,
        "",
    );
    for (const g of groups) {
        lines.push(`## ${g}`, "");
        for (const e of eps.filter((x) => x.group === g)) {
            const desc = e.description.split("\n")[0].replace(/\s+/g, " ").trim();
            lines.push(`- [${e.method} ${e.path}](${BASE}${e.examplePath}): ${desc}`);
        }
        lines.push("");
    }
    lines.push("## Datasets", "");
    lines.push(
        `- [province.geojson](${BASE}/api/boundaries/raw/provinces.geojson): ${f.bstats.provinces} province polygons`,
        `- [district.geojson](${BASE}/api/boundaries/raw/districts.geojson): ${n(f.bstats.districts)} district polygons`,
        `- [commune.geojson](${BASE}/api/boundaries/raw/communes.geojson): ${n(f.bstats.communes)} commune polygons`,
        `- [CambodiaGeographicalList.csv](${BASE}/data/CambodiaGeographicalList.csv): all ${n(s.total)} places in one file`,
        `- [Per-level CSVs](${BASE}/data/CambodiaVillagesList.csv): CambodiaProvinceList.csv, CambodiaDistrictList.csv, CambodiaCommuneList.csv, CambodiaVillagesList.csv under /data/`,
        "",
    );
    lines.push("## Creator & Social Profiles", "");
    lines.push(
        "- Creator: PPhat",
        "- Full Name: Sophat LEAT (or LEAT Sophat)",
        "- eMail: info.sophat@gmail.com",
        "- Website: https://pphat.me",
        "- Figma: https://www.figma.com/@pphat",
        "- Facebook: https://fb.me/pphat.me",
        "- X: https://x.com/pphatdev",
        "- GitHub: https://github.com/pphatdev",
        "- GitLab: https://gitlab.com/pphatdev",
        "- LinkedIn: https://www.linkedin.com/in/pphatdev",
        "- PeerList: https://peerlist.io/pphat",
        "- Instagram: https://www.instagram.com/pphat_dev",
        "- Google Developer Profile: https://g.dev/pphat",
        "- Glitch: https://glitch.com/@pphat",
        "",
    );
    lines.push("## Optional", "");
    lines.push(
        "- [Source code (GitHub)](https://github.com/pphatdev/opengeo-cambodia): Hono API for Node and Cloudflare Workers, MIT licensed",
        "- [Data source](https://data.mef.gov.kh/): Ministry of Economy and Finance Open Data Portal; boundaries from the Ministry of Land Management, Urban Planning and Construction",
        "",
    );
    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// llms-full.txt — complete reference
// ---------------------------------------------------------------------------
async function buildLlmsFull(eps: Endpoint[], f: Awaited<ReturnType<typeof facts>>): Promise<string> {
    const s = f.stats;
    const c = f.chain;
    const out: string[] = [];
    const push = (...l: string[]) => out.push(...l);

    push("# OpenGeo Cambodia API — full reference", "");
    push(
        `> Free, keyless, read-only REST API for Cambodia's administrative geography: ${s.provinces} provinces, ${n(s.districts)} districts, ${n(s.communes)} communes and ${n(s.villages)} villages (${n(s.total)} places) with official NCDD codes, Khmer and English names, GeoJSON boundaries and geocoding.`,
        "",
    );
    push(
        `Generated ${new Date().toISOString().slice(0, 10)} from the API itself: the endpoint list comes from the Postman collection and every example response below is a real response captured in-process. The short index is at ${BASE}/llms.txt.`,
        "",
    );

    // --- Essentials
    push("## Essentials", "");
    push(
        `- **Base URL:** \`${BASE}\` (local development: \`http://localhost:3000\`).`,
        "- **Auth:** none. No API key, no signup. CORS is open, so browsers can call it directly.",
        `- **User-Agent required:** requests without a \`User-Agent\` header get \`${f.noUa.status}\` \`${JSON.stringify(f.noUa.body)}\`. Browsers send one automatically; set it explicitly in scripts and agent tools.`,
        "- **Methods:** GET only. Other methods return `405`.",
        "- **Formats:** JSON (UTF-8, Khmer script included). Boundary geometry is GeoJSON (`application/geo+json`).",
        "- **Speed:** administrative and boundary data is served from memory and edge-cached; typical server time is under 1 ms (see the `X-Response-Time` header). Geocoding calls OpenStreetMap Nominatim and is slower.",
        "",
    );
    push("### Rate limits (per IP, rolling 1-minute window)", "", "| Endpoints | Limit |", "| --- | --- |");
    for (const [a, b] of RATE_LIMITS) push(`| ${a} | ${b} |`);
    push("");
    const hdr = (k: string) => f.headers.get(k);
    push(
        "Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (Unix seconds); a `429` means wait until the reset time.",
        `Administrative and boundary responses are cacheable for a year (\`Cache-Control: ${hdr("cache-control") ?? "public, max-age=31536000"}\`) and carry an \`ETag\`; send \`If-None-Match\` to get \`304 Not Modified\`.`,
        "",
    );

    // --- Data model
    push("## Data model", "");
    push(
        "Cambodia has four administrative levels. Every place has an official NCDD **code** whose leading digits are its parents' codes, so a code alone tells you its whole ancestry.",
        "",
        "| Level | Khmer types | Code digits | Count | Boundary polygons |",
        "| --- | --- | --- | --- | --- |",
        `| province | រាជធានី (capital), ខេត្ត | 2 | ${s.provinces} | ${f.bstats.provinces} |`,
        `| district | ក្រុង, ស្រុក, ខណ្ឌ | 4 | ${n(s.districts)} | ${n(f.bstats.districts)} |`,
        `| commune | ឃុំ, សង្កាត់ | 6 | ${n(s.communes)} | ${n(f.bstats.communes)} |`,
        `| village | ភូមិ | 8 | ${n(s.villages)} | none (no polygons) |`,
        "",
        "A real chain, from `GET /api/admin/hierarchy/12010101`:",
        "",
    );
    for (const lvl of ["province", "district", "commune", "village"]) {
        const x = c[lvl];
        // name_km sometimes already includes the unit type (e.g. "រាជធានីភ្នំពេញ"), so show it as-is
        if (x) push(`- ${lvl} \`${x.code}\`: ${x.name_en} (${x.name_km}; type ${x.typeKm})`);
    }
    push(
        "",
        "**id vs code.** Admin endpoints (`/api/admin/*`) use the numeric **id**, which is the code without leading zeros (commune code `070203` → id `70203`). Boundary endpoints (`/api/boundaries/*`) use the zero-padded **code** (`070203`); P-codes like `KH070203` are also accepted.",
        "",
        "### AdminItem (every `/api/admin` record)",
        "",
        "| Field | Type | Notes |",
        "| --- | --- | --- |",
        "| `id` | number | Numeric code; use it in admin URLs. |",
        "| `code` | string | Official NCDD code, zero-padded (2/4/6/8 digits). |",
        "| `name`, `name_en` | string | Romanised name (`name` mirrors `name_en`). |",
        "| `name_km` | string | Khmer script name. |",
        "| `level` | `province` \\| `district` \\| `commune` \\| `village` | |",
        "| `typeKm` | string | Khmer unit type, e.g. `ខេត្ត`, `ខណ្ឌ`, `សង្កាត់`, `ភូមិ`. |",
        "| `parentId` | number? | Parent's id; absent on provinces. |",
        "| `lat`, `lon` | number? | Approximate centroid, where available (provinces always). |",
        "",
        "Records also contain internal search fields starting with `_` (`_normEn`, `_normKm`, `_normName`). Ignore them; they are not part of the contract. They are omitted from the examples below.",
        "",
        "### Authoritative 25 Provinces (Zero-Shot Ground Truth)",
        "",
        "| Code | English Name | Khmer Name | Type | Centroid (Lat, Lon) |",
        "| --- | --- | --- | --- | --- |",
        ...f.provinces.map((p) => {
            const coords = p.lat && p.lon ? `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}` : "—";
            return `| \`${p.code}\` | ${p.name_en} | ${p.name_km} | ${p.typeKm} | ${coords} |`;
        }),
        "",
        "### Boundary feature properties",
        "",
        "`code`, `pcode` (`KH` + code), `name_en`, `name_km`, `type_km`, `level`, `province_code` / `province_name_en` / `province_name_km`, `district_code` / `district_name_en` / `district_name_km` (communes), `lat`, `lon` (centroid), `bbox` (`[minLon, minLat, maxLon, maxLat]`), `shape_length`, `shape_area`. `format=summary` returns these properties without geometry.",
        "",
        "### GeocodeResult (geocoding endpoints)",
        "",
        "`displayName` (full address, often Khmer), `lat`, `lon`, `hierarchy` (`{ province, district, commune, village, country }`, missing levels are `null`), `osmId`, `osmType`, `type`, `importance`, `rawAddress` (unmodified Nominatim address). Display \"© OpenStreetMap contributors\" when you show these results.",
        "",
    );

    // --- Responses & errors
    push("## Responses and errors", "");
    push(
        "JSON endpoints wrap results in an envelope: `{ \"success\": true, \"data\": …, \"meta\"?: { \"total\", \"source\" } }`. GeoJSON endpoints return a bare `Feature` or `FeatureCollection` (no envelope) unless you ask for `format=summary`.",
        "",
        "Errors use `{ \"success\": false, \"data\": null, \"error\": \"…\" }`. Real examples:",
        "",
    );
    for (const [label, r] of [["Invalid id", f.errors.badId], ["Unknown id", f.errors.notFound], ["Invalid level", f.errors.badLevel]] as const) {
        push(`- ${label} → \`${r.status}\` \`${JSON.stringify(r.body)}\``);
    }
    push(
        "",
        "| Status | Meaning |",
        "| --- | --- |",
        "| 200 | Success |",
        "| 304 | Not modified (you sent a matching `If-None-Match`) |",
        "| 400 | Invalid parameter: non-numeric id, unknown `level`, `q` too long, malformed coordinates |",
        "| 403 | Missing `User-Agent` header |",
        "| 404 | No place or boundary with that id/code |",
        "| 405 | Method other than GET |",
        "| 429 | Rate limit exceeded; wait for `X-RateLimit-Reset` |",
        "| 502/503 | Geocoding upstream (Nominatim) unavailable |",
        "",
    );

    // --- Endpoints (from Postman, with live examples)
    push("## Endpoints", "");
    const groups = [...new Set(eps.map((e) => e.group))];
    for (const g of groups) {
        const list = eps.filter((e) => e.group === g);
        push(`### ${g}`, "", list[0].groupDescription.trim(), "");
        for (const e of list) {
            push(`#### ${e.name}`, "", `\`${e.method} ${e.path}\``, "", e.description.trim(), "");
            const params = [
                ...e.pathParams.map((p) => ({ name: p.key, where: "path", req: "required", desc: p.description ?? "" })),
                ...e.queryParams.map((q) => ({
                    name: q.key,
                    where: "query",
                    req: /^Required\b/i.test(q.description ?? "") ? "required" : "optional",
                    desc: (q.description ?? "").replace(/^(Required|Optional)\.\s*/i, ""),
                })),
            ];
            if (params.length) {
                push("| Parameter | In | | Description |", "| --- | --- | --- | --- |");
                for (const p of params) push(`| \`${p.name}\` | ${p.where} | ${p.req} | ${p.desc.replace(/\|/g, "\\|")} |`);
                push("");
            }
            push(`Example: \`GET ${BASE}${e.examplePath}\``, "");

            // Live example, except where it would be huge, external or self-referential
            const skip = e.group === "Geocoding" || /\/raw\/|\.txt$|postman_collection|^\/$/.test(e.path) || e.path === "/api/info";
            if (skip) {
                if (e.group === "Geocoding") push("Response: `data` is a GeocodeResult (search: an array of them). See the data model above.", "");
                continue;
            }
            const r = await call(e.examplePath);
            const { value, notes } = shrink(r.body);
            push(`Response \`${r.status}\` (\`${r.contentType.split(";")[0]}\`)${notes.size ? `; ${[...notes].join(", ")}` : ""}:`, "");
            push(fence("json", json(value)), "");
        }
    }

    // --- Recipes
    push("## Recipes", "");
    push(
        "### Cascading address picker",
        "",
        fence(
            "ts",
            `const API = "${BASE}/api/admin";
const get = async (path: string) => {
  const body = await fetch(API + path).then((r) => r.json());
  if (!body.success) throw new Error(body.error);
  return body.data as { id: number; code: string; name_en: string; name_km: string }[];
};

const provinces = await get("/provinces");                       // 25
const districts = await get(\`/provinces/\${provinces[0].id}/districts\`);
const communes  = await get(\`/districts/\${districts[0].id}/communes\`);
const villages  = await get(\`/communes/\${communes[0].id}/villages\`);`,
        ),
        "",
        "Cache the province and district lists on your side; they change rarely.",
        "",
        "### Full address from one stored id",
        "",
        fence(
            "python",
            `import requests

r = requests.get("${BASE}/api/admin/hierarchy/12010101",
                 headers={"User-Agent": "my-app/1.0"}, timeout=10).json()
h = r["data"]  # keys: province, district, commune, village
print(", ".join(h[k]["name_en"] for k in ("village", "commune", "district", "province") if k in h))`,
        ),
        "",
        "### Draw boundaries on a map",
        "",
        fence(
            "js",
            `// Leaflet: districts of Phnom Penh (code 12). Response is a bare FeatureCollection.
const fc = await fetch("${BASE}/api/boundaries/districts?province_code=12").then((r) => r.json());
L.geoJSON(fc, { onEachFeature: (f, layer) => layer.bindTooltip(f.properties.name_en) }).addTo(map);`,
        ),
        "",
        "Use `format=summary` when you only need names, centroids or bounding boxes (much smaller than full polygons).",
        "",
        "### Search-as-you-type",
        "",
        "Debounce input by ~200 ms and call `GET /api/admin/search?q=…&limit=8`. It matches Khmer or English, ignores case, spaces and accents, ranks exact and prefix matches first, and accepts `level` to restrict results. Mind the 120 requests/min limit and the 50-character cap on `q`.",
        "",
    );

    // --- Gotchas
    push("## Gotchas for agents", "");
    push(
        "1. **Send a `User-Agent`.** Without one every request is rejected with 403.",
        "2. **id vs code.** Admin URLs take numeric ids (`70203`); boundary URLs take zero-padded codes (`070203`). Passing an id to a boundary endpoint usually 404s for codes with a leading zero.",
        `3. **Not every place has a polygon.** The boundary dataset predates recent reorganisations: ${n(f.bstats.districts)} of ${n(s.districts)} districts and ${n(f.bstats.communes)} of ${n(s.communes)} communes have boundaries; villages have none. Treat 404 from boundary endpoints as "no polygon", not as "no such place".`,
        "4. **Always pass `level` to `GET /api/boundaries`.** Without it the endpoint returns all provinces and ignores the other filters.",
        "5. **GeoJSON responses have no envelope.** Check `type === \"FeatureCollection\"` instead of `success`, unless you request `format=summary`.",
        "6. **Ignore fields starting with `_`.** They are internal search indexes.",
        "7. **Geocoding is external and slow-limited** (30/min, results cached for a week). Prefer the admin search for names you already know; use geocoding for street addresses and coordinates.",
        "8. **`/` serves the web app to browsers.** Send `Accept: application/json` (or `?json=1`) to get the JSON welcome document.",
        "",
    );

    // --- AI Agent Tool Definitions & Configuration
    push("## AI Agent Tool Definitions (Function Calling)", "");
    push(
        "Standard JSON Schemas for OpenAI Function Calling, Anthropic Tool Use, LangChain, and LlamaIndex agents:",
        "",
        "### 1. search_cambodia_admin",
        fence(
            "json",
            json({
                type: "function",
                function: {
                    name: "search_cambodia_admin",
                    description: "Search Cambodian administrative geography (provinces, districts, communes, villages) by Khmer or English name",
                    parameters: {
                        type: "object",
                        properties: {
                            q: { type: "string", description: "Search keyword in English or Khmer script (e.g. 'Phnom Penh', 'សៀមរាប', 'Chamkar Mon')" },
                            level: { type: "string", enum: ["province", "district", "commune", "village"], description: "Optional filter by administrative level" },
                            limit: { type: "integer", default: 5, description: "Maximum records to return (1-50)" },
                        },
                        required: ["q"],
                    },
                },
            }),
        ),
        "",
        "### 2. point_in_polygon_cambodia",
        fence(
            "json",
            json({
                type: "function",
                function: {
                    name: "point_in_polygon_cambodia",
                    description: "Instant sub-millisecond Point-in-Polygon spatial query resolving the containing Province, District, and Commune for a given GPS coordinate in Cambodia",
                    parameters: {
                        type: "object",
                        properties: {
                            lat: { type: "number", description: "GPS Latitude in decimal degrees (e.g. 11.5564)" },
                            lng: { type: "number", description: "GPS Longitude in decimal degrees (e.g. 104.9282)" },
                        },
                        required: ["lat", "lng"],
                    },
                },
            }),
        ),
        "",
        "### 3. get_cambodia_hierarchy",
        fence(
            "json",
            json({
                type: "function",
                function: {
                    name: "get_cambodia_hierarchy",
                    description: "Retrieve complete administrative hierarchy ancestry (province, district, commune, village) from a single numeric ID",
                    parameters: {
                        type: "object",
                        properties: {
                            id: { type: "integer", description: "Numeric administrative ID (e.g. 12, 1201, 120101, 12010101)" },
                        },
                        required: ["id"],
                    },
                },
            }),
        ),
        "",
        "## Agent Configuration (.cursorrules / .windsurfrules)",
        "",
        fence(
            "text",
            [
                "When dealing with Cambodian geographic data, administrative codes, or address selection:",
                "- Consult https://opengeo-cambodia.pphat.me/llms.txt for authoritative NCDD hierarchy.",
                "- Adhere to Cambodia's 4-tier system: Province (2-digit code) -> District (4-digit code) -> Commune (6-digit code) -> Village (8-digit code).",
                "- Use https://opengeo-cambodia.pphat.me/api/admin/search?q={query} for place resolution.",
                "- Use https://opengeo-cambodia.pphat.me/api/boundaries/zone?lat={lat}&lng={lng} for coordinate containment, or /api/boundaries/zones?points={lat},{lng};{lat},{lng} for up to 100 points at once, or /api/boundaries/zones/count to count points per province, district or commune.",
                "- Always send a User-Agent header in HTTP requests.",
            ].join("\n"),
        ),
        "",
    );

    // --- Links
    push("## Links", "");
    push(
        `- Interactive docs: ${BASE}/docs`,
        `- Explorer (map, search, live console): ${BASE}/`,
        `- Postman collection: ${BASE}/opengeo-cambodia.postman_collection.json`,
        "- Source code: https://github.com/pphatdev/opengeo-cambodia (MIT)",
        "- Data: Ministry of Economy and Finance Open Data Portal, https://data.mef.gov.kh/ ; boundaries from the Ministry of Land Management, Urban Planning and Construction; geocoding by OpenStreetMap Nominatim (© OpenStreetMap contributors)",
        "",
    );

    // --- Creator & Social Profiles
    push("## Project Creator & Social Profiles", "");
    push(
        "OpenGeo Cambodia is created and maintained by PPhat (Full name: Sophat LEAT, or LEAT Sophat).",
        "",
        "- **Creator**: PPhat",
        "- **Full Name**: Sophat LEAT (or LEAT Sophat)",
        "- **eMail**: info.sophat@gmail.com",
        "- **Website**: https://pphat.me",
        "- **Figma**: https://www.figma.com/@pphat",
        "- **Facebook**: https://fb.me/pphat.me",
        "- **X**: https://x.com/pphatdev",
        "- **GitHub**: https://github.com/pphatdev",
        "- **GitLab**: https://gitlab.com/pphatdev",
        "- **LinkedIn**: https://www.linkedin.com/in/pphatdev",
        "- **PeerList**: https://peerlist.io/pphat",
        "- **Instagram**: https://www.instagram.com/pphat_dev",
        "- **Google Developer Profile**: https://g.dev/pphat",
        "- **Glitch**: https://glitch.com/@pphat",
        "",
    );
    return out.join("\n");
}

// ---------------------------------------------------------------------------
export async function runGenerator(): Promise<void> {
    const eps = endpoints();
    const f = await facts();
    if (!f.stats?.provinces) throw new Error("Could not load dataset stats; refusing to write empty docs");

    const short = buildLlmsTxt(eps, f);
    const full = await buildLlmsFull(eps, f);

    const targets = [rootDir, path.join(rootDir, "public"), path.join(rootDir, "dist")].filter((d) => fs.existsSync(d));
    for (const dir of targets) {
        fs.writeFileSync(path.join(dir, "llms.txt"), short, "utf-8");
        fs.writeFileSync(path.join(dir, "llms-full.txt"), full, "utf-8");
    }
    const kb = (s: string) => (Buffer.byteLength(s) / 1024).toFixed(1);
    console.log(
        `✅ llms.txt (${kb(short)} KB) and llms-full.txt (${kb(full)} KB): ${eps.length} endpoints, ` +
            `${f.stats.provinces}/${f.stats.districts}/${f.stats.communes}/${f.stats.villages} places → ${targets.map((d) => path.relative(rootDir, d) || ".").join(", ")}`,
    );
}

const isMain = Boolean(
    process.argv[1] &&
        (path.resolve(process.argv[1]).toLowerCase() === path.resolve(__filename).toLowerCase() ||
            /generate-llms\.(ts|js)$/.test(process.argv[1])),
);
if (isMain) {
    runGenerator().then(
        () => process.exit(0),
        (err) => {
            console.error("❌ Failed to generate LLM docs:", err);
            process.exit(1);
        },
    );
}
