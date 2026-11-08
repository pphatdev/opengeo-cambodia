import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { Combobox } from "../../components/Combobox";
import { Icon } from "../../components/Icon";
import { Nav } from "../../components/Nav";
import { cx, focusRing, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmtBytes, PROD_ORIGIN, type RequestLog } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { useToast } from "../../lib/toast";
import { buildPath, displayPath, ENDPOINTS, type Endpoint } from "../docs/endpoints";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCES, type HeroProvince } from "../home/cambodiaMap";
import { AtlasCanvas } from "./AtlasCanvas";
import { AtlasChart } from "./AtlasChart";
import { AtlasActivePanel, AtlasDock } from "./AtlasDock";
import { AtlasDrawers } from "./AtlasDrawers";
import { AtlasConsoleHUD, AtlasHubsHUD } from "./AtlasHUD";
import { AtlasInspector } from "./AtlasInspector";
import { AtlasCategory, AtlasTopBar } from "./AtlasTopBar";
import { EndpointSelector } from "./EndpointSelector";
import { PlaygroundHeaders } from "./PlaygroundHeaders";
import { PlaygroundHeroPreview } from "./PlaygroundHeroPreview";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";
import { type PlaygroundPreset } from "./presets";

type PreviewTab = "map" | "raw" | "table" | "headers";

/** Convert GPS coordinates (lat, lon) to SVG canvas (x, y) */
function latLonToSvg(lat: number, lon: number): [number, number] {
    const minLat = 10.35, maxLat = 14.75;
    const minLon = 102.3, maxLon = 107.65;
    const x = ((lon - minLon) / (maxLon - minLon)) * MAP_WIDTH;
    const y = ((maxLat - lat) / (maxLat - minLat)) * MAP_HEIGHT;
    return [Math.max(20, Math.min(MAP_WIDTH - 20, x)), Math.max(20, Math.min(MAP_HEIGHT - 20, y))];
}

/** Extract parent province code (01-25) from any code or id */
function extractProvinceCode(raw: unknown): string | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d+$/.test(s)) {
        if (s.length <= 2) {
            return s.padStart(2, "0");
        }
        return s.slice(0, 2);
    }
    return null;
}

export default function Playground() {
    const { t, tx, lang, setLang } = useI18n();
    const { dark, toggle: toggleTheme } = useTheme();
    const { toast, copy } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // Mode: Atlas Command Center (default) vs Classic Console
    const [viewMode, setViewMode] = useState<"atlas" | "classic">("atlas");
    const [atlasCategory, setAtlasCategory] = useState<AtlasCategory>("ALL");
    const [activePanel, setActivePanel] = useState<AtlasActivePanel>("none");
    const [networkEnabled, setNetworkEnabled] = useState(true);

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

    // Active province on the canvas / inspector
    const [activeProvinceCode, setActiveProvinceCode] = useState<string>("12"); // Phnom Penh default

    // Update endpoint
    const handleSelectEndpoint = useCallback((ep: Endpoint, newParams?: Record<string, string>) => {
        setSelectedEndpoint(ep);
        const nextParams = newParams ?? Object.fromEntries((ep.params ?? []).map((p) => [p.name, p.example ?? ""]));
        setParamValues(nextParams);
        const built = displayPath(ep, nextParams);
        setCustomUrl(built);
        setSearchParams({ ep: ep.id }, { replace: true });
    }, [setSearchParams]);

    // Filter endpoints by Atlas Category
    const filteredEndpoints = useMemo(() => {
        if (atlasCategory === "ALL") return ENDPOINTS;
        return ENDPOINTS.filter((e) => e.group.toUpperCase() === atlasCategory);
    }, [atlasCategory]);

    const handleSelectCategory = (cat: AtlasCategory) => {
        setAtlasCategory(cat);
        const matched = ENDPOINTS.find((e) => (cat === "ALL" ? true : e.group.toUpperCase() === cat));
        if (matched) {
            handleSelectEndpoint(matched);
        }
    };

    // Handle parameter input changes
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

    // Keyboard shortcut: Cmd/Ctrl + Enter sends request
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSend();
            }
            if (e.key === "Escape") {
                setActivePanel("none");
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

    const log = result?.log;
    const body = log?.body as any;
    const fullProdUrl = PROD_ORIGIN + (customUrl.startsWith("/") ? customUrl : `/${customUrl}`);

    // Detect province code from endpoint path or response data
    useEffect(() => {
        const pMatch = customUrl.match(/\/(?:provinces|districts|communes|item|hierarchy)\/(\d+)/);
        if (pMatch) {
            const code = extractProvinceCode(pMatch[1]);
            if (code && PROVINCES.some((p) => p.code === code)) {
                setActiveProvinceCode(code);
                return;
            }
        }

        const qMatch = customUrl.match(/province_code=(\d+)/);
        if (qMatch) {
            const code = extractProvinceCode(qMatch[1]);
            if (code && PROVINCES.some((p) => p.code === code)) {
                setActiveProvinceCode(code);
                return;
            }
        }

        if (body?.data?.province?.code) {
            const code = extractProvinceCode(body.data.province.code);
            if (code && PROVINCES.some((p) => p.code === code)) {
                setActiveProvinceCode(code);
                return;
            }
        }
    }, [customUrl, body]);

    // Set of highlighted province codes from response
    const highlightedProvinceCodes = useMemo<Set<string>>(() => {
        const set = new Set<string>();
        if (Array.isArray(body?.data)) {
            body.data.forEach((item: any) => {
                const code = extractProvinceCode(item.code || item.id || item.province_code);
                if (code) set.add(code);
            });
        } else if (Array.isArray(body?.features)) {
            body.features.forEach((feat: any) => {
                const code = extractProvinceCode(feat.properties?.code || feat.properties?.id);
                if (code) set.add(code);
            });
        }
        return set;
    }, [body]);

    // Detect geocode coordinate marker
    const geocodeMarker = useMemo<{ x: number; y: number; lat: number; lon: number; label: string } | null>(() => {
        let lat: number | undefined;
        let lon: number | undefined;
        let label = "Geocoded Location";

        if (body?.data?.lat && body?.data?.lon) {
            lat = Number(body.data.lat);
            lon = Number(body.data.lon);
            label = body.data.display_name || body.data.formatted_address || label;
        } else if (body?.data?.coordinates?.lat && body?.data?.coordinates?.lon) {
            lat = Number(body.data.coordinates.lat);
            lon = Number(body.data.coordinates.lon);
            label = body.data.display_name || body.data.formatted_address || label;
        } else if (Array.isArray(body?.data) && body.data[0]?.lat && body.data[0]?.lon) {
            lat = Number(body.data[0].lat);
            lon = Number(body.data[0].lon);
            label = body.data[0].display_name || label;
        }

        if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
            const [x, y] = latLonToSvg(lat, lon);
            return { x, y, lat, lon, label };
        }
        return null;
    }, [body]);

    const activeProvince = useMemo(() => {
        return PROVINCES.find((p) => p.code === activeProvinceCode) ?? PROVINCES[0];
    }, [activeProvinceCode]);

    // Handle province selection on Atlas Canvas or Chart
    const handleSelectProvince = (p: HeroProvince) => {
        setActiveProvinceCode(p.code);
        // Automatically query that province
        const ep = ENDPOINTS.find((e) => e.id === "admin-province-districts") ?? selectedEndpoint;
        handleSelectEndpoint(ep, { id: String(p.id) });
        const path = `/api/admin/provinces/${p.id}/districts`;
        setCustomUrl(path);
        handleSend(path);
    };

    // ==========================================
    // 1. ATLAS COMMAND CENTER (Default Mode)
    // ==========================================
    if (viewMode === "atlas") {
        return (
            <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#07090e] text-slate-100 font-sans select-none scheme-dark">
                {/* Top Command Bar */}
                <AtlasTopBar
                    category={atlasCategory}
                    onSelectCategory={handleSelectCategory}
                    log={log}
                    viewMode={viewMode}
                    onToggleViewMode={() => setViewMode("classic")}
                />

                {/* Central Command Stage */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Background SVG Spatial Canvas with Arcs, Centroids, and Stars */}
                    <AtlasCanvas
                        activeProvince={activeProvince}
                        highlightedCodes={highlightedProvinceCodes}
                        geocodeMarker={geocodeMarker}
                        networkEnabled={networkEnabled}
                        onSelectProvince={handleSelectProvince}
                        onToggleNetwork={() => setNetworkEnabled((prev) => !prev)}
                    />

                    {/* Left Floating Command Dock */}
                    <div className="absolute left-4 top-4 z-30">
                        <AtlasDock
                            activePanel={activePanel}
                            onTogglePanel={(p) => setActivePanel(p)}
                            onExecute={() => handleSend()}
                            pending={pending}
                            networkEnabled={networkEnabled}
                            onToggleNetwork={() => setNetworkEnabled((prev) => !prev)}
                            lang={lang}
                            onToggleLang={() => setLang(lang === "km" ? "en" : "km")}
                            theme={dark ? "dark" : "light"}
                            onToggleTheme={toggleTheme}
                        />
                    </div>

                    {/* Top-Left Spatial Console HUD Card */}
                    <div className="absolute left-18 top-4 z-20 max-w-sm sm:max-w-md hidden md:block">
                        <AtlasConsoleHUD
                            selectedEndpoint={selectedEndpoint}
                            customUrl={customUrl}
                            onUrlChange={(u) => setCustomUrl(u)}
                            onSend={() => handleSend()}
                            pending={pending}
                            onOpenEndpoints={() => setActivePanel("endpoints")}
                        />
                    </div>

                    {/* Top-Right Key Hubs HUD Card */}
                    <div className="absolute right-5 top-4 z-20 hidden lg:block">
                        <AtlasHubsHUD
                            onSelectProvince={handleSelectProvince}
                            activeProvinceCode={activeProvinceCode}
                        />
                    </div>

                    {/* Center Floating Inspector Card (Avionics Equipment Style) */}
                    <div className="absolute left-18 bottom-12 z-20 hidden sm:block md:left-22">
                        <AtlasInspector
                            province={activeProvince}
                            log={log}
                            endpointPath={customUrl}
                            onDrillDown={handleDrillDown}
                            onOpenRaw={() => setActivePanel("raw")}
                            onOpenTable={() => setActivePanel("table")}
                        />
                    </div>

                    {/* Bottom-Right 2D Scatter Matrix Chart */}
                    <div className="absolute right-5 bottom-16 z-20 hidden md:block w-76">
                        <AtlasChart
                            activeProvinceCode={activeProvinceCode}
                            onSelectProvince={handleSelectProvince}
                        />
                    </div>

                    {/* Bottom-Left Micro Status Legend */}
                    <div className="absolute left-18 bottom-3 z-20 flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-[#080b13]/80 px-3 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-md">
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                            <strong className="text-slate-200">PROVINCES</strong> (25)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                            <strong className="text-slate-200">DISTRICTS</strong> (210)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                            <strong className="text-slate-200">COMMUNES</strong> (1,661)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                            <strong className="text-slate-200">VILLAGES</strong> (14,576)
                        </span>
                    </div>
                </div>

                {/* Slide-over Drawers (Endpoints, Params, Raw JSON, Data Table, Presets) */}
                <AtlasDrawers
                    activePanel={activePanel}
                    onClose={() => setActivePanel("none")}
                    endpoints={filteredEndpoints}
                    selectedEndpoint={selectedEndpoint}
                    onSelectEndpoint={(ep) => handleSelectEndpoint(ep)}
                    paramValues={paramValues}
                    onParamChange={handleParamChange}
                    onResetParams={handleResetParams}
                    log={log}
                    customUrl={customUrl}
                    onApplyPreset={handleApplyPreset}
                    onDrillDown={handleDrillDown}
                />
            </div>
        );
    }

    // ==========================================
    // 2. CLASSIC SPLIT CONSOLE (Secondary Mode)
    // ==========================================
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

                        {/* Switch to Atlas Command Center Button */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setViewMode("atlas")}
                                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-rose-500 px-3.5 py-1.5 font-mono text-xs font-bold text-white shadow-lg hover:opacity-95 transition-all"
                            >
                                <Icon name="sparkles" className="size-3.5" />
                                <span>Switch to Atlas Control Map →</span>
                            </button>
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

                        {/* Result Body */}
                        {pending ? (
                            <div className="flex min-h-95 flex-col items-center justify-center rounded-xl border border-line bg-surface p-8 text-center">
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
