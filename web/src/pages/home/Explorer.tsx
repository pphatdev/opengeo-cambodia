import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Combobox } from "../../components/Combobox";
import { Icon } from "../../components/Icon";
import { cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import { ApiError, apiGet, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { LEVEL_KM, LEVELS, type AdminItem, type ApiEnvelope, type BoundaryLevel, type HierarchyPath, type Level } from "../../lib/types";
import { DetailCard } from "./DetailCard";
import { SELECT_PROVINCE_EVENT } from "./HeroMap";
import { RequestConsole } from "./RequestConsole";
import { SearchBox } from "./SearchBox";

// Leaflet is ~150 KB; load it only when the explorer is about to scroll into view
const ExplorerMap = lazy(() => import("./ExplorerMap").then((m) => ({ default: m.ExplorerMap })));

export interface MapTarget {
    level: BoundaryLevel;
    item: AdminItem;
    seq: number;
}

type Selection = Record<Level, AdminItem | null>;
type Lists = Record<Level, AdminItem[]>;

const EMPTY_SEL: Selection = { province: null, district: null, commune: null, village: null };
const EMPTY_LISTS: Lists = { province: [], district: [], commune: [], village: [] };
const CHILD_PATH: Record<BoundaryLevel, (id: number) => string> = {
    province: (id) => `/api/admin/provinces/${id}/districts`,
    district: (id) => `/api/admin/districts/${id}/communes`,
    commune: (id) => `/api/admin/communes/${id}/villages`,
};
const LEVEL_EN: Record<Level, string> = { province: "Province", district: "District", commune: "Commune", village: "Village" };

export function Explorer() {
    const { toast } = useToast();
    const { t, lang } = useI18n();
    // Keep async callbacks stable across language switches while still reading current strings
    const tRef = useRef(t);
    tRef.current = t;
    const [sel, setSel] = useState<Selection>(EMPTY_SEL);
    const [lists, setLists] = useState<Lists>(EMPTY_LISTS);
    const [loadingLevel, setLoadingLevel] = useState<Level | null>("province");
    const [childCount, setChildCount] = useState<number | null>(null);
    const [target, setTarget] = useState<MapTarget | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const [logs, setLogs] = useState<RequestLog[]>([]);
    const [activeLog, setActiveLog] = useState<number | null>(null);
    const [showMap, setShowMap] = useState(false);
    const seq = useRef(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef({ sel, lists });
    stateRef.current = { sel, lists };

    const log = useCallback((entry: RequestLog) => {
        setLogs((prev) => [entry, ...prev].slice(0, 12));
        setActiveLog(entry.id);
    }, []);

    // Mount the map when the explorer approaches the viewport
    useEffect(() => {
        const el = rootRef.current;
        if (!el || !("IntersectionObserver" in window)) return setShowMap(true);
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setShowMap(true);
                io.disconnect();
            }
        }, { rootMargin: "400px" });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        apiGet<ApiEnvelope<AdminItem[]>>("/api/admin/provinces", log, ctrl.signal)
            .then((j) => setLists((l) => ({ ...l, province: j.data })))
            .catch((e) => e?.name !== "AbortError" && toast(tRef.current("explore.loadProvincesFailed")))
            .finally(() => !ctrl.signal.aborted && setLoadingLevel(null));
        return () => ctrl.abort();
    }, [log, toast]);

    /** Select `item` at `level`, clear deeper levels, load its children and frame it on the map. */
    const choose = useCallback(
        async (level: Level, item: AdminItem, opts: { chain?: boolean; skipMap?: boolean } = {}) => {
            const my = ++seq.current;
            const below = LEVELS.slice(LEVELS.indexOf(level) + 1);
            setSel((prev) => {
                const next = { ...prev, [level]: item };
                below.forEach((l) => (next[l] = null));
                return next;
            });
            setLists((prev) => {
                const next = { ...prev };
                below.forEach((l) => (next[l] = []));
                return next;
            });
            setChildCount(null);
            if (!opts.skipMap && level !== "village") setTarget({ level, item, seq: my });

            const child = below[0];
            if (!child || level === "village") return;
            setLoadingLevel(child);
            try {
                const j = await apiGet<ApiEnvelope<AdminItem[]>>(CHILD_PATH[level](item.id), log);
                if (!opts.chain && my !== seq.current) return;
                setLists((prev) => ({ ...prev, [child]: j.data }));
                setChildCount(j.data.length);
            } catch {
                toast(tRef.current("explore.loadChildrenFailed", { level: tRef.current(`levelLower.${child}`) }));
            } finally {
                if (opts.chain || my === seq.current) setLoadingLevel(null);
            }
        },
        [log, toast],
    );

    /** Jump anywhere in the tree (search results, polygons outside the current branch). */
    const jumpTo = useCallback(
        async (id: number) => {
            try {
                const j = await apiGet<ApiEnvelope<HierarchyPath>>(`/api/admin/hierarchy/${id}`, log);
                const h = j.data;
                const chain = LEVELS.filter((l) => h[l]);
                for (const l of chain) await choose(l, h[l]!, { chain: true, skipMap: true });
                // Villages have no polygons, so frame the deepest level that does
                const mapLevel = chain.filter((l): l is BoundaryLevel => l !== "village").pop();
                if (mapLevel) setTarget({ level: mapLevel, item: h[mapLevel]!, seq: seq.current });
            } catch (e) {
                toast(tRef.current(e instanceof ApiError && e.status === 404 ? "explore.placeNotFound" : "explore.placeLoadFailed"));
            }
        },
        [choose, log, toast],
    );

    // A province clicked on the hero map selects it here
    useEffect(() => {
        const onSelect = (e: Event) => {
            const id = (e as CustomEvent<{ id: number }>).detail?.id;
            if (!id) return;
            setShowMap(true);
            void jumpTo(id);
        };
        window.addEventListener(SELECT_PROVINCE_EVENT, onSelect);
        return () => window.removeEventListener(SELECT_PROVINCE_EVENT, onSelect);
    }, [jumpTo]);

    const selectByCode = useCallback(
        (level: BoundaryLevel, code: string) => {
            const { sel, lists } = stateRef.current;
            const local = lists[level].find((x) => x.code === code);
            const ancestorsSelected = LEVELS.slice(0, LEVELS.indexOf(level)).every((l) => sel[l]);
            if (local && ancestorsSelected) void choose(level, local);
            else void jumpTo(parseInt(code, 10));
        },
        [choose, jumpTo],
    );

    const reset = useCallback(() => {
        seq.current++;
        setSel(EMPTY_SEL);
        setLists((l) => ({ ...EMPTY_LISTS, province: l.province }));
        setChildCount(null);
        setTarget(null);
        setLoadingLevel(null);
        setResetKey((k) => k + 1);
    }, []);

    const onSelectChange = (level: Level, value: string) => {
        const item = lists[level].find((x) => String(x.id) === value);
        if (item) {
            void choose(level, item);
            return;
        }
        // Cleared the selection at this level
        seq.current++;
        const from = LEVELS.indexOf(level);
        setSel((prev) => {
            const next = { ...prev };
            LEVELS.slice(from).forEach((l) => (next[l] = null));
            return next;
        });
        setLists((prev) => {
            const next = { ...prev };
            LEVELS.slice(from + 1).forEach((l) => (next[l] = []));
            return next;
        });
    };

    const deepest = [...LEVELS].reverse().find((l) => sel[l]) ?? null;
    const activeItem = deepest ? sel[deepest] : null;
    const selectedChain = LEVELS.filter((l) => sel[l]);

    return (
        <div className="overflow-hidden rounded-2xl glass-panel shadow-glass-lg" ref={rootRef}>
            {/* Workbench Top Chrome Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 bg-surface/60 px-4 py-2.5 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                        <span className="size-2.5 rounded-full bg-rose-500/75" />
                        <span className="size-2.5 rounded-full bg-amber-400/75" />
                        <span className="size-2.5 rounded-full bg-emerald-400/75" />
                    </div>
                    <span className="h-3.5 w-px bg-line/80" aria-hidden="true" />
                    {/* Live interactive hierarchy breadcrumb */}
                    <nav aria-label="Hierarchy Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
                        <button
                            type="button"
                            onClick={reset}
                            className={cx(
                                "cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] font-medium transition-colors hover:bg-surface-2 hover:text-accent",
                                selectedChain.length === 0 ? "text-ink font-semibold" : "text-ink-3",
                            )}
                        >
                            KH · Cambodia
                        </button>
                        {selectedChain.map((l) => {
                            const it = sel[l]!;
                            const isLast = l === deepest;
                            return (
                                <span key={l} className="inline-flex items-center gap-1 min-w-0">
                                    <span className="text-ink-3/60 font-mono">/</span>
                                    <button
                                        type="button"
                                        onClick={() => void choose(l, it)}
                                        className={cx(
                                            "cursor-pointer truncate rounded-md border-0 px-1.5 py-0.5 text-xs transition-colors",
                                            lang === "km" && "font-khmer",
                                            isLast
                                                ? "bg-accent/15 font-semibold text-accent"
                                                : "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
                                        )}
                                    >
                                        {lang === "km" ? it.name_km : it.name_en}
                                    </button>
                                </span>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {activeItem?.code && (
                        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
                            NCDD #{activeItem.code}
                        </span>
                    )}
                    {selectedChain.length > 0 && (
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-line/70 bg-surface/80 px-2.5 py-1 font-mono text-[11px] font-medium text-ink-2 hover:border-accent/50 hover:text-accent transition-all km:font-khmer"
                        >
                            <span>Reset</span>
                        </button>
                    )}
                    <Link
                        to="/map"
                        className="inline-flex items-center gap-1.5 rounded-lg glass-pill px-2.5 py-1 font-mono text-[11px] font-medium text-ink-2 no-underline hover:border-accent/50 hover:text-accent transition-all km:font-khmer"
                    >
                        <Icon name="map" className="size-3.25 text-accent" />
                        <span>{t("nav.map")}</span>
                    </Link>
                </div>
            </div>

            <div className="grid min-h-170 grid-cols-[minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="flex min-w-0 flex-col border-b border-line/60 lg:border-b-0 lg:border-r lg:border-line/60">
                    <SearchBox onPick={(item) => void jumpTo(item.id)} onLog={log} />

                    <div className="border-b border-line/60 px-4 pb-4 pt-2">
                        {LEVELS.map((level, i) => {
                            const parent = i > 0 ? LEVELS[i - 1] : null;
                            const items = lists[level];
                            const disabled = !items.length;
                            const placeholder =
                                loadingLevel === level ? t("explore.loading")
                                : items.length ? t("explore.selectWithCount", { level: t(`levelLower.${level}`), n: items.length })
                                : t("explore.selectParentFirst", { level: t(`levelLower.${parent ?? "province"}`) });
                            // Secondary label shows the other language
                            const secondary = lang === "km" ? LEVEL_EN[level] : LEVEL_KM[level];
                            return (
                                <div className={cx("relative grid grid-cols-[22px_1fr] gap-2.5 pt-3 before:absolute before:-bottom-3.5 before:left-[10.5px] before:top-9.5 before:w-px last:before:hidden transition-colors", sel[level] ? "before:bg-accent/50" : "before:bg-line-2")} key={level}>
                                    <span className={cx(
                                        "relative z-1 mt-5.5 grid size-5.5 place-items-center rounded-full border font-mono text-[10px] font-semibold transition-all duration-300",
                                        sel[level] ? "border-accent bg-accent text-white shadow-[0_0_12px_var(--og-accent)] ring-2 ring-accent/25" : "border-line-2 bg-surface text-ink-3",
                                    )}>
                                        {i + 1}
                                    </span>
                                    <div>
                                        <label htmlFor={`sel-${level}`} className="mb-1.25 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                                            <span>{t(`level.${level}`)}</span>
                                            <span className={cx("font-normal text-ink-3", lang !== "km" && "font-khmer")}>{secondary}</span>
                                            <span className="ml-auto font-mono text-[11px] font-medium text-ink-3 rounded-full bg-surface-2/70 px-2 py-0.5 border border-line/40">{items.length || "0"}</span>
                                        </label>
                                        <Combobox
                                            id={`sel-${level}`}
                                            disabled={disabled}
                                            clearable
                                            value={sel[level] ? String(sel[level]!.id) : null}
                                            onChange={(v) => onSelectChange(level, v ?? "")}
                                            placeholder={placeholder}
                                            searchPlaceholder={t("explore.searchLevel", { level: t(`levelLower.${level}`) })}
                                            emptyText={() => t("explore.noLevelMatch", { level: t(`levelLower.${level}`) })}
                                            // Current language first, the other language as a muted hint; codes are searchable
                                            options={items.map((it) => ({
                                                value: String(it.id),
                                                label: lang === "km" ? it.name_km : it.name_en,
                                                hint: lang === "km" ? it.name_en : it.name_km,
                                                labelClassName: lang === "km" ? "font-khmer" : undefined,
                                                hintClassName: lang === "km" ? undefined : "font-khmer",
                                                keywords: it.code,
                                            }))}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <DetailCard
                        level={deepest}
                        item={deepest ? sel[deepest] : null}
                        selection={sel}
                        childCount={childCount}
                        onCrumb={(l) => sel[l] && void choose(l, sel[l]!)}
                    />
                </aside>

                <div className="flex min-w-0 flex-col h-full min-h-0">
                    <div className="relative min-w-0 flex-1 min-h-95 sm:min-h-110">
                        <Suspense fallback={<div className="h-full w-full min-h-95 sm:min-h-110" />}>
                            {showMap ? <ExplorerMap target={target} resetKey={resetKey} onSelect={selectByCode} onLog={log} onReset={reset} /> : <div className="h-full w-full min-h-95 sm:min-h-110" />}
                        </Suspense>
                    </div>
                    <RequestConsole logs={logs} activeId={activeLog} onSelect={setActiveLog} />
                </div>
            </div>
        </div>
    );
}
