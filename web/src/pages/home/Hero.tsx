import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { btnGhost, btnPrimary, codeCopy, codePre, codeTab, cx, displayH1, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmt, forDisplay, PROD_ORIGIN } from "../../lib/api";
import { COMMENT, JsonView } from "../../lib/highlight";
import { useToast } from "../../lib/toast";
import type { AdminItem, AdminStats, ApiEnvelope, Level } from "../../lib/types";

const HERO_PATH = "/api/admin/provinces/12/districts";
const URL_FULL = PROD_ORIGIN + HERO_PATH;
const Url = ({ children }: { children: ReactNode }) => <span className="text-j-key">{children}</span>;
const Kw = ({ children }: { children: ReactNode }) => <span className="text-j-bool">{children}</span>;
const Str = ({ children }: { children: ReactNode }) => <span className="text-j-str">{children}</span>;

const SNIPPETS: Record<"curl" | "js" | "py", { label: string; text: string; view: ReactNode }> = {
    curl: {
        label: "curl",
        text: `curl ${URL_FULL}`,
        view: (<><span className="select-none text-code-faint">$ </span>curl <Url>{URL_FULL}</Url></>),
    },
    js: {
        label: "JavaScript",
        text: `const res = await fetch(\n  "${URL_FULL}"\n);\nconst { data } = await res.json();\nconsole.log(data.map(d => d.name_en));`,
        view: (<><Kw>const</Kw> res = <Kw>await</Kw> fetch({"\n  "}<Url>"{URL_FULL}"</Url>{"\n"});{"\n"}<Kw>const</Kw> {"{ data }"} = <Kw>await</Kw> res.json();{"\n"}console.log(data.map(d =&gt; d.name_en));</>),
    },
    py: {
        label: "Python",
        text: `import requests\n\nr = requests.get(\n    "${URL_FULL}"\n)\nprint([d["name_en"] for d in r.json()["data"]])`,
        view: (<><Kw>import</Kw> requests{"\n\n"}r = requests.get({"\n    "}<Url>"{URL_FULL}"</Url>{"\n"}){"\n"}print([d[<Str>"name_en"</Str>] <Kw>for</Kw> d <Kw>in</Kw> r.json()[<Str>"data"</Str>]])</>),
    },
};

// Subtitle shows the other language: full Khmer unit types in English mode, English names in Khmer mode
const STAT_ROWS: { level: Level; stat: keyof AdminStats; tier: string; km: string; en: string; fallback: number }[] = [
    { level: "province", stat: "provinces", tier: "L1", km: "រាជធានី / ខេត្ត", en: "Provinces", fallback: 25 },
    { level: "district", stat: "districts", tier: "L2", km: "ក្រុង / ស្រុក / ខណ្ឌ", en: "Districts", fallback: 210 },
    { level: "commune", stat: "communes", tier: "L3", km: "ឃុំ / សង្កាត់", en: "Communes", fallback: 1661 },
    { level: "village", stat: "villages", tier: "L4", km: "ភូមិ", en: "Villages", fallback: 14576 },
];

interface LiveResult {
    data: AdminItem[];
    server: string;
}

export function Hero() {
    const { copy } = useToast();
    const { t, rt, lang } = useI18n();
    const [tab, setTab] = useState<keyof typeof SNIPPETS>("curl");
    const [live, setLive] = useState<LiveResult | null>(null);
    const [liveError, setLiveError] = useState(false);
    const [stats, setStats] = useState<AdminStats | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        let server: string | null = null;
        apiGet<ApiEnvelope<AdminItem[]>>(HERO_PATH, (log) => (server = log.server ?? `${log.ms.toFixed(1)}ms`), ctrl.signal)
            .then((json) => setLive({ data: forDisplay(json.data) as AdminItem[], server: server ?? "—" }))
            .catch((e) => {
                if (e?.name !== "AbortError") setLiveError(true);
            });
        apiGet<ApiEnvelope<AdminStats>>("/api/admin/stats", undefined, ctrl.signal)
            .then((j) => setStats(j.data))
            .catch(() => {});
        return () => ctrl.abort();
    }, []);

    let preview = "";
    if (live) {
        preview = JSON.stringify({ success: true, data: live.data.slice(0, 2) }, null, 2);
        if (live.data.length > 2) preview = preview.replace(/\n {2}\]\n\}$/, `,\n    ${t("hero.moreDistricts", { n: live.data.length - 2 })}\n  ]\n}`);
    }

    return (
        <section className="relative overflow-hidden pb-10 pt-11 sm:pt-18">
            <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
            <div className={cx(wrap, "relative")}>
                <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-[5px] pl-1.5 pr-3 text-[13px] font-medium text-ink-2">
                            <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-accent">
                                <span className="size-[7px] rounded-full bg-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_25%,transparent)]" />
                            </span>
                            {t("hero.eyebrow")}
                        </span>
                        <h1 className={displayH1}>{t("hero.titleA")} <em>{t("hero.titleB")}</em></h1>
                        <p className="rich mb-7 mt-0 max-w-[34em] text-lg text-ink-2">{rt("hero.lede", { total: fmt(stats?.total ?? 16472) })}</p>
                        <div className="flex flex-wrap gap-3">
                            <a className={btnPrimary} href="#explore">{t("hero.explore")} <Icon name="arrow" /></a>
                            <Link className={btnGhost} to="/docs"><Icon name="book" /> {t("hero.docs")}</Link>
                        </div>
                        <div className="mt-7 flex flex-wrap gap-[18px] text-[13px] text-ink-3 [&_svg]:size-[15px] [&_svg]:text-ok">
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.noSignup")}</span>
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.cors")}</span>
                            <span className="inline-flex items-center gap-1.5"><Icon name="check" />{t("hero.edge")}</span>
                        </div>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-[14px] border border-code-line bg-code text-code-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,.35)]" aria-label={t("hero.example")}>
                        <div className="flex items-center gap-1 border-b border-code-line px-3 py-2.5" role="tablist">
                            {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((k) => (
                                <button key={k} className={codeTab} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} type="button">{SNIPPETS[k].label}</button>
                            ))}
                            <button className={codeCopy} type="button" onClick={() => copy(SNIPPETS[tab].text)}><Icon name="copy" />{t("common.copy")}</button>
                        </div>
                        <pre className={cx(codePre, "px-[18px] py-4")}>{SNIPPETS[tab].view}</pre>
                        <div className="border-t border-dashed border-code-line">
                            <pre className={cx(codePre, "max-h-[260px] px-[18px] py-4")}>
                                {live ? <JsonView value={preview} /> : <span className={COMMENT}>{liveError ? t("hero.unreachable") : t("hero.fetching")}</span>}
                            </pre>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-code-line px-[18px] py-[9px] font-mono text-xs text-code-dim">
                            <span>{live ? t("hero.status", { n: live.data.length }) : "GET · —"}</span>
                            <span>{t("hero.server")} <b className="font-medium text-j-str">{live?.server ?? "—"}</b></span>
                        </div>
                    </div>
                </div>

                <div className="relative mt-14 grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-surface lg:grid-cols-4" aria-label={t("hero.datasetSize")}>
                    {STAT_ROWS.map((s, i) => (
                        <div key={s.level} className={cx("px-6 py-[22px]", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line lg:border-t-0", i === 2 && "lg:border-l")}>
                            <span className="float-right rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-3">{s.tier}</span>
                            <div className="font-serif text-[36px] leading-none tracking-[-.02em] tabular-nums sm:text-[44px]">{fmt(Number(stats?.[s.stat] ?? s.fallback))}</div>
                            <div className="mt-2.5 text-sm font-semibold">{lang === "km" ? s.km : s.en}</div>
                            <div className={cx("text-[13px] text-ink-3", lang !== "km" && "font-khmer")}>{lang === "km" ? s.en : s.km}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
