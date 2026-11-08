import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Icon } from "../../components/Icon";
import { codeCopy, codeTab, docsH1, docsH2, kicker, lvl } from "../../components/ui";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { COMMENT, highlightCode, highlightJson } from "../../lib/highlight";
import { useToast } from "../../lib/toast";
import { DOC_CHAPTERS, getDocChapter } from "./docsData";
import { EndpointCard } from "./EndpointCard";
import { ENDPOINTS, GROUPS } from "./endpoints";
import { C, CodeBox, H2, P, Table } from "./parts";

const QUICKSTART = {
    curl: `# 1. All 25 provinces
curl ${PROD_ORIGIN}/api/admin/provinces

# 2. Districts of Phnom Penh (id 12)
curl ${PROD_ORIGIN}/api/admin/provinces/12/districts

# 3. Communes of Chamkar Mon (id 1201), then villages of Tonle Basak (id 120101)
curl ${PROD_ORIGIN}/api/admin/districts/1201/communes
curl ${PROD_ORIGIN}/api/admin/communes/120101/villages`,
    js: `const API = "${PROD_ORIGIN}/api/admin";

async function get(path) {
  const res = await fetch(API + path);
  const body = await res.json();
  if (!body.success) throw new Error(body.error);
  return body.data;
}

const provinces = await get("/provinces");
const districts = await get(\`/provinces/\${provinces[11].id}/districts\`);
const communes  = await get(\`/districts/\${districts[0].id}/communes\`);

console.log(communes.map(c => \`\${c.name_en} (\${c.name_km})\`));`,
    py: `import requests

API = "${PROD_ORIGIN}/api/admin"

def get(path):
    body = requests.get(API + path, timeout=10).json()
    if not body["success"]:
        raise RuntimeError(body["error"])
    return body["data"]

provinces = get("/provinces")
districts = get(f"/provinces/{provinces[11]['id']}/districts")
for d in districts:
    print(d["code"], d["name_en"], d["name_km"])`,
};
const QS_LABELS = { curl: "curl", js: "JavaScript", py: "Python" } as const;

function highlightShell(text: string): ReactNode[] {
    return text.split("\n").flatMap((line, i, arr) => {
        const node = line.startsWith("#") ? <span className={COMMENT} key={i}>{line}</span> : line;
        return i < arr.length - 1 ? [node, "\n"] : [node];
    });
}

function QuickstartTabs() {
    const { copy } = useToast();
    const { t } = useI18n();
    const [tab, setTab] = useState<keyof typeof QUICKSTART>("curl");
    return (
        <CodeBox
            head={
                <>
                    {(Object.keys(QUICKSTART) as (keyof typeof QUICKSTART)[]).map((k) => (
                        <button
                            key={k}
                            className={codeTab}
                            role="tab"
                            type="button"
                            aria-selected={tab === k}
                            onClick={() => setTab(k)}
                        >
                            {QS_LABELS[k]}
                        </button>
                    ))}
                    <button className={codeCopy} type="button" onClick={() => copy(QUICKSTART[tab])}>
                        <Icon name="copy" />
                        {t("common.copy")}
                    </button>
                </>
            }
        >
            {tab === "curl" ? highlightShell(QUICKSTART.curl) : highlightCode(QUICKSTART[tab])}
        </CodeBox>
    );
}

const JsonBlock = ({ label, children }: { label: string; children: string }) => (
    <CodeBox head={<span className={codeTab} aria-selected="true">{label}</span>}>
        {highlightJson(children)}
    </CodeBox>
);

export function DocPost() {
    const { category, slug } = useParams<{ category?: string; slug?: string }>();
    const { lang, t, rt, tx } = useI18n();

    // Special standalone views: All Endpoints or Downloads
    const isEndpointsView = slug === "endpoints" || category === "endpoints";
    const isDownloadsView = slug === "downloads" || category === "downloads";

    const downloads = [
        { href: "/api/boundaries/raw/provinces.geojson", csv: false, name: "province.geojson", sub: t("downloads.polygons", { n: 25 }) },
        { href: "/api/boundaries/raw/districts.geojson", csv: false, name: "district.geojson", sub: t("downloads.polygons", { n: 197 }) },
        { href: "/api/boundaries/raw/communes.geojson", csv: false, name: "commune.geojson", sub: t("downloads.polygons", { n: "1,633" }) },
        { href: "/data/CambodiaGeographicalList.csv", csv: true, name: "CambodiaGeographicalList.csv", sub: t("docs.dlCombined") },
        { href: "/data/CambodiaProvinceList.csv", csv: true, name: "CambodiaProvinceList.csv", sub: t("levelPlural.province") },
        { href: "/data/CambodiaDistrictList.csv", csv: true, name: "CambodiaDistrictList.csv", sub: t("levelPlural.district") },
        { href: "/data/CambodiaCommuneList.csv", csv: true, name: "CambodiaCommuneList.csv", sub: t("levelPlural.commune") },
        { href: "/data/CambodiaVillagesList.csv", csv: true, name: "CambodiaVillagesList.csv", sub: t("levelPlural.village") },
    ];

    if (isEndpointsView) {
        return (
            <div>
                <div className={kicker}>{lang === "km" ? "ឯកសារយោង API" : "Interactive API Explorer"}</div>
                <h1 className={docsH1}>
                    {lang === "km" ? "ឧបករណ៍សាកល្បង" : "Interactive"}{" "}
                    <em>{lang === "km" ? "Endpoint ទាំងអស់" : "API Reference"}</em>
                </h1>
                <P>
                    {lang === "km"
                        ? "សាកល្បង Endpoint ផ្ទាល់ពីកម្មវិធីរុករករបស់អ្នក ជាមួយនឹងប៉ារ៉ាម៉ែត្រពិត និងការឆ្លើយតបពេលវេលាពិត។"
                        : "Send real live requests directly from your browser with interactive parameters and inspect real-time responses."}
                </P>

                <div className="mt-8 grid gap-12">
                    {GROUPS.map((g) => (
                        <div key={g.id} className="border-t border-line pt-8">
                            <h2 className={docsH2}>{tx(g.title)}</h2>
                            <P>{tx(g.intro)}</P>
                            <div className="grid gap-6">
                                {ENDPOINTS.filter((e) => e.group === g.id).map((e) => (
                                    <EndpointCard key={e.id} ep={e} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isDownloadsView) {
        return (
            <div>
                <div className={kicker}>{lang === "km" ? "ទាញយក" : "Downloads"}</div>
                <h1 className={docsH1}>
                    {lang === "km" ? "ទិន្នន័យដើម" : "Raw Datasets &"}{" "}
                    <em>{lang === "km" ? "GeoJSON & CSV" : "GeoJSON Boundaries"}</em>
                </h1>
                <P>{rt("docs.downloadsIntro")}</P>
                <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {downloads.map((d) => (
                        <a
                            key={d.name}
                            href={d.href}
                            download
                            className="group flex items-center justify-between rounded-xl border border-line bg-surface p-4 text-left no-underline transition hover:border-line-2 hover:shadow-card"
                        >
                            <div className="min-w-0">
                                <span className="mb-0.5 block truncate font-mono text-sm font-semibold text-ink group-hover:text-accent">
                                    {d.name}
                                </span>
                                <span className="text-xs text-ink-3 km:font-khmer">{d.sub}</span>
                            </div>
                            <span className="ml-3 flex size-8 flex-none items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-2 group-hover:bg-accent-soft group-hover:text-accent">
                                <Icon name="arrow" className="size-4 rotate-90" />
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        );
    }

    // Resolve post either from /docs/:category/:slug or fallback /docs/:slug
    const targetSlug = slug || category || "01-introduction-and-domain-model";
    const post = getDocChapter(targetSlug, slug ? category : undefined);

    if (!post) {
        return (
            <div className="py-12 text-center">
                <Icon name="alert" className="mx-auto mb-4 size-10 text-warn" />
                <h2 className="font-display text-2xl font-bold km:font-khmer">
                    {lang === "km" ? "រកមិនឃើញឯកសារទេ" : "Chapter Not Found"}
                </h2>
                <p className="mt-2 text-sm text-ink-3 km:font-khmer">
                    {lang === "km"
                        ? "ឯកសារដែលអ្នកកំពុងស្វែងរកមិនមាន ឬត្រូវបានផ្លាស់ប្តូរទីតាំង។"
                        : "The documentation chapter you are looking for does not exist or has been moved."}
                </p>
                <Link
                    to="/docs/getting-started/01-introduction-and-domain-model"
                    className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-xs font-semibold text-bg no-underline hover:opacity-90 km:font-khmer"
                >
                    <Icon name="arrow" className="rotate-180" />
                    {lang === "km" ? "ត្រឡប់ទៅមាតិកាដើម" : "Go to Chapter 1"}
                </Link>
            </div>
        );
    }

    const currentIndex = DOC_CHAPTERS.findIndex((p) => p.slug === post.slug);
    const prevPost = currentIndex > 0 ? DOC_CHAPTERS[currentIndex - 1] : null;
    const nextPost = currentIndex < DOC_CHAPTERS.length - 1 ? DOC_CHAPTERS[currentIndex + 1] : null;

    // Filter relevant live interactive endpoint cards for this chapter
    const relatedCards = post.endpointGroup
        ? ENDPOINTS.filter((e) => e.group === post.endpointGroup)
        : [];

    return (
        <article className="min-w-0 max-w-220 pb-12">
            {/* Breadcrumb Navigation */}
            <div className="mb-6 flex items-center justify-between border-b border-line pb-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <Link
                        to="/docs/getting-started/01-introduction-and-domain-model"
                        className="inline-flex items-center gap-1 font-medium text-ink-2 no-underline hover:text-accent km:font-khmer"
                    >
                        {lang === "km" ? "ឯកសារ" : "Docs"}
                    </Link>
                    <span className="text-line-2">/</span>
                    <span className="font-mono text-ink-3">{post.category}</span>
                </div>
                <span className="font-mono text-ink-3">
                    Part {post.part} of {DOC_CHAPTERS.length}
                </span>
            </div>

            {/* Chapter Header */}
            <header className="mb-8">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-ink-3">
                    <span className="rounded-md bg-accent-soft px-2.5 py-0.75 font-mono font-bold text-accent">
                        {post.category} · Part {post.part}
                    </span>
                    <span>{post.readTime}</span>
                    <span>·</span>
                    <span>{post.date}</span>
                </div>

                <h1 className="mb-3 mt-4 font-display text-[clamp(26px,3.8vw,38px)] font-bold tracking-tight text-ink km:font-khmer">
                    {lang === "km" ? post.titleKm : post.title}
                </h1>

                <p className="text-base leading-relaxed text-ink-2 km:font-khmer">
                    {lang === "km" ? post.descriptionKm : post.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                    {post.tags.map((t) => (
                        <span key={t} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-3">
                            #{t}
                        </span>
                    ))}
                </div>
            </header>

            {/* Key Highlights Card */}
            <div className="mb-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-accent km:font-khmer">
                    <Icon name="zap" className="size-4" />
                    {lang === "km" ? "ចំណុចសំខាន់ៗនៃមេរៀននេះ" : "Chapter Highlights"}
                </h3>
                <ul className="m-0 grid gap-2 pl-4 text-sm text-ink-2 km:font-khmer">
                    {post.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                    ))}
                </ul>
            </div>

            {/* Chapter-Specific Rich Content */}
            {post.part === 1 && (
                <section className="space-y-6">
                    <H2 id="domain-model">{lang === "km" ? "គំរូឋានានុក្រម ៤ ថ្នាក់" : "Authoritative 4-Tier Model"}</H2>
                    <P>
                        {lang === "km"
                            ? "រចនាសម្ព័ន្ធរដ្ឋបាលនៃព្រះរាជាណាចក្រកម្ពុជា ត្រូវបានបែងចែកជា ៤ ថ្នាក់ ស្របតាមទិន្នន័យផ្លូវការរបស់ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ (MEF) និងគណៈកម្មាធិការជាតិសម្រាប់ការអភិវឌ្ឍតាមបែបប្រជាធិបតេយ្យនៅថ្នាក់ក្រោមជាតិ (NCDD)៖"
                            : "Cambodia's administrative structure follows a strictly organized 4-tier tree. Sourced from the Ministry of Economy and Finance Open Data Portal and cross-referenced with NCDD codes:"}
                    </P>
                    <Table
                        head={[t("docs.thLevel"), t("docs.thKhmerTypes"), t("docs.thCode"), t("docs.thCount"), t("docs.thBoundaries")]}
                        rows={[
                            [<span key="1" className={lvl("province")}>province</span>, <span key="2" className="font-khmer">រាជធានី · ខេត្ត</span>, <C key="3">12</C>, "25", t("docs.polygons", { n: 25 })],
                            [<span key="4" className={lvl("district")}>district</span>, <span key="5" className="font-khmer">ក្រុង · ស្រុក · ខណ្ឌ</span>, <C key="6">1201</C>, "210", t("docs.polygons", { n: 197 })],
                            [<span key="7" className={lvl("commune")}>commune</span>, <span key="8" className="font-khmer">ឃុំ · សង្កាត់</span>, <C key="9">120101</C>, "1,661", t("docs.polygons", { n: "1,633" })],
                            [<span key="10" className={lvl("village")}>village</span>, <span key="11" className="font-khmer">ភូមិ</span>, <C key="12">12010101</C>, "14,576", t("docs.pointsOnly")],
                        ]}
                    />

                    <H2 id="quickstart">{t("docs.quickTitle")}</H2>
                    <P>{rt("docs.quickIntro")}</P>
                    <QuickstartTabs />
                </section>
            )}

            {post.part === 2 && (
                <section className="space-y-6">
                    <H2 id="architecture">{lang === "km" ? "ស្ថាបត្យកម្មក្នុង RAM & PIP" : "In-Memory Index & Spatial Filtering"}</H2>
                    <P>
                        {lang === "km"
                            ? "ដើម្បីសម្រេចបានល្បឿនក្រោម ១ មិល្លីវិនាទី ទិន្នន័យរដ្ឋបាលទាំងអស់ចំនួន ១៦,៤៧២ កន្លែងត្រូវបានផ្ទុកក្នុង RAM នៅពេលចាប់ផ្តើមដំណើរការ ដោយប្រើប្រាស់ O(1) Hash Map និង Bounding Box 2D៖"
                            : "All 16,472 administrative units are pre-indexed into memory at startup using O(1) hash maps and 2D bounding boxes to eliminate database connection overhead and disk latency."}
                    </P>
                    <Table
                        head={["Metric", "Traditional SQL / PostGIS", "External Geocoding SaaS", "OpenGeo Cambodia"]}
                        rows={[
                            ["Response Latency", "45ms – 120ms", "200ms – 600ms", <strong key="1" className="text-ok">&lt; 1ms (Sub-millisecond)</strong>],
                            ["Cold Starts", "1.5s – 3.0s", "N/A", <strong key="2" className="text-ok">&lt; 50ms</strong>],
                            ["Cost", "$20–$80/mo", "$5 per 1,000 reqs", <strong key="3" className="text-accent">$0 (100% Free / MIT)</strong>],
                            ["Offline / Local Dev", "Requires PostGIS", "Internet required", <strong key="4" className="text-ok">100% local, zero dependencies</strong>],
                        ]}
                    />
                </section>
            )}

            {post.part === 3 && (
                <section className="space-y-6">
                    <H2 id="cascading">{lang === "km" ? "ផ្លូវ Nesting RESTful" : "Cascading & Nested REST Routes"}</H2>
                    <P>
                        {lang === "km"
                            ? "OpenGeo Cambodia គាំទ្រទាំង Endpoint ផ្លូវកាត់ និងផ្លូវ Nesting ពេញលេញសម្រាប់ Dropdown សំណុំទិន្នន័យ៖"
                            : "OpenGeo Cambodia supports both flat shortcut endpoints and full RESTful nested resource routes with parent-child relationship validation:"}
                    </P>
                    <JsonBlock label="Nested Route Example">
{`GET /api/admin/provinces/12/districts/1202/communes/120201/villages
Response: 200 OK
[
  { "id": 12020101, "code": "12020101", "name_en": "Phum 1", "name_km": "ភូមិ១", "level": "village" }
]`}
                    </JsonBlock>
                </section>
            )}

            {post.part === 4 && (
                <section className="space-y-6">
                    <H2 id="point-in-polygon">{lang === "km" ? "ការកំណត់តំបន់តាមកូអរដោនេ" : "Sub-1ms Point-in-Polygon Engine"}</H2>
                    <P>
                        {lang === "km"
                            ? "ផ្ញើកូអរដោនេ GPS ទៅកាន់ /api/boundaries/zone ដើម្បីកំណត់ខេត្ត ស្រុក និងឃុំ ភ្លាមៗក្នុងរយៈពេលក្រោម ១ មិល្លីវិនាទី៖"
                            : "Pass raw GPS coordinates to /api/boundaries/zone to resolve containing administrative polygons in under 1 millisecond:"}
                    </P>
                    <JsonBlock label="GET /api/boundaries/zone?lat=11.57608&lng=104.92305">
{`{
  "success": true,
  "data": {
    "point": { "lat": 11.57608, "lng": 104.92305 },
    "hierarchy": {
      "province": { "id": 12, "code": "12", "name_en": "Phnom Penh", "name_km": "រាជធានីភ្នំពេញ" },
      "district": { "id": 1202, "code": "1202", "name_en": "Doun Penh", "name_km": "ខណ្ឌដូនពេញ" },
      "commune": { "id": 120201, "code": "120201", "name_en": "Phsar Thmei 1", "name_km": "សង្កាត់ផ្សារថ្មីទី១" }
    }
  },
  "meta": { "tookMs": 0.85, "source": "in_memory_rtree" }
}`}
                    </JsonBlock>
                </section>
            )}

            {post.part === 5 && (
                <section className="space-y-6">
                    <H2 id="geocoding-cascade">{lang === "km" ? "ការបំលែងទិន្នន័យបញ្ច្រាស" : "Reverse Geocode & Normalization"}</H2>
                    <P>
                        {lang === "km"
                            ? "បំលែងទិន្នន័យមិនមានទម្រង់ជាក់លាក់ពី OpenStreetMap ទៅជាទម្រង់រដ្ឋបាលផ្លូវការ ៤ ថ្នាក់របស់កម្ពុជា៖"
                            : "Normalizes raw upstream OpenStreetMap Nominatim outputs into canonical 4-tier Cambodian administrative records:"}
                    </P>
                    <Table
                        head={["Feature", "/api/geocode/reverse", "/api/boundaries/zone"]}
                        rows={[
                            ["Primary Goal", "Human-readable street address & landmark", "Administrative boundary polygon & jurisdiction"],
                            ["Response Time", "~100ms – 250ms (Upstream)", <strong key="1" className="text-ok">&lt; 1ms (In-Memory PIP)</strong>],
                            ["Output", "Street name, house number, landmark", "Canonical Province, District, Commune codes & GeoJSON"],
                            ["Ideal For", "User delivery location lookup", "Delivery zone & tax jurisdiction resolution"],
                        ]}
                    />
                </section>
            )}

            {post.part === 6 && (
                <section className="space-y-6">
                    <H2 id="code-examples">{lang === "km" ? "កូដគំរូ TypeScript, Python & Leaflet" : "Client Implementations"}</H2>
                    <P>
                        {lang === "km"
                            ? "កូដគំរូសម្រាប់បង្កើត Dropdown ជ្រើសរើសអាសយដ្ឋានដោយគ្មាន Library បន្ថែម៖"
                            : "Production-ready zero-dependency Vanilla TypeScript cascading address dropdown pattern:"}
                    </P>
                    <CodeBox head={<span className={codeTab} aria-selected="true">address-selector.ts</span>}>
{`async function populateDistricts(provinceId: number) {
  const res = await fetch(\`https://opengeo-cambodia.pphat.me/api/admin/provinces/\${provinceId}/districts\`);
  const { data: districts } = await res.json();
  districtSelect.innerHTML = '<option value="">Select District</option>';
  districts.forEach((d: any) => {
    districtSelect.innerHTML += \`<option value="\${d.id}">\${d.name_en} (\${d.name_km})</option>\`;
  });
}`}
                    </CodeBox>
                </section>
            )}

            {post.part === 7 && (
                <section className="space-y-6">
                    <H2 id="ai-context">{lang === "km" ? "ស្តង់ដារ llms.txt សម្រាប់ AI" : "llms.txt Standard for AI Agents"}</H2>
                    <P>
                        {lang === "km"
                            ? "OpenGeo Cambodia គាំទ្រស្តង់ដារ llmstxt.org ដើម្បីផ្តល់ Context ត្រឹមត្រូវដល់ Cursor, Claude និង Copilot៖"
                            : "OpenGeo Cambodia adopts the llmstxt.org standard to provide ground-truth context to autonomous coding agents:"}
                    </P>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <a
                            href="/llms.txt"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 text-left no-underline hover:border-line-2"
                        >
                            <div>
                                <strong className="font-mono text-sm text-ink">/llms.txt</strong>
                                <span className="block text-xs text-ink-3">Compact summary for LLM context windows</span>
                            </div>
                            <Icon name="copy" className="size-4 text-ink-3" />
                        </a>
                        <a
                            href="/llms-full.txt"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 text-left no-underline hover:border-line-2"
                        >
                            <div>
                                <strong className="font-mono text-sm text-ink">/llms-full.txt</strong>
                                <span className="block text-xs text-ink-3">Complete TypeScript schema and all 29 endpoints</span>
                            </div>
                            <Icon name="copy" className="size-4 text-ink-3" />
                        </a>
                    </div>
                </section>
            )}

            {/* Live Interactive Endpoint Tester Cards (if applicable) */}
            {relatedCards.length > 0 && (
                <div className="mt-12 border-t border-line pt-8">
                    <h3 className="mb-2 font-display text-lg font-bold tracking-tight text-ink km:font-khmer">
                        {lang === "km" ? "សាកល្បង Endpoint ពាក់ព័ន្ធផ្ទាល់" : "Live Endpoint Playground"}
                    </h3>
                    <p className="mb-6 text-sm text-ink-3 km:font-khmer">
                        {lang === "km"
                            ? "អ្នកអាចសាកល្បងផ្ញើសំណើទៅកាន់ Endpoint ក្នុងផ្នែកនេះដោយផ្ទាល់៖"
                            : "Test live requests for this section with custom parameters directly in your browser:"}
                    </p>
                    <div className="grid gap-6">
                        {relatedCards.map((ep) => (
                            <EndpointCard key={ep.id} ep={ep} />
                        ))}
                    </div>
                </div>
            )}

            {/* Previous and Next Chapter Navigation */}
            <div className="mt-14 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-2">
                {prevPost ? (
                    <Link
                        to={`/docs/${prevPost.category}/${prevPost.slug}`}
                        className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-left no-underline transition hover:border-line-2 hover:shadow-card"
                    >
                        <span className="flex items-center gap-1 text-xs text-ink-3">
                            <Icon name="arrow" className="rotate-180 size-3" />
                            {lang === "km" ? "មេរៀនមុន" : "Previous Chapter"}
                        </span>
                        <strong className="mt-1 text-sm text-ink group-hover:text-accent km:font-khmer">
                            Part {prevPost.part}: {lang === "km" ? prevPost.titleKm : prevPost.title}
                        </strong>
                    </Link>
                ) : (
                    <div />
                )}

                {nextPost ? (
                    <Link
                        to={`/docs/${nextPost.category}/${nextPost.slug}`}
                        className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-right no-underline transition hover:border-line-2 hover:shadow-card sm:col-start-2"
                    >
                        <span className="flex items-center justify-end gap-1 text-xs text-ink-3">
                            {lang === "km" ? "មេរៀនបន្ទាប់" : "Next Chapter"}
                            <Icon name="arrow" className="size-3" />
                        </span>
                        <strong className="mt-1 text-sm text-ink group-hover:text-accent km:font-khmer">
                            Part {nextPost.part}: {lang === "km" ? nextPost.titleKm : nextPost.title}
                        </strong>
                    </Link>
                ) : (
                    <div />
                )}
            </div>
        </article>
    );
}
export default DocPost;
