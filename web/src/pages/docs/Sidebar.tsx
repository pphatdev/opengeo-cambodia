import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { LangSwitch, REPO_URL } from "../../components/Nav";
import { cx, focusRing, iconBtn } from "../../components/ui";
import { useI18n, type MessageKey } from "../../i18n";
import { useTheme } from "../../lib/theme";
import { ENDPOINTS, GROUPS } from "./endpoints";

interface NavLink {
    href: string;
    label: string;
    /** Full path label, used for the tooltip and when filtering (flat list) */
    fullLabel?: string;
    verb?: boolean;
    filter: string;
    tag?: string;
    children?: NavLink[];
}

/** Small badges for endpoints worth calling out */
const ENDPOINT_TAGS: Record<string, string> = {
    "b-zone": "PIP",
};

/** Path → segments with parameter names erased, so `/provinces/{id}` matches `/provinces/{provinceId}/…` */
function shapeSegments(path: string): string[] {
    return path.split("/").filter(Boolean).map((s) => (/^\{.+\}$/.test(s) ? "{}" : s));
}

function isPrefix(prefix: string[], full: string[]): boolean {
    return prefix.length < full.length && prefix.every((s, i) => s === full[i]);
}

/**
 * Build a tree from real path structure: each endpoint nests under the closest endpoint whose path is a
 * prefix of its own. The group's common base path (e.g. `/api/boundaries`) is never used as a parent,
 * so the whole group doesn't collapse under one row. Sibling order follows the ENDPOINTS order.
 */
function buildEndpointTree(endpoints: typeof ENDPOINTS): NavLink[] {
    const shapes = endpoints.map((e) => shapeSegments(e.path));
    const rawSegs = endpoints.map((e) => e.path.split("/").filter(Boolean));

    // Longest common segment prefix across the group
    let baseLen = shapes.length ? shapes[0].length : 0;
    for (const s of shapes) {
        let i = 0;
        while (i < baseLen && i < s.length && s[i] === shapes[0][i]) i++;
        baseLen = i;
    }

    const parentOf = endpoints.map((_, i) => {
        let best = -1;
        shapes.forEach((cand, j) => {
            if (j === i || cand.length <= baseLen) return;
            if (isPrefix(cand, shapes[i]) && (best < 0 || cand.length > shapes[best].length)) best = j;
        });
        return best;
    });

    const nodes: NavLink[] = endpoints.map((e, i) => {
        const full = e.path.replace(/^\/api/, "") || e.path;
        const p = parentOf[i];
        const label = p >= 0 ? "/" + rawSegs[i].slice(rawSegs[p].length).join("/") : full;
        return {
            href: `ep-${e.id}`,
            label,
            fullLabel: full,
            verb: true,
            tag: ENDPOINT_TAGS[e.id],
            // Filter matches the path and the title in both languages
            filter: `${e.path} ${e.title.en} ${e.title.km}`.toLowerCase(),
            children: [],
        };
    });

    const roots: NavLink[] = [];
    nodes.forEach((n, i) => {
        const p = parentOf[i];
        if (p >= 0) nodes[p].children!.push(n);
        else roots.push(n);
    });
    return roots;
}

function flatten(links: NavLink[]): NavLink[] {
    return links.flatMap((l) => [{ ...l, label: l.fullLabel ?? l.label, children: [] }, ...flatten(l.children ?? [])]);
}

/** Does this subtree contain the active section? (keeps the parent highlighted path readable) */
function containsActive(link: NavLink, active: string): boolean {
    return link.href === active || (link.children ?? []).some((c) => containsActive(c, active));
}

const GUIDE: [string, MessageKey][] = [
    ["introduction", "docs.navIntro"],
    ["quickstart", "docs.navQuickstart"],
    ["concepts", "docs.navConcepts"],
    ["responses", "docs.navResponses"],
    ["rate-limits", "docs.navLimits"],
    ["best-practices", "docs.navBestPractices"],
];

const REFERENCE: [string, MessageKey][] = [
    ["model-admin", "docs.navAdminItem"],
    ["model-boundary", "docs.navBoundary"],
    ["model-geocode", "docs.navGeocode"],
    ["downloads", "docs.navDownloads"],
    ["llms", "docs.navLlms"],
    ["source", "docs.navSource"],
];

/** Nested list; children sit inside a continuous guide line, active row marks the line in accent. */
function NavTree({
    links,
    active,
    onNavigate,
    depth,
}: {
    links: NavLink[];
    active: string;
    onNavigate: () => void;
    depth: number;
}) {
    return (
        <ul
            className={cx(
                "m-0 list-none p-0",
                depth > 0 && "relative ml-3.25 border-l border-line pl-2",
            )}
        >
            {links.map((l) => {
                const isActive = active === l.href;
                const inPath = !isActive && depth === 0 && (l.children?.length ?? 0) > 0 && containsActive(l, active);
                return (
                    <li key={l.href} className="m-0 p-0">
                        <a
                            href={`#${l.href}`}
                            onClick={onNavigate}
                            title={l.fullLabel && l.fullLabel !== l.label ? l.fullLabel : undefined}
                            aria-current={isActive ? "location" : undefined}
                            className={cx(
                                "relative flex items-center gap-2 rounded-[7px] px-2.5 py-1.25 text-[13.5px] leading-[1.4] no-underline transition-colors",
                                // Child rows: an accent tick sits exactly on the parent's guide line when active
                                depth > 0 && "before:absolute before:-left-2.25 before:inset-y-1 before:w-0.5 before:rounded-full before:content-['']",
                                isActive
                                    ? cx("bg-surface font-medium text-ink", depth > 0 ? "before:bg-accent" : "shadow-[inset_2px_0_0_var(--og-accent)]")
                                    : cx("text-ink-2 hover:bg-surface-2 hover:text-ink", inPath && "text-ink"),
                            )}
                        >
                            {l.verb ? (
                                <>
                                    <span className="w-6.5 flex-none font-mono text-[9.5px] font-semibold text-ok">GET</span>
                                    <span className="min-w-0 truncate font-mono text-[12.5px]">{l.label}</span>
                                    {l.tag && (
                                        <span className="ml-auto flex-none rounded bg-surface-2 px-1.5 py-px font-mono text-[10px] text-ink-3">
                                            {l.tag}
                                        </span>
                                    )}
                                </>
                            ) : (
                                l.label
                            )}
                        </a>
                        {l.children && l.children.length > 0 && (
                            <NavTree links={l.children} active={active} onNavigate={onNavigate} depth={depth + 1} />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
    const { toggle } = useTheme();
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
                links: buildEndpointTree(ENDPOINTS.filter((e) => e.group === g.id)),
            })),
            { title: t("docs.groupReference"), links: plain(REFERENCE) },
        ];
    }, [t, tx]);

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
                // Filtering shows a flat list of full paths (tree context would hide why something matched)
                const links = q ? flatten(g.links).filter((l) => l.filter.includes(q)) : g.links;
                if (!links.length) return null;
                return (
                    <div className="mb-5" key={g.title}>
                        <h6 className="mb-1.5 mt-0 pl-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-3 km:font-khmer km:text-xs km:normal-case km:tracking-normal">{g.title}</h6>
                        <NavTree links={links} active={active} onNavigate={onNavigate} depth={0} />
                    </div>
                );
            })}
            {/* Quick utilities on mobile drawer */}
            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 lg:hidden">
                <Link to="/docs" onClick={onNavigate} className="text-xs font-semibold text-accent no-underline">
                    Docs
                </Link>
                <div className="flex items-center gap-1.5">
                    <LangSwitch />
                    <a href={REPO_URL} className={iconBtn} aria-label={t("nav.github")} target="_blank" rel="noopener noreferrer">
                        <Icon name="github" />
                    </a>
                    <button className={iconBtn} type="button" aria-label={t("nav.theme")} onClick={toggle}>
                        <Icon name="moon" className="dark:hidden" />
                        <Icon name="sun" className="hidden dark:block" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
