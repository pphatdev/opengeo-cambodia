import { useMemo } from "react";
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
    const active = logs.find((l) => l.id === activeId) ?? null;
    const view = useMemo(() => (active ? summarise(active.body) : null), [active]);

    return (
        <div className="min-w-0 border-t border-line/60 bg-code/95 backdrop-blur-md text-code-ink" aria-label={t("explore.consoleLabel")}>
            <div className="flex items-center gap-2.5 border-b border-code-line py-2 pl-4 pr-3 font-mono text-xs text-code-dim">
                <span>{t("explore.console")}</span>
                <strong className="truncate font-medium text-code-hi">
                    {active
                        ? `GET ${active.path} → ${active.status}${active.server ? ` · ${t("hero.server")} ${active.server}` : ""} · ${t("explore.roundTrip", { ms: active.ms.toFixed(0) })}`
                        : t("explore.noRequests")}
                </strong>
                <button className={codeCopy} type="button" disabled={!active} onClick={() => active && copy(location.origin + active.path, t("explore.urlCopied"))}>
                    {t("explore.copyUrl")}
                </button>
            </div>
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
            <pre className="m-0 max-h-55 overflow-auto whitespace-pre px-4 py-3 font-mono text-[12.5px] leading-[1.6]">
                {view ? <JsonView value={view} max={14000} /> : <span className={cx(COMMENT)}>{t("explore.consoleEmpty")}</span>}
            </pre>
        </div>
    );
}
