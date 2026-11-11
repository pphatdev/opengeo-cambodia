import { Link } from "react-router";
import { Icon, type IconName } from "../../components/Icon";
import { Parallax, Reveal } from "../../components/Parallax";
import { PostmanRunButton } from "../../components/PostmanRunButton";
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
            <Reveal from="left">
                <div className={kicker}>{k}</div>
                <h2 className={sectionH2}>{title}</h2>
            </Reveal>
            <Reveal as="p" delay={120} className="m-0 max-w-[30em] text-ink-2">{intro}</Reveal>
        </div>
    );
}

/**
 * Dark-mode section edge: a luminous gradient hairline + soft bloom instead of a flat grey border.
 * Renders nothing visible in light mode.
 */
export function GlowEdge({ position = "top", tone = "accent" }: { position?: "top" | "bottom"; tone?: "accent" | "water" }) {
    const via = tone === "water" ? "via-water/70" : "via-accent/70";
    const bloom = tone === "water" ? "bg-water/25" : "bg-accent/25";
    return (
        <div aria-hidden="true" className={cx("pointer-events-none absolute inset-x-0 z-1 hidden dark:block", position === "top" ? "top-0" : "bottom-0")}>
            <div className={cx("h-px w-full bg-linear-to-r from-transparent to-transparent", via)} />
            <div className={cx("absolute left-1/2 h-10 w-2/3 -translate-x-1/2 rounded-full blur-2xl", bloom, position === "top" ? "-top-5" : "-bottom-5")} />
        </div>
    );
}

/** Level → colour token classes for the dark-mode card glows */
const LEVEL_GLOW: Record<string, { line: string; bloom: string }> = {
    province: { line: "via-accent", bloom: "bg-accent" },
    district: { line: "via-water", bloom: "bg-water" },
    commune: { line: "via-warn", bloom: "bg-warn" },
    village: { line: "via-ok", bloom: "bg-ok" },
};

/* Section bands: alternating grounds give the page rhythm. */
const pad = "py-20 sm:py-24";
const section = pad;
/** Dark navy band, whichever theme the page is in (scheme-dark swaps the tokens for everything inside). */
// In dark mode the band would match the page, so it drops to a deeper midnight and swaps borders for GlowEdge
const navyBand = cx("scheme-dark relative overflow-hidden border-y border-line bg-bg dark:border-transparent dark:bg-[#03060d]", pad);
/** Soft wash band. Dark: a vertical midnight-blue wash instead of the (near invisible) diagonal tint. */
const washBand = cx(
    "relative border-y border-line bg-[linear-gradient(135deg,var(--og-water-soft),var(--og-bg)_45%,var(--og-accent-soft))]",
    "dark:border-transparent dark:bg-[linear-gradient(180deg,var(--og-bg),#0a1426_45%,#08121f_70%,var(--og-bg))]",
    pad,
);

/** Soft cyan & mint light pools for the dark band. */
function Glows() {
    return (
        <>
            <Parallax speed={0.3} className="bg-dot-grid pointer-events-none absolute -inset-y-40 inset-x-0 opacity-40" aria-hidden="true" />
            <Parallax speed={0.5} x={0.03} className="pointer-events-none absolute -left-40 -top-40" aria-hidden="true">
                <div className="size-130 rounded-full bg-water/10 blur-3xl" />
            </Parallax>
            <Parallax speed={-0.25} className="pointer-events-none absolute -bottom-48 -right-32" aria-hidden="true">
                <div className="size-140 rounded-full bg-accent/10 blur-3xl dark:bg-accent/15" />
            </Parallax>
            {/* Dark mode: aurora spotlight from the top edge + vignette so the band reads as its own space */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,color-mix(in_srgb,var(--og-accent)_13%,transparent),transparent_70%)] dark:block" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,.45))] dark:block" />
            <GlowEdge position="top" />
            <GlowEdge position="bottom" tone="water" />
        </>
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
                    {HIER.map((h, i) => (
                        // The connector line between cards only makes sense on the 4-column row
                        <Reveal
                            key={h.level}
                            delay={i * 110}
                            className="relative rounded-2xl lg:not-last:after:absolute lg:not-last:after:-right-3.75 lg:not-last:after:top-1/2 lg:not-last:after:h-px lg:not-last:after:w-3.75 lg:not-last:after:bg-line-2 lg:not-last:after:content-['']"
                        >
                            <div className="group/card relative isolate h-full overflow-hidden rounded-2xl glass-card p-5 dark:bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.01))]">
                                {/* Dark mode: level-coloured top rim + bloom that intensifies on hover */}
                                <span aria-hidden="true" className={cx("absolute inset-x-4 top-0 -z-1 hidden h-px bg-linear-to-r from-transparent to-transparent dark:block", LEVEL_GLOW[h.level].line)} />
                                <span aria-hidden="true" className={cx("absolute -top-10 left-1/2 -z-1 hidden size-28 -translate-x-1/2 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover/card:opacity-50 dark:block", LEVEL_GLOW[h.level].bloom)} />
                                <span className={cx(lvl(h.level), "mb-3.5")}>{t(`level.${h.level}`)}</span>
                                <span className="block font-khmer text-[17px] font-semibold">{h.km}</span>
                                <span className="text-[13.5px] text-ink-2">{h.en}</span>
                                <div className="mt-3.5 font-mono text-[12.5px] text-ink-3">{t("data.code")} <b className="font-medium text-ink">{h.bold}</b>{h.rest}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
                <Reveal delay={120} className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl glass-panel bg-line/30 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((f, i) => (
                        <Reveal key={f.n} delay={180 + i * 70} className="flex">
                            <div className="group/feat glass-panel w-full p-7 transition-colors duration-300 dark:bg-[#060a14]/80 dark:hover:bg-[#0a1120]/90">
                                <div className="mb-4.5 grid size-9.5 place-items-center rounded-xl glass-pill text-accent transition-shadow duration-300 [&_svg]:size-4.75 dark:bg-accent-soft dark:shadow-[0_0_0_1px_color-mix(in_srgb,var(--og-accent)_30%,transparent),0_0_22px_-6px_var(--og-accent)] dark:group-hover/feat:shadow-[0_0_0_1px_color-mix(in_srgb,var(--og-accent)_55%,transparent),0_0_30px_-4px_var(--og-accent)]"><Icon name={f.icon} /></div>
                                <h3 className="mb-1.5 mt-0 text-base font-semibold tracking-[-.01em]">{t(`data.f${f.n}Title` as MessageKey)}</h3>
                                <p className="rich m-0 text-sm text-ink-2">{rt(`data.f${f.n}Body` as MessageKey)}</p>
                            </div>
                        </Reveal>
                    ))}
                </Reveal>
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
        <section className={cx(section, "relative overflow-hidden")}>
            <Parallax speed={0.35} className="pointer-events-none absolute -left-24 top-1/3" aria-hidden="true">
                <div className="size-96 rounded-full bg-water/10 blur-[90px] dark:bg-water/15" />
            </Parallax>
            {/* Dark mode: faint blueprint grid fading out from behind the code panel */}
            <Parallax
                speed={0.15}
                className="pointer-events-none absolute -inset-y-24 inset-x-0 hidden bg-[linear-gradient(var(--og-line)_1px,transparent_1px),linear-gradient(90deg,var(--og-line)_1px,transparent_1px)] bg-size-[56px_56px] mask-[radial-gradient(ellipse_55%_60%_at_72%_50%,#000_10%,transparent_75%)] dark:block"
                aria-hidden="true"
            />
            <div className={cx(wrap, "relative grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[1fr_1.15fr]")}>
                <Reveal from="left" className="min-w-0">
                    <div className={kicker}>{t("quick.kicker")}</div>
                    <h2 className={sectionH2}>{t("quick.title")}</h2>
                    <ol className="mt-7 grid list-none gap-4.5 p-0">
                        {([1, 2, 3] as const).map((n) => (
                            <li key={n} className="grid grid-cols-[32px_1fr] gap-3.5">
                                <span className="grid size-8 place-items-center rounded-full border border-line-2 font-mono text-[13px] font-medium text-ink-2 dark:border-accent/40 dark:bg-accent-soft dark:text-accent dark:shadow-[0_0_18px_-4px_var(--og-accent)]">{n}</span>
                                <div>
                                    <h4 className="mb-0.5 mt-1 text-[15px] font-semibold">{t(`quick.s${n}Title`)}</h4>
                                    <p className="rich m-0 text-sm text-ink-2">{rt(`quick.s${n}Body`)}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-7"><Link className={btnGhost} to="/docs#quickstart">{t("quick.full")} <Icon name="arrow" /></Link></div>
                </Reveal>
                {/* Code panel floats slightly ahead of the page on desktop */}
                <Parallax speed={-0.06} minWidth={1024} className="relative min-w-0">
                {/* Dark mode: brand bloom behind the panel */}
                <div aria-hidden="true" className="pointer-events-none absolute -inset-6 hidden rounded-4xl bg-[radial-gradient(ellipse_at_30%_0%,color-mix(in_srgb,var(--og-accent)_22%,transparent),transparent_60%),radial-gradient(ellipse_at_100%_100%,color-mix(in_srgb,var(--og-water)_18%,transparent),transparent_60%)] blur-xl dark:block" />
                <Reveal from="right" delay={120} className="relative min-w-0 overflow-hidden rounded-2xl border border-code-line/80 bg-code/95 text-code-ink shadow-[0_24px_50px_-16px_rgba(0,0,0,.5),inset_0_1px_1px_0_rgba(255,255,255,.08)] backdrop-blur-md dark:border-transparent dark:[background:linear-gradient(var(--og-code-bg),var(--og-code-bg))_padding-box,linear-gradient(135deg,color-mix(in_srgb,var(--og-accent)_70%,transparent),rgba(255,255,255,.06)_40%,color-mix(in_srgb,var(--og-water)_60%,transparent))_border-box] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,.9)]">
                    <div className="flex items-center gap-1 border-b border-code-line px-3 py-2.5">
                        <span className={codeTab} aria-selected="true">address-form.js</span>
                        <button className={codeCopy} type="button" onClick={() => copy(QUICKSTART)}><Icon name="copy" />{t("common.copy")}</button>
                    </div>
                    <pre className={cx(codePre, "px-4.5 py-4")}>{highlightCode(QUICKSTART)}</pre>
                </Reveal>
                </Parallax>
            </div>
        </section>
    );
}

const EXT_STYLES = {
    geo: "bg-water-soft text-water border border-water/20 dark:shadow-[0_0_20px_-6px_var(--og-water)]",
    csv: "bg-ok/15 text-ok border border-ok/20 dark:shadow-[0_0_20px_-6px_var(--og-ok)]",
    json: "bg-accent-soft text-accent border border-accent/20 dark:shadow-[0_0_20px_-6px_var(--og-accent)]",
} as const;

/** Dark mode: card hover rim + glow tinted by file type */
const EXT_HOVER = {
    geo: "dark:hover:border-water/45 dark:hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,.8),0_0_28px_-8px_var(--og-water)]",
    csv: "dark:hover:border-ok/45 dark:hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,.8),0_0_28px_-8px_var(--og-ok)]",
    json: "dark:hover:border-accent/45 dark:hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,.8),0_0_28px_-8px_var(--og-accent)]",
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
        <section className={cx(washBand, "overflow-hidden")}>
            <Parallax speed={0.4} className="pointer-events-none absolute -right-24 -top-16" aria-hidden="true">
                <div className="size-100 rounded-full bg-accent/10 blur-[90px]" />
            </Parallax>
            <Parallax speed={-0.2} className="pointer-events-none absolute -bottom-24 left-10" aria-hidden="true">
                <div className="size-80 rounded-full bg-water/10 blur-[80px]" />
            </Parallax>
            <GlowEdge position="top" tone="water" />
            <div className={cx(wrap, "relative")}>
                <SectionHead kicker={t("downloads.kicker")} title={t("downloads.title")} intro={t("downloads.intro")} />
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((d, i) => (
                        <Reveal key={d.href} delay={(i % 3) * 90 + Math.floor(i / 3) * 140} className="flex">
                            <a
                                className={cx(
                                    "flex w-full items-center gap-3.5 rounded-2xl glass-card px-4.5 py-4 text-ink no-underline",
                                    "dark:bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))]",
                                    EXT_HOVER[d.kind],
                                )}
                                href={d.href}
                                download
                            >
                                <span className={cx("grid size-11.5 flex-none place-items-center rounded-xl text-center font-mono text-[10.5px] font-semibold uppercase leading-[1.1] shadow-xs", EXT_STYLES[d.kind])}>{d.ext}</span>
                                <div>
                                    <b className="block text-sm font-semibold">{d.name}</b>
                                    <span className="text-[12.5px] text-ink-3">{d.sub}</span>
                                </div>
                            </a>
                        </Reveal>
                    ))}
                </div>
                <Reveal className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[13px] text-ink-3">
                    <span>{t("downloads.postmanSub")} —</span>
                    <PostmanRunButton />
                </Reveal>
            </div>
        </section>
    );
}

export function Cta() {
    const { t } = useI18n();
    return (
        // Light: inverted ink band (black, white type).
        // Dark: instead of a glaring white slab, a deep teal→midnight band lit by brand glows, with light type.
        <section className="relative overflow-hidden bg-ink py-16 text-bg sm:py-20 dark:bg-[linear-gradient(120deg,#042f2e_0%,#06131f_45%,#071a33_100%)] dark:text-ink">
            {/* Dark mode: brand light pools + top rim */}
            <Parallax speed={0.35} className="pointer-events-none absolute -left-24 -top-32 hidden dark:block" aria-hidden="true">
                <div className="size-110 rounded-full bg-accent/25 blur-[100px]" />
            </Parallax>
            <Parallax speed={-0.2} className="pointer-events-none absolute -bottom-40 right-1/4 hidden dark:block" aria-hidden="true">
                <div className="size-96 rounded-full bg-water/20 blur-[100px]" />
            </Parallax>
            <GlowEdge position="top" />
            {/* Faint outline of Cambodia on the right, drifting against the band */}
            <Parallax speed={0.3} x={-0.05} minWidth={1024} className="pointer-events-none absolute -right-24 -top-1/4 h-[150%]" aria-hidden="true">
                <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-auto opacity-[0.16] dark:opacity-[0.28]">
                    {PROVINCES.map((p) => <path key={p.code} d={p.d} className="fill-none stroke-bg dark:stroke-accent" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
                </svg>
            </Parallax>
            <div className={cx(wrap, "relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]")}>
                <Reveal from="left">
                    <h2 className="mb-2.5 mt-0 font-display text-[clamp(24px,3vw,36px)] font-bold leading-[1.15] tracking-tight km:font-khmer km:tracking-normal km:text-[clamp(26px,3.2vw,36px)] km:font-semibold km:leading-[1.4]">{t("cta.title")}</h2>
                    <p className="m-0 opacity-70 dark:text-ink-2 dark:opacity-100">{t("cta.body")}</p>
                </Reveal>
                <Reveal from="right" delay={120} className="flex flex-wrap gap-3 lg:justify-end">
                    {/* Built from `btn` so colours don't conflict with the theme recipes */}
                    <Link
                        className={cx(
                            btn,
                            "bg-bg text-ink hover:opacity-90",
                            // Dark: glowing accent primary with dark type for contrast
                            "dark:bg-accent dark:font-semibold dark:text-[#04201d] dark:shadow-[0_8px_28px_-6px_var(--og-accent)] dark:hover:opacity-100 dark:hover:shadow-[0_10px_36px_-4px_var(--og-accent)]",
                        )}
                        to="/docs"
                    >
                        {t("cta.docs")} <Icon name="arrow" />
                    </Link>
                    <a
                        className={cx(
                            btn,
                            "border-bg/30 bg-transparent text-bg hover:border-bg/70",
                            "dark:border-line-2 dark:bg-white/5 dark:text-ink dark:backdrop-blur-md dark:hover:border-accent/60 dark:hover:text-accent",
                        )}
                        href="/api/info"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        /api/info
                    </a>
                </Reveal>
            </div>
        </section>
    );
}
