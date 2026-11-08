import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../components/Icon";
import { cx, focusRing } from "../../components/ui";
import { useI18n } from "../../i18n";
import { GROUPS, type Endpoint, type EndpointGroup } from "../docs/endpoints";

interface EndpointSelectorProps {
    endpoints: Endpoint[];
    selected: Endpoint;
    onSelect: (endpoint: Endpoint) => void;
}

const GROUP_ICONS: Record<EndpointGroup, "layers" | "polygon" | "pin" | "zap"> = {
    admin: "layers",
    boundaries: "polygon",
    geocode: "pin",
    system: "zap",
};

function PathHighlight({ path }: { path: string }) {
    const parts = path.split(/(\{\w+\})/);
    return (
        <span className="font-mono text-[13px] font-semibold text-ink">
            {parts.map((p, i) =>
                p.startsWith("{") ? (
                    <span key={i} className="text-accent font-bold">
                        {p}
                    </span>
                ) : (
                    <Fragment key={i}>{p}</Fragment>
                ),
            )}
        </span>
    );
}

export function EndpointSelector({ endpoints, selected, onSelect }: EndpointSelectorProps) {
    const { t, tx } = useI18n();
    const autoId = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState<EndpointGroup | "all">("all");
    const [activeIndex, setActiveIndex] = useState(0);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

    // Calculate popover position
    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({
            left: rect.left,
            top: rect.bottom + 6,
            width: Math.max(rect.width, 360),
        });
    };

    useEffect(() => {
        if (!open) return;
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open]);

    // Auto-focus search input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setQuery("");
            setGroupFilter("all");
        }
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                popoverRef.current?.contains(target)
            ) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    // Filter endpoints
    const filteredEndpoints = useMemo(() => {
        const q = query.trim().toLowerCase();
        return endpoints.filter((ep) => {
            if (groupFilter !== "all" && ep.group !== groupFilter) return false;
            if (!q) return true;
            const titleEn = ep.title.en.toLowerCase();
            const titleKm = ep.title.km.toLowerCase();
            const descEn = ep.description.en.toLowerCase();
            const path = ep.path.toLowerCase();
            return (
                path.includes(q) ||
                titleEn.includes(q) ||
                titleKm.includes(q) ||
                descEn.includes(q) ||
                ep.group.toLowerCase().includes(q)
            );
        });
    }, [endpoints, query, groupFilter]);

    // Group endpoints for display
    const groupedResults = useMemo(() => {
        const groups: { group: (typeof GROUPS)[number]; items: Endpoint[] }[] = [];
        GROUPS.forEach((g) => {
            const items = filteredEndpoints.filter((ep) => ep.group === g.id);
            if (items.length > 0) {
                groups.push({ group: g, items });
            }
        });
        return groups;
    }, [filteredEndpoints]);

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredEndpoints.length));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + filteredEndpoints.length) % Math.max(1, filteredEndpoints.length));
        } else if (e.key === "Enter" && filteredEndpoints[activeIndex]) {
            e.preventDefault();
            onSelect(filteredEndpoints[activeIndex]);
            setOpen(false);
            triggerRef.current?.focus();
        }
    };

    const currentGroup = GROUPS.find((g) => g.id === selected.group);

    return (
        <div className="relative">
            <div className="mb-2 flex items-center justify-between">
                <label
                    htmlFor={autoId}
                    className="flex items-center gap-1.5 text-xs font-semibold text-ink-3 uppercase tracking-wider"
                >
                    <Icon name={GROUP_ICONS[selected.group]} className="size-3.5 text-accent" />
                    <span>{t("playground.selectEndpoint")}</span>
                </label>
                <div className="flex items-center gap-2">
                    <a
                        href={`/docs#ep-${selected.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-water hover:underline flex items-center gap-1"
                    >
                        <span>{t("nav.docs")}</span>
                        <Icon name="ext" className="size-2.5" />
                    </a>
                </div>
            </div>

            {/* Custom Interactive Trigger Card */}
            <button
                ref={triggerRef}
                id={autoId}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={cx(
                    "w-full text-left rounded-xl border border-line bg-surface p-3.5 shadow-sm transition-all cursor-pointer hover:border-line-2 hover:bg-surface-2/60",
                    open && "border-accent shadow-[0_0_0_3px_var(--og-accent-soft)]",
                    focusRing,
                )}
            >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-ok/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-ok">
                            GET
                        </span>
                        <PathHighlight path={selected.path} />
                    </div>
                    <div className="flex items-center gap-1.5">
                        {selected.geo && (
                            <span className="rounded-full border border-line bg-surface-2 px-2 py-0.2 font-mono text-[10px] text-ink-3">
                                GeoJSON
                            </span>
                        )}
                        {selected.tag && (
                            <span className="rounded-full border border-line bg-surface-2 px-2 py-0.2 font-mono text-[10px] text-ink-3">
                                {tx(selected.tag)}
                            </span>
                        )}
                        <Icon
                            name="chevrons"
                            className={cx("size-4 text-ink-3 transition-transform duration-200", open && "rotate-180")}
                        />
                    </div>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                        {tx(selected.title)}
                    </span>
                    {currentGroup && (
                        <span className="text-[11px] font-medium text-ink-3">
                            {tx(currentGroup.title)}
                        </span>
                    )}
                </div>
            </button>

            {/* Dropdown Popover */}
            {open &&
                pos &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            position: "fixed",
                            left: `${pos.left}px`,
                            top: `${pos.top}px`,
                            width: `${pos.width}px`,
                            maxWidth: "calc(100vw - 24px)",
                            zIndex: 9999,
                        }}
                        onKeyDown={handleKeyDown}
                        className="animate-fade-up overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl backdrop-blur-xl"
                    >
                        {/* Search Bar */}
                        <div className="border-b border-line p-3 bg-surface-2/40">
                            <div className="relative">
                                <Icon
                                    name="search"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3"
                                />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setActiveIndex(0);
                                    }}
                                    placeholder={t("playground.searchEndpoints")}
                                    className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => setQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-3 hover:text-ink text-xs font-mono"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Group Filter Tabs */}
                            <div className="mt-2.5 flex flex-wrap gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGroupFilter("all");
                                        setActiveIndex(0);
                                    }}
                                    className={cx(
                                        "rounded-md px-2 py-0.75 text-[11px] font-medium transition-colors cursor-pointer",
                                        groupFilter === "all"
                                            ? "bg-ink text-bg font-semibold"
                                            : "bg-surface text-ink-2 hover:text-ink border border-line",
                                    )}
                                >
                                    {t("playground.allGroups")} ({endpoints.length})
                                </button>
                                {GROUPS.map((g) => {
                                    const count = endpoints.filter((e) => e.group === g.id).length;
                                    const isSelected = groupFilter === g.id;
                                    return (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => {
                                                setGroupFilter(g.id);
                                                setActiveIndex(0);
                                            }}
                                            className={cx(
                                                "rounded-md px-2 py-0.75 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1",
                                                isSelected
                                                    ? "bg-ink text-bg font-semibold"
                                                    : "bg-surface text-ink-2 hover:text-ink border border-line",
                                            )}
                                        >
                                            <Icon name={GROUP_ICONS[g.id]} className="size-2.5" />
                                            <span>{tx(g.title)}</span>
                                            <span className="opacity-70">({count})</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Endpoints List */}
                        <div
                            ref={listRef}
                            role="listbox"
                            className="max-h-90 overflow-y-auto p-2 space-y-3 divide-y divide-line/40 scrollbar-thin"
                        >
                            {groupedResults.length === 0 ? (
                                <div className="py-8 text-center text-xs text-ink-3">
                                    No endpoints match "{query}".
                                </div>
                            ) : (
                                groupedResults.map(({ group, items }) => (
                                    <div key={group.id} className="pt-2 first:pt-0">
                                        {/* Group Heading */}
                                        <div className="mb-1.5 px-2.5 flex items-center justify-between text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5">
                                                <Icon name={GROUP_ICONS[group.id]} className="size-3 text-accent" />
                                                <span>{tx(group.title)}</span>
                                            </span>
                                            <span className="font-mono text-[10px] opacity-75">{items.length} routes</span>
                                        </div>

                                        <div className="space-y-1">
                                            {items.map((ep) => {
                                                const isSelected = ep.id === selected.id;
                                                return (
                                                    <div
                                                        key={ep.id}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        onClick={() => {
                                                            onSelect(ep);
                                                            setOpen(false);
                                                            triggerRef.current?.focus();
                                                        }}
                                                        className={cx(
                                                            "w-full text-left rounded-lg p-2.5 transition-colors cursor-pointer flex items-start justify-between gap-3",
                                                            isSelected
                                                                ? "bg-accent-soft/70 border border-accent/30 text-ink"
                                                                : "hover:bg-surface-2 text-ink-2 hover:text-ink",
                                                        )}
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="rounded bg-ok/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-ok">
                                                                    GET
                                                                </span>
                                                                <PathHighlight path={ep.path} />
                                                            </div>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-xs font-semibold text-ink">
                                                                    {tx(ep.title)}
                                                                </span>
                                                                {ep.title.km && (
                                                                    <span className="font-khmer text-[11px] text-ink-3">
                                                                        ({tx(ep.title)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="m-0 mt-0.5 text-[11px] text-ink-3 line-clamp-1">
                                                                {tx(ep.description)}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                                            {ep.geo && (
                                                                <span className="rounded bg-water-soft px-1.5 py-0.2 font-mono text-[9.5px] font-medium text-water">
                                                                    GeoJSON
                                                                </span>
                                                            )}
                                                            {isSelected && (
                                                                <Icon name="check" className="size-4 text-accent" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
