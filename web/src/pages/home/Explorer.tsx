import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Combobox } from "../../components/Combobox";
import { cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import { ApiError, apiGet, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { LEVEL_KM, LEVELS, type AdminItem, type ApiEnvelope, type BoundaryLevel, type HierarchyPath, type Level } from "../../lib/types";
import { DetailCard } from "./DetailCard";
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

    return (
        <div className="grid min-h-170 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[14px] border border-line bg-surface shadow-card lg:grid-cols-[380px_minmax(0,1fr)]" ref={rootRef}>
            <aside className="flex min-w-0 flex-col border-b border-line lg:border-b-0 lg:border-r">
                <SearchBox onPick={(item) => void jumpTo(item.id)} onLog={log} />

                <div className="border-b border-line px-4 pb-4 pt-2">
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
                            <div className="relative grid grid-cols-[22px_1fr] gap-2.5 pt-3 before:absolute before:-bottom-3.5 before:left-[10.5px] before:top-9.5 before:w-px before:bg-line-2 last:before:hidden" key={level}>
                                <span className={cx("relative z-1 mt-5.5 grid size-5.5 place-items-center rounded-full border font-mono text-[10px] font-semibold", sel[level] ? "border-ink bg-ink text-bg" : "border-line-2 bg-surface text-ink-3")}>{i + 1}</span>
                                <div>
                                    <label htmlFor={`sel-${level}`} className="mb-1.25 flex gap-1.5 text-xs font-semibold text-ink-2">
                                        {t(`level.${level}`)} <span className={cx("font-normal text-ink-3", lang !== "km" && "font-khmer")}>{secondary}</span>
                                        <span className="ml-auto font-mono text-[11px] font-medium text-ink-3">{items.length || ""}</span>
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

            <div className="grid min-w-0 grid-rows-[1fr_auto]">
                <Suspense fallback={<div className="min-h-110" />}>
                    {showMap ? <ExplorerMap target={target} resetKey={resetKey} onSelect={selectByCode} onLog={log} onReset={reset} /> : <div className="min-h-110" />}
                </Suspense>
                <RequestConsole logs={logs} activeId={activeLog} onSelect={setActiveLog} />
            </div>
        </div>
    );
}
