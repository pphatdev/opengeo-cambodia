import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { Nav, REPO_URL } from "../../components/Nav";
import { codeCopy, codeTab, cx, docsH1, kicker, lvl } from "../../components/ui";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { COMMENT, highlightCode, highlightJson } from "../../lib/highlight";
import { useToast } from "../../lib/toast";
import { EndpointCard } from "./EndpointCard";
import { ENDPOINTS, GROUPS } from "./endpoints";
import { C, Callout, CodeBox, H2, P, T, Table } from "./parts";
import { Sidebar } from "./Sidebar";

// Code samples stay in English: they're meant to be copied into real projects.
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

/** curl lines contain bare URLs; only treat whole-line `#` as comments. */
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
            head={<>
                {(Object.keys(QUICKSTART) as (keyof typeof QUICKSTART)[]).map((k) => (
                    <button key={k} className={codeTab} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{QS_LABELS[k]}</button>
                ))}
                <button className={codeCopy} type="button" onClick={() => copy(QUICKSTART[tab])}><Icon name="copy" />{t("common.copy")}</button>
            </>}
        >
            {tab === "curl" ? highlightShell(QUICKSTART.curl) : highlightCode(QUICKSTART[tab])}
        </CodeBox>
    );
}

const JsonBlock = ({ label, children }: { label: string; children: string }) => (
    <CodeBox head={<span className={codeTab} aria-selected="true">{label}</span>}>{highlightJson(children)}</CodeBox>
);

const fact = "rounded-xl border border-line bg-surface p-4 [&_b]:mb-0.5 [&_b]:block [&_b]:text-sm [&_span]:text-[13px] [&_span]:text-ink-3";

export default function Docs() {
    const { copy } = useToast();
    const { t, rt, tx } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        document.title = t("meta.docsTitle");
    }, [t]);

    const isLocal = typeof location !== "undefined" && location.origin !== PROD_ORIGIN;
    const fieldHead = [t("docs.thField"), t("docs.thType"), t("docs.thDescription")];

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

    return (
        <div className="leading-[1.7]">
            <Nav variant="docs" menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
            <div className="mx-auto grid max-w-340 grid-cols-[minmax(0,1fr)] gap-0 px-6 max-sm:px-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
                <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
                <main className="min-w-0 max-w-220 pb-30 pt-8 lg:pt-12 [&>section]:pb-7">
                    <section id="introduction">
                        <div className={kicker}>{t("docs.kicker")}</div>
                        <h1 className={docsH1}>{t("docs.titleA")} <em>{t("docs.titleB")}</em></h1>
                        <p className="mb-7 mt-0 max-w-[40em] text-lg text-ink-2">{t("docs.lede")}</p>
                        <div className="mb-4.5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3 km:font-khmer km:normal-case km:tracking-normal">{t("docs.baseUrl")}</span>
                            <code className="font-mono text-sm">{PROD_ORIGIN}</code>
                            <button
                                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 py-1.25 text-[12.5px] font-medium text-ink-2 hover:text-ink km:font-khmer [&_svg]:size-3.25"
                                type="button"
                                onClick={() => copy(PROD_ORIGIN)}
                            >
                                <Icon name="copy" />{t("common.copy")}
                            </button>
                            {isLocal && <span className="rich basis-full text-[12.5px] text-ink-3">{rt("docs.localNote", { origin: location.origin })}</span>}
                        </div>
                        <div className="mb-2.5 mt-5.5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                            <div className={fact}><b>{t("docs.factAuthTitle")}</b><span>{t("docs.factAuthBody")}</span></div>
                            <div className={fact}><b>{t("docs.factJsonTitle")}</b><span>{t("docs.factJsonBody")}</span></div>
                            <div className={cx(fact, "rich")}><b>{t("docs.factReadTitle")}</b><span>{rt("docs.factReadBody")}</span></div>
                        </div>
                        <Callout icon="info" tone="info">{rt("docs.tryCallout")}</Callout>
                    </section>

                    <section id="quickstart">
                        <H2 id="quickstart-h">{t("docs.quickTitle")}</H2>
                        <P>{rt("docs.quickIntro")}</P>
                        <QuickstartTabs />
                        <P>{rt("docs.quickOutro")}</P>
                    </section>

                    <section id="concepts">
                        <H2 id="concepts-h">{t("docs.conceptsTitle")}</H2>
                        <P>{rt("docs.conceptsIntro")}</P>
                        <div className="mb-2 mt-4.5 flex flex-wrap font-mono text-[28px] font-medium" aria-label={t("docs.anatomyLabel")}>
                            {([["12", "province", "border-accent"], ["01", "district", "border-water"], ["01", "commune", "border-warn"], ["01", "village", "border-ok"]] as const).map(([digits, level, color]) => (
                                <span key={level} className={cx("border-b-[3px] px-3 pb-1 pt-2 text-center", color)}>
                                    {digits}
                                    <small className="mt-1 block font-sans text-[11px] font-medium text-ink-3 km:font-khmer">{t(`level.${level}`)}</small>
                                </span>
                            ))}
                        </div>
                        <Table
                            head={[t("docs.thLevel"), t("docs.thKhmerTypes"), t("docs.thCode"), t("docs.thCount"), t("docs.thBoundaries")]}
                            rows={[
                                [<span className={lvl("province")}>province</span>, <span className="font-khmer">រាជធានី · ខេត្ត</span>, <C>12</C>, "25", t("docs.polygons", { n: 25 })],
                                [<span className={lvl("district")}>district</span>, <span className="font-khmer">ក្រុង · ស្រុក · ខណ្ឌ</span>, <C>1201</C>, "210", t("docs.polygons", { n: 197 })],
                                [<span className={lvl("commune")}>commune</span>, <span className="font-khmer">ឃុំ · សង្កាត់</span>, <C>120101</C>, "1,661", t("docs.polygons", { n: "1,633" })],
                                [<span className={lvl("village")}>village</span>, <span className="font-khmer">ភូមិ</span>, <C>12010101</C>, "14,576", t("docs.pointsOnly")],
                            ]}
                        />
                        <Callout icon="alert" tone="accent">{rt("docs.boundaryGap")}</Callout>
                    </section>

                    <section id="responses">
                        <H2 id="responses-h">{t("docs.responsesTitle")}</H2>
                        <P>{rt("docs.responsesIntro")}</P>
                        <JsonBlock label="200 OK">{`{
  "success": true,
  "data": [ /* records */ ],
  "meta": { "total": 1, "source": "local_cache" }   // search & list endpoints
}`}</JsonBlock>
                        <JsonBlock label="4xx / 5xx">{`{
  "success": false,
  "data": null,
  "error": "Item not found"
}`}</JsonBlock>
                        <Table
                            head={[t("docs.thStatus"), t("docs.thMeaning")]}
                            rows={[
                                [<C>200</C>, t("docs.s200")],
                                [<C>400</C>, rt("docs.s400")],
                                [<C>404</C>, t("docs.s404")],
                                [<C>405</C>, t("docs.s405")],
                                [<C>429</C>, rt("docs.s429")],
                                [<C>502</C>, t("docs.s502")],
                            ]}
                        />
                    </section>

                    <section id="rate-limits">
                        <H2 id="rate-limits-h">{t("docs.limitsTitle")}</H2>
                        <P>{t("docs.limitsIntro")}</P>
                        <Table
                            head={[t("docs.thEndpoints"), t("docs.thLimit"), t("docs.thWhy")]}
                            rows={[
                                [<><C>/api/admin/*</C>, <C>/api/boundaries/*</C></>, rt("docs.perMin", { n: "10,000" }), t("docs.whyAdmin")],
                                [<C>/api/admin/search</C>, rt("docs.perMin", { n: "120" }), t("docs.whySearch")],
                                [<C>/api/geocode/*</C>, rt("docs.perMin", { n: "30" }), t("docs.whyGeocode")],
                                [rt("docs.otherApi"), rt("docs.perMin", { n: "5,000" }), t("docs.whyOther")],
                            ]}
                        />
                        <Table
                            head={[t("docs.thHeader"), t("docs.thDescription")]}
                            rows={[
                                [<C>X-RateLimit-Limit</C>, t("docs.hLimit")],
                                [<C>X-RateLimit-Remaining</C>, t("docs.hRemaining")],
                                [<C>X-RateLimit-Reset</C>, t("docs.hReset")],
                                [<C>X-Response-Time</C>, rt("docs.hTime")],
                                [<><C>Cache-Control</C> / <C>ETag</C></>, rt("docs.hCache")],
                            ]}
                        />
                        <P>{t("docs.limitsOutro")}</P>
                    </section>

                    {GROUPS.map((g) => (
                        <section key={g.id} id={g.id}>
                            <H2 id={`${g.id}-h`}>{tx(g.title)}</H2>
                            <P>{tx(g.intro)}</P>
                            {ENDPOINTS.filter((e) => e.group === g.id).map((ep) => <EndpointCard key={ep.id} ep={ep} />)}
                        </section>
                    ))}

                    <section id="model-admin">
                        <H2 id="model-admin-h">AdminItem</H2>
                        <P>{rt("docs.adminItemIntro")}</P>
                        <Table
                            head={fieldHead}
                            rows={[
                                [<C>id</C>, <T>number</T>, t("docs.fId")],
                                [<C>code</C>, <T>string</T>, t("docs.fCode")],
                                [<C>name</C>, <T>string</T>, rt("docs.fName")],
                                [<C>name_en</C>, <T>string</T>, rt("docs.fNameEn")],
                                [<C>name_km</C>, <T>string</T>, rt("docs.fNameKm")],
                                [<C>level</C>, <T>"province" | "district" | "commune" | "village"</T>, t("docs.fLevel")],
                                [<C>typeKm</C>, <T>string</T>, rt("docs.fTypeKm")],
                                [<C>parentId</C>, <T>number?</T>, t("docs.fParentId")],
                                [<><C>lat</C>, <C>lon</C></>, <T>number?</T>, t("docs.fLatLon")],
                            ]}
                        />
                        <P>{rt("docs.internalFields")}</P>
                    </section>

                    <section id="model-boundary">
                        <H2 id="model-boundary-h">{t("docs.navBoundary")}</H2>
                        <P>{rt("docs.boundaryIntro")}</P>
                        <Table
                            head={fieldHead}
                            rows={[
                                [<><C>code</C>, <C>pcode</C></>, <T>string</T>, rt("docs.bCode")],
                                [<><C>name_en</C>, <C>name_km</C>, <C>type_km</C></>, <T>string</T>, t("docs.bNames")],
                                [<C>level</C>, <T>string</T>, rt("docs.bLevel")],
                                [<><C>province_code</C>, <C>province_name_en</C>, <C>province_name_km</C></>, <T>string</T>, t("docs.bProvince")],
                                [<><C>district_code</C>, <C>district_name_en</C>, <C>district_name_km</C></>, <T>string?</T>, t("docs.bDistrict")],
                                [<><C>lat</C>, <C>lon</C></>, <T>number</T>, t("docs.bLatLon")],
                                [<C>bbox</C>, <T>[minLon, minLat, maxLon, maxLat]</T>, t("docs.bBbox")],
                                [<><C>shape_length</C>, <C>shape_area</C></>, <T>number</T>, t("docs.bShape")],
                            ]}
                        />
                    </section>

                    <section id="model-geocode">
                        <H2 id="model-geocode-h">GeocodeResult</H2>
                        <Table
                            head={fieldHead}
                            rows={[
                                [<C>displayName</C>, <T>string</T>, t("docs.gDisplay")],
                                [<><C>lat</C>, <C>lon</C></>, <T>number</T>, t("docs.gLatLon")],
                                [<C>hierarchy</C>, <T>object</T>, rt("docs.gHierarchy")],
                                [<><C>osmId</C>, <C>osmType</C></>, <T>number, string</T>, t("docs.gOsm")],
                                [<><C>type</C>, <C>importance</C></>, <T>string, number</T>, t("docs.gType")],
                                [<C>rawAddress</C>, <T>object</T>, t("docs.gRaw")],
                            ]}
                        />
                    </section>

                    <section id="downloads">
                        <H2 id="downloads-h">{t("docs.downloadsTitle")}</H2>
                        <P>{t("docs.downloadsIntro")}</P>
                        <div className="my-3.5 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                            {downloads.map((d) => (
                                <a className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-ink no-underline hover:border-line-2" href={d.href} download key={d.href}>
                                    <span className={cx("grid size-10 flex-none place-items-center rounded-[9px] text-center font-mono text-[10px] font-semibold uppercase leading-[1.1]", d.csv ? "bg-ok/15 text-ok" : "bg-water-soft text-water")}>
                                        {d.csv ? "csv" : "geo json"}
                                    </span>
                                    <div>
                                        <b className="block font-mono text-[13.5px] font-semibold">{d.name}</b>
                                        <span className="text-[12.5px] text-ink-3">{d.sub}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>

                    <section id="llms">
                        <H2 id="llms-h">{t("docs.llmsTitle")}</H2>
                        <ul className="rich mb-3.5 mt-0 pl-5 text-ink-2 [&_li]:mb-1">
                            <li><a href="/llms.txt"><C>/llms.txt</C></a>: {t("docs.llmsShort")}</li>
                            <li><a href="/llms-full.txt"><C>/llms-full.txt</C></a>: {t("docs.llmsFull")}</li>
                            <li><a href="/opengeo-cambodia.postman_collection.json"><C>Postman collection</C></a>: {t("docs.llmsPostman")}</li>
                            <li><a href="/api/info"><C>/api/info</C></a>: {t("docs.llmsInfo")}</li>
                        </ul>
                    </section>

                    <section id="source">
                        <H2 id="source-h">{t("docs.sourceTitle")}</H2>
                        <P>{rt("docs.sourceBody")}</P>
                        <P>{rt("docs.licenseBody", { issues: `${REPO_URL}/issues` })}</P>
                        <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-[13.5px] text-ink-3">
                            <span>OpenGeo Cambodia · <span className="font-khmer">ទិន្នន័យភូមិសាស្ត្រកម្ពុជា</span></span>
                            <Link className="text-ink-2" to="/">{t("docs.backToExplorer")}</Link>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
