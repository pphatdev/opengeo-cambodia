import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { cx, focusRing } from "../../components/ui";
import { useI18n, type MessageKey } from "../../i18n";
import { ENDPOINTS, GROUPS } from "./endpoints";

interface NavLink {
    href: string;
    label: string;
    verb?: boolean;
    filter: string;
    depth?: number;
    tag?: string;
}

const ENDPOINT_NESTING: Record<string, { depth: number; shortLabel?: string; tag?: string }> = {
    // Admin hierarchy: Provinces -> Districts -> Communes -> Villages
    "admin-districts": { depth: 1, shortLabel: "/{id}/districts" },
    "admin-communes": { depth: 2, shortLabel: "/{id}/communes" },
    "admin-villages": { depth: 3, shortLabel: "/{id}/villages" },
    "admin-nested-communes": { depth: 1, shortLabel: "/{pId}/districts/{dId}/communes", tag: "nested" },

    // Boundaries hierarchy
    "b-zone": { depth: 0, tag: "PIP" },
    "b-province": { depth: 1, shortLabel: "/{code}" },
    "b-district": { depth: 1, shortLabel: "/{code}" },
    "b-commune": { depth: 1, shortLabel: "/{code}" },
};

const GUIDE: [string, MessageKey][] = [
    ["introduction", "docs.navIntro"],
    ["quickstart", "docs.navQuickstart"],
    ["concepts", "docs.navConcepts"],
    ["responses", "docs.navResponses"],
    ["rate-limits", "docs.navLimits"],
];

const REFERENCE: [string, MessageKey][] = [
    ["model-admin", "docs.navAdminItem"],
    ["model-boundary", "docs.navBoundary"],
    ["model-geocode", "docs.navGeocode"],
    ["downloads", "docs.navDownloads"],
    ["llms", "docs.navLlms"],
    ["source", "docs.navSource"],
];

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
    const { t, tx } = useI18n();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState("introduction");
    const q = query.trim().toLowerCase();

    const groups = useMemo(() => {
        const plain = (items: [string, MessageKey][]): NavLink[] =>
            items.map(([href, key]) => {
                const label = t(key);
                return { href, label, filter: label.toLowerCase() };
            });
        return [
            { title: t("docs.groupGuide"), links: plain(GUIDE) },
            ...GROUPS.map((g) => ({
                title: tx(g.title),
                links: ENDPOINTS.filter((e) => e.group === g.id).map((e) => {
                    const nesting = ENDPOINT_NESTING[e.id];
                    const depth = nesting?.depth ?? 0;
                    const defaultLabel = e.path.replace(/^\/api/, "");
                    const label = !q && nesting?.shortLabel ? nesting.shortLabel : defaultLabel;
                    return {
                        href: `ep-${e.id}`,
                        label,
                        verb: true,
                        depth,
                        tag: nesting?.tag,
                        // Filter matches the path and the title in both languages
                        filter: `${e.path} ${e.title.en} ${e.title.km}`.toLowerCase(),
                    };
                }),
            })),
            { title: t("docs.groupReference"), links: plain(REFERENCE) },
        ];
    }, [t, tx, q]);

    // Scrollspy: highlight the first visible section (ids don't change with language)
    useEffect(() => {
        const ids = [...GUIDE.map((g) => g[0]), ...ENDPOINTS.map((e) => `ep-${e.id}`), ...REFERENCE.map((r) => r[0])];
        const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
        const visible = new Map<string, boolean>();
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
                const first = els.find((el) => visible.get(el.id));
                if (first) setActive(first.id);
            },
            { rootMargin: "-80px 0px -65% 0px" },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    return (
        <aside
            id="sidebar"
            aria-label={t("docs.navLabel")}
            className={cx(
                // Off-canvas drawer below lg; sticky column from lg up
                "scrollbar-thin fixed bottom-0 left-0 top-16 z-90 w-[min(320px,86vw)] overflow-y-auto border-r border-line bg-bg px-4 py-5 transition-transform",
                "lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-64px)] lg:w-auto lg:translate-x-0 lg:border-r-0 lg:bg-transparent lg:py-7 lg:pl-0 lg:pr-2",
                open ? "translate-x-0 shadow-card" : "translate-x-[-105%]",
            )}
        >
            <div className="relative mb-4.5">
                <Icon name="search" className="absolute left-2.5 top-2.5 size-3.75 text-ink-3" />
                <input
                    type="search"
                    placeholder={t("docs.filter")}
                    aria-label={t("docs.filterLabel")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={cx("h-9 w-full rounded-[9px] border border-line bg-surface pl-8 pr-2.5 text-[13.5px] text-ink km:font-khmer", focusRing)}
                />
            </div>
            {groups.map((g) => {
                const links = g.links.filter((l) => !q || l.filter.includes(q));
                if (!links.length) return null;
                return (
                    <div className="mb-5" key={g.title}>
                        <h6 className="mb-1.5 mt-0 pl-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-3 km:font-khmer km:text-xs km:normal-case km:tracking-normal">{g.title}</h6>
                        {links.map((l) => {
                            const depth = l.depth ?? 0;
                            const isChild = depth > 0 && !q;
                            return (
                                <a
                                    key={l.href}
                                    href={`#${l.href}`}
                                    onClick={onNavigate}
                                    className={cx(
                                        "flex items-center gap-2 rounded-[7px] py-1.25 text-[13.5px] leading-[1.4] no-underline transition-colors",
                                        isChild
                                            ? depth === 1
                                                ? "ml-3.5 border-l border-line/80 pl-2.5 pr-2"
                                                : depth === 2
                                                ? "ml-6 border-l border-line/60 pl-2.5 pr-2"
                                                : "ml-8.5 border-l border-line/40 pl-2.5 pr-2"
                                            : "px-2.5",
                                        active === l.href
                                            ? "bg-surface font-medium text-ink shadow-[inset_2px_0_0_var(--og-accent)]"
                                            : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                                    )}
                                >
                                    {l.verb ? (
                                        <>
                                            <span className="w-6.5 flex-none font-mono text-[9.5px] font-semibold text-ok">GET</span>
                                            <span className="truncate font-mono text-[12.5px]">{l.label}</span>
                                            {l.tag && (
                                                <span className="ml-auto rounded bg-surface-2 px-1.5 py-0.25 font-mono text-[10px] text-ink-3">
                                                    {l.tag}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        l.label
                                    )}
                                </a>
                            );
                        })}
                    </div>
                );
            })}
        </aside>
    );
}
