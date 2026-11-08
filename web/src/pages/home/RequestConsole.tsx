import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { codeCopy, cx } from "../../components/ui";
import { useI18n } from "../../i18n";
import { forDisplay, type RequestLog } from "../../lib/api";
import { COMMENT, JsonView } from "../../lib/highlight";
import { useToast } from "../../lib/toast";

interface Props {
    logs: RequestLog[];
    activeId: number | null;
    onSelect: (id: number) => void;
}

const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 70;
const MAX_HEIGHT = 520;
const STORAGE_HEIGHT_KEY = "og_console_height";
const STORAGE_COLLAPSED_KEY = "og_console_collapsed";

function getInitialHeight(): number {
    try {
        const saved = localStorage.getItem(STORAGE_HEIGHT_KEY);
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= MIN_HEIGHT && parsed <= MAX_HEIGHT) {
                return parsed;
            }
        }
    } catch {}
    return DEFAULT_HEIGHT;
}

function getInitialCollapsed(): boolean {
    try {
        return localStorage.getItem(STORAGE_COLLAPSED_KEY) === "true";
    } catch {}
    return false;
}

/** GeoJSON responses are summarised; geometry would drown the console. */
function summarise(body: unknown): unknown {
    if (body && typeof body === "object" && "type" in body) {
        const b = body as { type: string; features?: { properties: unknown }[]; id?: unknown; properties?: unknown; geometry?: { type?: string } };
        if (b.type === "FeatureCollection") {
            return { type: "FeatureCollection", features: `[${b.features?.length ?? 0} features — geometry omitted]`, sample: b.features?.[0]?.properties ?? null };
        }
        if (b.type === "Feature") {
            return { type: "Feature", id: b.id, properties: b.properties, geometry: `{ ${b.geometry?.type ?? "?"} — omitted }` };
        }
    }
    return forDisplay(body);
}

export function RequestConsole({ logs, activeId, onSelect }: Props) {
    const { copy } = useToast();
    const { t } = useI18n();
    const [height, setHeight] = useState(getInitialHeight);
    const [collapsed, setCollapsed] = useState(getInitialCollapsed);
    const [isDragging, setIsDragging] = useState(false);

    const heightRef = useRef(height);
    heightRef.current = height;

    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

    const toggleCollapse = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
            } catch {}
            return next;
        });
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragStartY.current = e.clientY;
        dragStartHeight.current = heightRef.current;
        setIsDragging(true);

        const onPointerMove = (moveEvent: PointerEvent) => {
            // Dragging UP decreases clientY -> increases console height
            const delta = dragStartY.current - moveEvent.clientY;
            const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartHeight.current + delta));
            heightRef.current = newHeight;
            setHeight(newHeight);
            setCollapsed(false);
        };

        const onPointerUp = () => {
            setIsDragging(false);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            try {
                localStorage.setItem(STORAGE_HEIGHT_KEY, String(heightRef.current));
                localStorage.setItem(STORAGE_COLLAPSED_KEY, "false");
            } catch {}
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    }, []);

    // Ensure listeners are cleaned up if unmounted while dragging
    useEffect(() => {
        return () => {
            setIsDragging(false);
        };
    }, []);

    const active = logs.find((l) => l.id === activeId) ?? null;
    const view = useMemo(() => (active ? summarise(active.body) : null), [active]);

    return (
        <div
            className={cx(
                "relative min-w-0 border-t border-line/60 bg-code/95 backdrop-blur-md text-code-ink transition-shadow",
                isDragging && "select-none",
            )}
            aria-label={t("explore.consoleLabel")}
        >
            {/* Draggable resize bar along the top border */}
            <div
                role="separator"
                aria-orientation="horizontal"
                tabIndex={0}
                title="Drag to resize console height · Double-click to collapse/expand"
                onPointerDown={onPointerDown}
                onDoubleClick={toggleCollapse}
                className={cx(
                    "group/resizer absolute -top-2 left-0 right-0 z-20 flex h-4 cursor-row-resize select-none touch-none items-center justify-center transition-colors",
                    isDragging ? "bg-accent/20" : "hover:bg-accent/10",
                )}
            >
                <div
                    className={cx(
                        "h-1 rounded-full transition-all duration-200",
                        isDragging
                            ? "w-16 bg-accent shadow-[0_0_10px_var(--og-accent)]"
                            : "w-10 bg-white/25 group-hover/resizer:w-14 group-hover/resizer:bg-accent/80",
                    )}
                />
                {isDragging && (
                    <span className="pointer-events-none absolute -top-6 rounded-md border border-code-line bg-code px-2 py-0.5 font-mono text-[10px] font-semibold text-accent shadow-xs">
                        {height}px
                    </span>
                )}
            </div>

            {/* Header row */}
            <div
                className="flex items-center gap-2 border-b border-code-line py-2 pl-3.5 pr-2.5 font-mono text-xs text-code-dim select-none"
                onDoubleClick={toggleCollapse}
            >
                <button
                    type="button"
                    onClick={toggleCollapse}
                    className="flex flex-none items-center gap-1.5 font-semibold text-code-hi hover:text-accent transition-colors cursor-pointer"
                    aria-expanded={!collapsed}
                    title={collapsed ? t("explore.expandConsole") : t("explore.collapseConsole")}
                >
                    <Icon
                        name="chevronDown"
                        className={cx(
                            "size-3.5 transition-transform duration-200",
                            collapsed ? "-rotate-90 text-accent" : "text-code-dim",
                        )}
                    />
                    <span>{t("explore.console")}</span>
                    {logs.length > 0 && (
                        <span className="rounded-full bg-code-pill px-1.75 py-0.25 text-[10px] font-mono text-code-dim border border-code-line">
                            {logs.length}
                        </span>
                    )}
                </button>

                <strong className="min-w-0 flex-1 truncate font-medium text-code-hi text-[11px] sm:text-xs">
                    {active
                        ? `GET ${active.path} → ${active.status}${active.server ? ` · ${t("hero.server")} ${active.server}` : ""} · ${t("explore.roundTrip", { ms: active.ms.toFixed(0) })}`
                        : t("explore.noRequests")}
                </strong>

                <div className="ml-auto flex flex-none items-center gap-1.5">
                    <button
                        className={cx(codeCopy, "ml-0 text-[11px] sm:text-xs")}
                        type="button"
                        disabled={!active}
                        onClick={() => active && copy(location.origin + active.path, t("explore.urlCopied"))}
                    >
                        <Icon name="copy" className="size-3" />
                        <span className="max-xs:hidden">{t("explore.copyUrl")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={toggleCollapse}
                        className="grid size-6.5 cursor-pointer place-items-center rounded-md border border-code-line bg-code-pill/80 text-code-dim hover:border-code-dim/40 hover:text-code-hi transition-colors"
                        title={collapsed ? t("explore.expandConsole") : t("explore.collapseConsole")}
                        aria-label={collapsed ? t("explore.expandConsole") : t("explore.collapseConsole")}
                    >
                        <Icon
                            name="chevronDown"
                            className={cx("size-3.5 transition-transform duration-200", collapsed && "rotate-180")}
                        />
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {!collapsed && (
                <>
                    {/* Request pill tabs */}
                    <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-code-line px-3 py-2">
                        {logs.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                aria-pressed={r.id === activeId}
                                onClick={() => onSelect(r.id)}
                                className="inline-flex max-w-90 flex-none cursor-pointer items-center gap-2 rounded-lg border border-code-line bg-code-pill/90 px-2.5 py-1.25 font-mono text-xs text-code-dim hover:text-code-hi aria-pressed:border-accent/60 aria-pressed:text-code-hi aria-pressed:bg-code-tab transition-all"
                            >
                                <span className="font-medium text-j-str">GET</span>
                                <span className="truncate">{r.path}</span>
                                <span className={r.status < 400 ? "text-j-str" : "text-j-err"}>{r.status}</span>
                                <span className="text-code-faint">{r.server ?? `${r.ms.toFixed(0)}ms`}</span>
                            </button>
                        ))}
                    </div>

                    {/* Resizable JSON Body */}
                    <pre
                        style={{ height: `${height}px` }}
                        className="m-0 overflow-auto whitespace-pre px-4 py-3 font-mono text-[12.5px] leading-[1.6]"
                    >
                        {view ? <JsonView value={view} max={14000} /> : <span className={cx(COMMENT)}>{t("explore.consoleEmpty")}</span>}
                    </pre>
                </>
            )}
        </div>
    );
}
