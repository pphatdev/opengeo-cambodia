import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { Combobox } from "../../components/Combobox";
import { Icon } from "../../components/Icon";
import { Nav } from "../../components/Nav";
import { cx, focusRing, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmtBytes, PROD_ORIGIN, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { buildPath, displayPath, ENDPOINTS, type Endpoint } from "../docs/endpoints";
import { EndpointSelector } from "./EndpointSelector";
import { PlaygroundHeaders } from "./PlaygroundHeaders";
import { PlaygroundHeroPreview } from "./PlaygroundHeroPreview";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";

type PreviewTab = "map" | "raw" | "table" | "headers";

export default function Playground() {
    const { t, tx, lang } = useI18n();
    const { toast, copy } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // Set page title
    useEffect(() => {
        document.title = t("meta.playgroundTitle");
    }, [lang, t]);

    // Active endpoint selection
    const initialEpId = searchParams.get("ep") || "admin-provinces";
    const initialEp = useMemo(() => ENDPOINTS.find((e) => e.id === initialEpId) ?? ENDPOINTS[0], [initialEpId]);

    const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(initialEp);
    const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
        Object.fromEntries((initialEp.params ?? []).map((p) => [p.name, p.example ?? ""])),
    );
    const [customUrl, setCustomUrl] = useState<string>(() => displayPath(initialEp, Object.fromEntries((initialEp.params ?? []).map((p) => [p.name, p.example ?? ""]))));

    const [activeTab, setActiveTab] = useState<PreviewTab>("map");
    const [pending, setPending] = useState(false);
    const [result, setResult] = useState<{ log: RequestLog | null; error?: string } | null>(null);

    // Update endpoint
    const handleSelectEndpoint = useCallback((ep: Endpoint, newParams?: Record<string, string>) => {
        setSelectedEndpoint(ep);
        const nextParams = newParams ?? Object.fromEntries((ep.params ?? []).map((p) => [p.name, p.example ?? ""]));
        setParamValues(nextParams);
        const built = displayPath(ep, nextParams);
        setCustomUrl(built);
        setSearchParams({ ep: ep.id }, { replace: true });
    }, [setSearchParams]);

    // Update individual param
    const handleParamChange = (name: string, value: string) => {
        const nextParams = { ...paramValues, [name]: value };
        setParamValues(nextParams);
        const path = buildPath(selectedEndpoint, nextParams);
        if (path) {
            setCustomUrl(path);
        }
    };

    const handleResetParams = () => {
        const reset = Object.fromEntries((selectedEndpoint.params ?? []).map((p) => [p.name, p.example ?? ""]));
        setParamValues(reset);
        const path = displayPath(selectedEndpoint, reset);
        setCustomUrl(path);
    };

    // Execute API request
    const handleSend = useCallback(async (pathToSend?: string) => {
        const path = pathToSend || customUrl || buildPath(selectedEndpoint, paramValues);
        if (!path) {
            toast(t("docs.fillPath"));
            return;
        }

        setPending(true);
        let entry: RequestLog | null = null;
        try {
            await apiGet(path, (l) => {
                entry = l;
            });
            setResult({ log: entry });
        } catch (err) {
            setResult(entry ? { log: entry } : { log: null, error: (err as Error).message });
        } finally {
            setPending(false);
        }
    }, [customUrl, selectedEndpoint, paramValues, toast, t]);

    // Keyboard shortcuts: Cmd+Enter (Send), Cmd+K (Search)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent("open-endpoint-selector"));
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleSend]);

    // Drill down from UI Preview or place chips into another query
    const handleDrillDown = (path: string, params?: Record<string, string>) => {
        const matched = ENDPOINTS.find((e) => {
            const pattern = e.path.replace(/\{(\w+)\}/g, "[^/?]+");
            return new RegExp(`^${pattern}(\\?.*)?$`).test(path);
        });

        if (matched) {
            setSelectedEndpoint(matched);
            setParamValues(params ?? {});
            setSearchParams({ ep: matched.id }, { replace: true });
        }
        setCustomUrl(path);
        handleSend(path);
    };

    const log = result?.log;
    const fullProdUrl = PROD_ORIGIN + (customUrl.startsWith("/") ? customUrl : `/${customUrl}`);

    return (
        <div className="min-h-screen bg-bg text-ink flex flex-col font-sans">
            <Nav variant="playground" />

            {/* Header Banner */}
            <div className="border-b border-line bg-surface/40 py-6">
                <div className={wrap}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="rounded-md bg-accent px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-bg">
                                    Interactive
                                </span>
                                <h1 className="m-0 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                                    {t("playground.title")}
                                </h1>
                            </div>
                            <p className="m-0 text-sm text-ink-2 max-w-2xl">
                                {t("playground.subtitle")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Playground Content */}
            <main id="request-console" className={cx(wrap, "flex-1 py-8")}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Request Builder */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="rounded-2xl border border-line bg-surface p-4.5 shadow-card space-y-5">
                            <EndpointSelector
                                endpoints={ENDPOINTS}
                                selected={selectedEndpoint}
                                onSelect={(ep) => handleSelectEndpoint(ep)}
                            />

                            {/* Request URL Input & Send Button */}
                            <div className="space-y-2 pt-1 border-t border-line/60">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-ink-3 uppercase tracking-wider text-[11px]">
                                        Request Path
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copy(`curl "${fullProdUrl}"`)}
                                        className="cursor-pointer text-[11px] font-mono text-ink-3 hover:text-ink flex items-center gap-1"
                                    >
                                        <Icon name="copy" className="size-3" />
                                        <span>{t("playground.copyCurl")}</span>
                                    </button>
                                </div>

                                <form
                                    onSubmit={(e: FormEvent) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={customUrl}
                                            onChange={(e) => setCustomUrl(e.target.value)}
                                            placeholder={t("playground.urlPlaceholder")}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-line bg-surface-2 px-3.5 font-mono text-xs text-ink",
                                                focusRing,
                                            )}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={pending}
                                        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border-0 bg-ink px-4 text-xs font-semibold text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] disabled:cursor-wait disabled:opacity-60 transition-all shadow-sm shrink-0"
                                    >
                                        <Icon name="play" className="size-3" />
                                        {pending ? t("playground.sending") : t("playground.sendRequest")}
                                    </button>
                                </form>

                                <div className="text-[11px] text-ink-3">
                                    {t("playground.shortcutHint")}
                                </div>
                            </div>

                            {/* Parameters Section */}
                            <div className="border-t border-line/60 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="m-0 text-xs font-semibold text-ink-3 uppercase tracking-wider">
                                        {t("playground.parameters")}
                                        {selectedEndpoint.params?.length ? ` (${selectedEndpoint.params.length})` : ""}
                                    </h3>
                                    {selectedEndpoint.params?.length ? (
                                        <button
                                            type="button"
                                            onClick={handleResetParams}
                                            className="text-[11px] font-mono text-ink-3 hover:text-ink cursor-pointer"
                                        >
                                            Reset defaults
                                        </button>
                                    ) : null}
                                </div>

                                {(!selectedEndpoint.params || selectedEndpoint.params.length === 0) ? (
                                    <div className="rounded-lg border border-dashed border-line bg-surface-2/40 p-3 text-xs text-ink-3">
                                        {t("playground.noParams")}
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {selectedEndpoint.params.map((p) => {
                                            const val = paramValues[p.name] ?? "";
                                            return (
                                                <div key={p.name} className="space-y-1.5 rounded-lg border border-line/60 bg-surface-2/40 p-2.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <label htmlFor={`param-${p.name}`} className="font-mono font-semibold text-ink flex items-center gap-1">
                                                            <span>{p.name}</span>
                                                            {p.required ? (
                                                                <span className="text-accent text-[10px] font-bold uppercase tracking-wider">
                                                                    Required
                                                                </span>
                                                            ) : (
                                                                <span className="text-ink-3 text-[10px]">
                                                                    Optional
                                                                </span>
                                                            )}
                                                        </label>
                                                        <span className="font-mono text-[10.5px] text-water font-medium">
                                                            {p.in} · {p.type}
                                                        </span>
                                                    </div>

                                                    {p.options ? (
                                                        <Combobox
                                                            id={`param-${p.name}`}
                                                            size="sm"
                                                            searchable={false}
                                                            value={val}
                                                            placeholder={p.name}
                                                            options={p.options.map((o) => ({ value: o, label: o || "None (Default)" }))}
                                                            onChange={(newVal) => handleParamChange(p.name, newVal ?? "")}
                                                        />
                                                    ) : (
                                                        <input
                                                            id={`param-${p.name}`}
                                                            type="text"
                                                            value={val}
                                                            placeholder={p.example ? `e.g. ${p.example}` : p.name}
                                                            onChange={(e) => handleParamChange(p.name, e.target.value)}
                                                            className={cx(
                                                                "h-8 w-full rounded-md border border-line bg-surface px-2.5 font-mono text-xs text-ink",
                                                                focusRing,
                                                            )}
                                                        />
                                                    )}
                                                    <div className="text-[11px] text-ink-3">
                                                        {tx(p.description)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Response Inspection */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl">
                            <div className="inline-flex h-8 items-center rounded-lg border border-line bg-surface-2 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("map")}
                                    className={cx(
                                        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                        activeTab === "map" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                    )}
                                >
                                    <Icon name="map" className="size-3.5" />
                                    <span>{t("playground.tabMap")}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("table")}
                                    className={cx(
                                        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                        activeTab === "table" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                    )}
                                >
                                    <Icon name="table" className="size-3.5" />
                                    <span>{t("playground.tabTable")}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("raw")}
                                    className={cx(
                                        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                        activeTab === "raw" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                    )}
                                >
                                    <Icon name="code" className="size-3.5" />
                                    <span>{t("playground.tabRaw")}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("headers")}
                                    className={cx(
                                        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                        activeTab === "headers" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                    )}
                                >
                                    <Icon name="layers" className="size-3.5" />
                                    <span>{t("playground.tabHeaders")}</span>
                                </button>
                            </div>

                            {/* Response Status Pill */}
                            {log && (
                                <div className="flex items-center gap-2 font-mono text-xs">
                                    <span
                                        className={cx(
                                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold",
                                            log.status >= 200 && log.status < 300
                                                ? "bg-accent/15 text-accent border border-accent/20"
                                                : "bg-warn/15 text-warn border border-warn/20",
                                        )}
                                    >
                                        <span className="size-1.5 rounded-full bg-current" />
                                        {log.status} {log.statusText || (log.status === 200 ? "OK" : "")}
                                    </span>
                                    <span className="text-ink-3 font-semibold">
                                        {log.ms}ms
                                    </span>
                                    <span className="text-line">·</span>
                                    <span className="text-ink-3">
                                        {fmtBytes(log.size)}
                                    </span>
                                    {log.server && (
                                        <>
                                            <span className="text-line">·</span>
                                            <span className="text-[11px] text-ink-3">
                                                {log.server}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Response Body Content */}
                        {pending ? (
                            <div className="flex min-h-105 flex-col items-center justify-center rounded-xl border border-line bg-surface p-8 text-center">
                                <div className="size-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
                                <div className="text-xs font-mono text-ink-2">
                                    Fetching {customUrl}...
                                </div>
                            </div>
                        ) : result?.error && !log ? (
                            <div className="rounded-xl border border-warn/30 bg-warn/10 p-6 text-center text-sm text-warn">
                                <div className="font-semibold mb-1">Request Failed</div>
                                <div className="font-mono text-xs">{result.error}</div>
                            </div>
                        ) : activeTab === "map" ? (
                            <div className="space-y-4">
                                <PlaygroundHeroPreview
                                    log={log}
                                    endpointPath={customUrl}
                                    onDrillDown={handleDrillDown}
                                    onSwitchTab={(tab) => setActiveTab(tab)}
                                />
                            </div>
                        ) : !log ? (
                            <div className="flex min-h-105 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/50 p-8 text-center">
                                <div className="size-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-accent mb-4">
                                    <Icon name="play" className="size-6" />
                                </div>
                                <h3 className="m-0 text-base font-bold text-ink">
                                    {t("playground.readyTitle")}
                                </h3>
                                <p className="m-0 mt-1 max-w-sm text-xs text-ink-3">
                                    {t("playground.readyDesc")}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleSend()}
                                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] cursor-pointer transition-colors"
                                >
                                    <Icon name="play" className="size-3" />
                                    {t("playground.sendRequest")}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeTab === "raw" && (
                                    <PlaygroundRawPreview
                                        log={log}
                                        endpointPath={customUrl}
                                    />
                                )}
                                {activeTab === "table" && (
                                    <PlaygroundUiPreview
                                        log={log}
                                        onDrillDown={handleDrillDown}
                                    />
                                )}
                                {activeTab === "headers" && (
                                    <PlaygroundHeaders
                                        log={log}
                                        customUrl={fullProdUrl}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
