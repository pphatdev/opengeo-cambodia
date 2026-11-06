import { Link } from "react-router";
import { Icon, type IconName } from "../../components/Icon";
import { btn, btnGhost, codeCopy, codePre, codeTab, cx, kicker, lvl, sectionH2, wrap } from "../../components/ui";
import { useI18n, type MessageKey } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { highlightCode } from "../../lib/highlight";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES } from "./cambodiaMap";
import { useToast } from "../../lib/toast";

/** Kicker + serif title on the left, a short intro on the right. */
export function SectionHead({ kicker: k, title, intro }: { kicker: string; title: string; intro: string }) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
                <div className={kicker}>{k}</div>
                <h2 className={sectionH2}>{title}</h2>
            </div>
            <p className="m-0 max-w-[30em] text-ink-2">{intro}</p>
        </div>
    );
}

/* Section bands: alternating grounds give the page rhythm. */
const pad = "py-20 sm:py-24";
const section = pad;
/** Logo navy, whichever theme the page is in (scheme-dark swaps the tokens for everything inside). */
const navyBand = cx("scheme-dark relative overflow-hidden border-y border-line bg-bg dark:bg-[#04061a]", pad);
/** Soft cyan → mint wash. */
const washBand = cx("relative border-y border-line bg-[linear-gradient(135deg,var(--og-water-soft),var(--og-bg)_45%,var(--og-accent-soft))]", pad);

/** Cyan and mint light pools for the navy band. */
function Glows() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 -top-40 size-130 rounded-full bg-[#3ec6f0]/15 blur-3xl" />
            <div className="absolute -bottom-48 -right-32 size-140 rounded-full bg-[#36e2a3]/12 blur-3xl" />
            <div className="bg-dot-grid absolute inset-0 opacity-40" />
        </div>
    );
}

const FEATURES: { icon: IconName; n: 1 | 2 | 3 | 4 | 5 | 6 }[] = [
    { icon: "layers", n: 1 },
    { icon: "polygon", n: 2 },
    { icon: "lang", n: 3 },
    { icon: "zap", n: 4 },
    { icon: "key", n: 5 },
    { icon: "bot", n: 6 },
];

const HIER = [
    { level: "province", km: "រាជធានីភ្នំពេញ", en: "Phnom Penh", bold: "12", rest: "" },
    { level: "district", km: "ខណ្ឌចំការមន", en: "Chamkar Mon", bold: "12", rest: "01" },
    { level: "commune", km: "សង្កាត់ទន្លេបាសាក់", en: "Tonle Basak", bold: "1201", rest: "01" },
    { level: "village", km: "ភូមិ ១", en: "Phum Muoy", bold: "120101", rest: "01" },
] as const;

export function DataModel() {
    const { t, rt } = useI18n();
    return (
        <section className={navyBand} id="data">
            <Glows />
            <div className={cx(wrap, "relative")}>
                <SectionHead kicker={t("data.kicker")} title={t("data.title")} intro={t("data.intro")} />
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    {HIER.map((h) => (
                        // The connector line between cards only makes sense on the 4-column row
                        <div key={h.level} className="relative rounded-[14px] border border-line bg-surface p-5 lg:not-last:after:absolute lg:not-last:after:-right-3.75 lg:not-last:after:top-1/2 lg:not-last:after:h-px lg:not-last:after:w-3.75 lg:not-last:after:bg-line-2 lg:not-last:after:content-['']">
                            <span className={cx(lvl(h.level), "mb-3.5")}>{t(`level.${h.level}`)}</span>
                            <span className="block font-khmer text-[17px] font-semibold">{h.km}</span>
                            <span className="text-[13.5px] text-ink-2">{h.en}</span>
                            <div className="mt-3.5 font-mono text-[12.5px] text-ink-3">{t("data.code")} <b className="font-medium text-ink">{h.bold}</b>{h.rest}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((f) => (
                        <div className="bg-surface p-7" key={f.n}>
                            <div className="mb-4.5 grid size-9.5 place-items-center rounded-[10px] bg-surface-2 text-accent [&_svg]:size-4.75"><Icon name={f.icon} /></div>
                            <h3 className="mb-1.5 mt-0 text-base font-semibold tracking-[-.01em]">{t(`data.f${f.n}Title` as MessageKey)}</h3>
                            <p className="rich m-0 text-sm text-ink-2">{rt(`data.f${f.n}Body` as MessageKey)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const QUICKSTART = `const API = "${PROD_ORIGIN}/api/admin";

async function load(path) {
  const { data } = await fetch(API + path).then(r => r.json());
  return data; // [{ id, code, name_en, name_km, ... }]
}

const provinces = await load("/provinces");

provinceSelect.onchange = async (e) => {
  const districts = await load(\`/provinces/\${e.target.value}/districts\`);
  fill(districtSelect, districts);
};

districtSelect.onchange = async (e) => {
  fill(communeSelect, await load(\`/districts/\${e.target.value}/communes\`));
};

function fill(select, items) {
  select.replaceChildren(...items.map(i =>
    new Option(\`\${i.name_en} · \${i.name_km}\`, i.id)));
}`;

export function Quickstart() {
    const { copy } = useToast();
    const { t, rt } = useI18n();
    return (
        <section className={section}>
            <div className={cx(wrap, "grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[1fr_1.15fr]")}>
                <div className="min-w-0">
                    <div className={kicker}>{t("quick.kicker")}</div>
                    <h2 className={sectionH2}>{t("quick.title")}</h2>
                    <ol className="mt-7 grid list-none gap-4.5 p-0">
                        {([1, 2, 3] as const).map((n) => (
                            <li key={n} className="grid grid-cols-[32px_1fr] gap-3.5">
                                <span className="grid size-8 place-items-center rounded-full border border-line-2 font-mono text-[13px] font-medium text-ink-2">{n}</span>
                                <div>
                                    <h4 className="mb-0.5 mt-1 text-[15px] font-semibold">{t(`quick.s${n}Title`)}</h4>
                                    <p className="rich m-0 text-sm text-ink-2">{rt(`quick.s${n}Body`)}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-7"><Link className={btnGhost} to="/docs#quickstart">{t("quick.full")} <Icon name="arrow" /></Link></div>
                </div>
                <div className="min-w-0 overflow-hidden rounded-[14px] border border-code-line bg-code text-code-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,.35)]">
                    <div className="flex items-center gap-1 border-b border-code-line px-3 py-2.5">
                        <span className={codeTab} aria-selected="true">address-form.js</span>
                        <button className={codeCopy} type="button" onClick={() => copy(QUICKSTART)}><Icon name="copy" />{t("common.copy")}</button>
                    </div>
                    <pre className={cx(codePre, "px-4.5 py-4")}>{highlightCode(QUICKSTART)}</pre>
                </div>
            </div>
        </section>
    );
}

const EXT_STYLES = {
    geo: "bg-water-soft text-water",
    csv: "bg-ok/15 text-ok",
    json: "bg-accent-soft text-accent",
} as const;

export function Downloads() {
    const { t } = useI18n();
    const items: { href: string; ext: string; kind: keyof typeof EXT_STYLES; name: string; sub: string }[] = [
        { href: "/api/boundaries/raw/provinces.geojson", ext: "geo json", kind: "geo", name: "province.geojson", sub: t("downloads.polygons", { n: 25 }) },
        { href: "/api/boundaries/raw/districts.geojson", ext: "geo json", kind: "geo", name: "district.geojson", sub: t("downloads.polygons", { n: 197 }) },
        { href: "/api/boundaries/raw/communes.geojson", ext: "geo json", kind: "geo", name: "commune.geojson", sub: t("downloads.polygons", { n: "1,633" }) },
        { href: "/data/CambodiaProvinceList.csv", ext: "csv", kind: "csv", name: "CambodiaProvinceList.csv", sub: t("downloads.provinceList") },
        { href: "/data/CambodiaVillagesList.csv", ext: "csv", kind: "csv", name: "CambodiaVillagesList.csv", sub: t("downloads.allVillages") },
        { href: "/opengeo-cambodia.postman_collection.json", ext: "json", kind: "json", name: t("downloads.postman"), sub: t("downloads.postmanSub") },
    ];
    return (
        <section className={washBand}>
            <div className={wrap}>
                <SectionHead kicker={t("downloads.kicker")} title={t("downloads.title")} intro={t("downloads.intro")} />
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((d) => (
                        <a
                            className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4.5 py-4 text-ink no-underline transition hover:-translate-y-px hover:border-line-2"
                            href={d.href}
                            download
                            key={d.href}
                        >
                            <span className={cx("grid size-11.5 flex-none place-items-center rounded-[10px] text-center font-mono text-[10.5px] font-semibold uppercase leading-[1.1]", EXT_STYLES[d.kind])}>{d.ext}</span>
                            <div>
                                <b className="block text-sm font-semibold">{d.name}</b>
                                <span className="text-[12.5px] text-ink-3">{d.sub}</span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function Cta() {
    const { t } = useI18n();
    return (
        // The logo's gradient as a full-bleed band, with navy type like the wordmark's ground.
        // Fixed colours (not theme tokens): the band looks the same in light and dark mode.
        <section className="relative overflow-hidden bg-[linear-gradient(120deg,#43cdf2_0%,#36e2a3_100%)] py-16 text-[#07102a] sm:py-20">
            {/* Faint outline of Cambodia on the right */}
            <svg aria-hidden="true" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="pointer-events-none absolute -right-24 top-1/2 h-[150%] -translate-y-1/2 opacity-[0.16] max-lg:hidden">
                {PROVINCES.map((p) => <path key={p.code} d={p.d} className="fill-none stroke-[#07102a]" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
            </svg>
            <div className={cx(wrap, "relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]")}>
                <div>
                    <h2 className="mb-2.5 mt-0 font-display text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.12] tracking-[-.03em] km:font-khmer km:tracking-normal km:text-[clamp(26px,3.2vw,36px)] km:font-semibold km:leading-[1.4]">{t("cta.title")}</h2>
                    <p className="m-0 text-[#07102a]/75">{t("cta.body")}</p>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                    {/* Built from `btn` so colours don't conflict with the theme recipes */}
                    <Link className={cx(btn, "bg-[#07102a] text-white shadow-[0_10px_24px_-12px_rgba(7,16,42,.6)] hover:bg-[#0c1a44]")} to="/docs">{t("cta.docs")} <Icon name="arrow" /></Link>
                    <a className={cx(btn, "border-[#07102a]/30 bg-white/25 text-[#07102a] hover:border-[#07102a]/60 hover:bg-white/40")} href="/api/info" target="_blank" rel="noopener noreferrer">/api/info</a>
                </div>
            </div>
        </section>
    );
}
