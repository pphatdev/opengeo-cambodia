import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Icon } from "../../components/Icon";
import { cx, focusRing } from "../../components/ui";
import { useI18n } from "../../i18n";
import { DOC_CATEGORIES, DOC_CHAPTERS } from "./docsData";

interface SidebarProps {
    open: boolean;
    onNavigate: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
    const { lang, t } = useI18n();
    const location = useLocation();
    const [query, setQuery] = useState("");

    const q = query.trim().toLowerCase();

    const categoriesWithLinks = useMemo(() => {
        return DOC_CATEGORIES.map((cat) => {
            const chapters = DOC_CHAPTERS.filter((c) => c.category === cat.id);
            const extraLinks =
                cat.id === "reference"
                    ? [
                          {
                              to: "/docs/reference/endpoints",
                              label: lang === "km" ? "ឧបករណ៍សាកល្បង API" : "Interactive API Explorer",
                              filter: "api explorer endpoints test interactive " + (lang === "km" ? "ឧបករណ៍សាកល្បង" : ""),
                              tag: "API",
                          },
                          {
                              to: "/docs/reference/downloads",
                              label: lang === "km" ? "ទាញយកទិន្នន័យដើម" : "Raw Data Downloads",
                              filter: "downloads raw data geojson csv " + (lang === "km" ? "ទាញយក" : ""),
                              tag: "CSV/GeoJSON",
                          },
                      ]
                    : [];

            const chapterLinks = chapters.map((c) => ({
                to: `/docs/${c.category}/${c.slug}`,
                label: `Part ${c.part}: ${lang === "km" ? c.titleKm : c.title}`,
                filter: `${c.title} ${c.titleKm} ${c.tags.join(" ")} ${cat.title} ${cat.titleKm}`.toLowerCase(),
                tag: `Part ${c.part}`,
            }));

            const allLinks = [...chapterLinks, ...extraLinks];
            const filteredLinks = allLinks.filter((l) => !q || l.filter.includes(q));

            return {
                category: cat,
                links: filteredLinks,
            };
        }).filter((group) => group.links.length > 0);
    }, [lang, q]);

    return (
        <aside
            id="sidebar"
            aria-label={t("docs.navLabel")}
            className={cx(
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
                    className={cx(
                        "h-9 w-full rounded-[9px] border border-line bg-surface pl-8 pr-2.5 text-[13.5px] text-ink km:font-khmer",
                        focusRing,
                    )}
                />
            </div>

            {categoriesWithLinks.map(({ category, links }) => (
                <div className="mb-5" key={category.id}>
                    <h6 className="mb-1.5 mt-0 pl-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-3 km:font-khmer km:text-xs km:normal-case km:tracking-normal">
                        {lang === "km" ? category.titleKm : category.title}
                    </h6>
                    <div className="grid gap-0.5">
                        {links.map((link) => {
                            const isActive =
                                location.pathname === link.to ||
                                (link.to.includes(location.pathname) && location.pathname !== "/docs");
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={onNavigate}
                                    className={cx(
                                        "flex items-center justify-between rounded-[7px] px-2.5 py-1.5 text-[13px] leading-[1.4] no-underline transition-colors km:font-khmer",
                                        isActive
                                            ? "bg-surface font-medium text-ink shadow-[inset_2px_0_0_var(--og-accent)]"
                                            : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                                    )}
                                >
                                    <span className="truncate">{link.label}</span>
                                    {link.tag && (
                                        <span className="ml-2 flex-none rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                                            {link.tag}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </aside>
    );
}
export default Sidebar;
