import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { Combobox } from "../../components/Combobox";
import { Icon } from "../../components/Icon";
import { Nav } from "../../components/Nav";
import { cx, focusRing, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmtBytes, PROD_ORIGIN, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { buildPath, displayPath, ENDPOINTS, GROUPS, type Endpoint, type EndpointGroup } from "../docs/endpoints";
import { PlaygroundHeaders } from "./PlaygroundHeaders";
import { PlaygroundHeroPreview } from "./PlaygroundHeroPreview";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";
import { PRESETS, type PlaygroundPreset } from "./presets";

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
    const [groupFilter, setGroupFilter] = useState<EndpointGroup | "all">("all");
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

    // Handle parameter input changes
    const handleParamChange = (name: string, value: string) => {
        const nextParams = { ...paramValues, [name]: value };
        setParamValues(nextParams);
        const path = buildPath(selectedEndpoint, nextParams);
        if (path) {
            setCustomUrl(path);
        }
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

    // Keyboard shortcut: Cmd/Ctrl + Enter sends request
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleSend]);

    // Apply preset
    const handleApplyPreset = (preset: PlaygroundPreset) => {
        const ep = ENDPOINTS.find((e) => e.id === preset.endpointId);
        if (ep) {
            handleSelectEndpoint(ep, preset.params);
            setCustomUrl(preset.path);
            handleSend(preset.path);
        }
    };

    // Drill down from UI Preview into another query
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

    // Filtered endpoints for combobox
    const filteredEndpoints = useMemo(() => {
        return ENDPOINTS.filter((e) => {
            if (groupFilter !== "all" && e.group !== groupFilter) return false;
            return true;
        });
    }, [groupFilter]);

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

                        {/* Quick Presets Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-medium text-ink-3 mr-1 flex items-center gap-1">
                                <Icon name="sparkles" className="size-3 text-accent" />
                                {t("playground.presets")}:
                            </span>
                            {PRESETS.slice(0, 5).map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleApplyPreset(p)}
                                    className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 hover:border-line-2 hover:text-ink transition-colors"
                                >
                                    {tx(p.label)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Playground Content */}
            <main id="request-console" className={cx(wrap, "flex-1 py-8")}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Request Builder (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* 1. Endpoint Selector Card */}
                        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
                            <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
                                {t("playground.selectEndpoint")}
                            </label>

                            {/* Group Filters */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setGroupFilter("all")}
                                    className={cx(
                                        "rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
                                        groupFilter === "all" ? "bg-ink text-bg font-semibold" : "bg-surface-2 text-ink-2 hover:text-ink",
                                    )}
                                >
                                    {t("playground.allGroups")}
                                </button>
                                {GROUPS.map((g) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setGroupFilter(g.id)}
                                        className={cx(
                                            "rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
                                            groupFilter === g.id ? "bg-ink text-bg font-semibold" : "bg-surface-2 text-ink-2 hover:text-ink",
                                        )}
                                    >
                                        {tx(g.title)}
                                    </button>
                                ))}
                            </div>

                            {/* Combobox of Endpoints */}
                            <Combobox
                                id="endpoint-selector"
                                searchable
                                size="md"
                                value={selectedEndpoint.id}
                                placeholder={t("playground.searchEndpoints")}
                                options={filteredEndpoints.map((ep) => ({
                                    value: ep.id,
                                    label: `${ep.path} — ${tx(ep.title)}`,
                                }))}
                                onChange={(val) => {
                                    const found = ENDPOINTS.find((e) => e.id === val);
                                    if (found) handleSelectEndpoint(found);
                                }}
                            />

                            {/* Selected Endpoint Description */}
                            <div className="mt-3 text-xs text-ink-2">
                                <span className="font-semibold text-ink">{tx(selectedEndpoint.title)}: </span>
                                {tx(selectedEndpoint.description)}
                            </div>
                        </div>

                        {/* 2. Request URL & Parameters Card */}
                        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
                                    Request URL
                                </span>
                                <span className="font-mono text-[11px] text-ink-3">
                                    GET
                                </span>
                            </div>

                            {/* Editable URL Bar */}
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
                                            "h-10 w-full rounded-lg border border-line bg-surface-2 px-3 font-mono text-xs text-ink",
                                            focusRing,
                                        )}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={pending}
                                    className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-ink px-4 text-xs font-semibold text-bg hover:bg-[color-mix(in_srgb,var(--og-ink)_85%,var(--og-accent))] disabled:cursor-wait disabled:opacity-60 transition-colors"
                                >
                                    <Icon name="play" className="size-3" />
                                    {pending ? t("playground.sending") : t("playground.sendRequest")}
                                </button>
                            </form>

                            <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                                <span>{t("playground.shortcutHint")}</span>
                                <button
                                    type="button"
                                    onClick={() => copy(`curl "${fullProdUrl}"`)}
                                    className="cursor-pointer hover:text-ink font-mono"
                                >
                                    {t("playground.copyCurl")}
                                </button>
                            </div>

                            {/* Parameter Fields */}
                            <div className="mt-5 border-t border-line pt-4">
                                <h3 className="m-0 text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3">
                                    {t("playground.parameters")}
                                </h3>

                                {(!selectedEndpoint.params || selectedEndpoint.params.length === 0) ? (
                                    <p className="m-0 text-xs text-ink-3 italic">
                                        {t("playground.noParams")}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedEndpoint.params.map((p) => {
                                            const val = paramValues[p.name] ?? "";
                                            return (
                                                <div key={p.name} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <label htmlFor={`param-${p.name}`} className="font-mono font-medium text-ink">
                                                            {p.name}
                                                            {p.required && <span className="ml-1 text-accent">*</span>}
                                                        </label>
                                                        <span className="font-mono text-[10.5px] text-ink-3">
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
                                                                "h-8 w-full rounded-md border border-line bg-surface-2 px-2.5 font-mono text-xs text-ink",
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

                    {/* Right Column: Response Inspection (7 cols on lg) */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Response Header Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-card">
                            {/* Mode Switch Tabs */}
                            <div className="inline-flex h-8 items-center rounded-lg border border-line bg-surface-2 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("map")}
                                    className={cx(
                                        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                        activeTab === "map" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                    )}
                                >
                                    <Icon name="map" className="size-3.5 text-accent" />
                                    {t("playground.tabMap")}
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
                                    {t("playground.tabRaw")}
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
                                    {t("playground.tabTable")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("headers")}
                                    className={cx(
                                        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                        activeTab === "headers" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                    )}
                                >
                                    <Icon name="info" className="size-3.5" />
                                    {t("playground.tabHeaders")}
                                </button>
                            </div>

                            {/* Response Metadata Badges */}
                            {log && (
                                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                                    <span
                                        className={cx(
                                            "rounded-md px-2 py-0.75 font-semibold",
                                            log.status < 400 ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn",
                                        )}
                                    >
                                        {log.status} {log.statusText || ""}
                                    </span>
                                    <span className="text-ink-3" title="Client round-trip time">
                                        {log.ms.toFixed(0)} ms
                                    </span>
                                    {log.server && (
                                        <span className="text-ink-3" title="Server internal execution time">
                                            · {log.server}
                                        </span>
                                    )}
                                    <span className="text-ink-3">
                                        · {fmtBytes(log.size)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Result Body / Panels */}
                        {pending ? (
                            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-line bg-surface p-8 text-center">
                                <span className="size-8 animate-spin rounded-full border-3 border-line-2 border-t-accent mb-3" />
                                <div className="text-sm font-semibold text-ink">{t("playground.sending")}</div>
                                <div className="mt-1 font-mono text-xs text-ink-3">{customUrl}</div>
                            </div>
                        ) : result?.error && !log ? (
                            <div className="rounded-xl border border-warn/30 bg-warn/10 p-6 text-center text-sm text-warn">
                                <div className="font-semibold mb-1">Request Failed</div>
                                <div className="font-mono text-xs">{result.error}</div>
                            </div>
                        ) : activeTab === "map" ? (
                            /* Hero Map Preview as primary preview (always available) */
                            <div className="space-y-4">
                                <PlaygroundHeroPreview
                                    log={log}
                                    endpointPath={customUrl}
                                    onDrillDown={handleDrillDown}
                                    onSwitchTab={(tab) => setActiveTab(tab)}
                                />
                            </div>
                        ) : !log ? (
                            /* Empty State Before Sending for other tabs */
                            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/50 p-8 text-center">
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
                            /* Other Active Tab Views */
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

