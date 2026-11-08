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
import { AtlasCockpitSidebar, type CockpitTab } from "./AtlasCockpitSidebar";
import { type AtlasActivePanel, AtlasDrawers } from "./AtlasDrawers";
import { AtlasInspector } from "./AtlasInspector";
import { AtlasPlaceChips, type PlaceChipItem } from "./AtlasPlaceChips";
import { AtlasCategory, type AtlasTier, AtlasTopBar } from "./AtlasTopBar";
import { EndpointSelector } from "./EndpointSelector";
import { PlaygroundHeaders } from "./PlaygroundHeaders";
import { PlaygroundHeroPreview } from "./PlaygroundHeroPreview";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";
import { type PlaygroundPreset } from "./presets";

type PreviewTab = "map" | "raw" | "table" | "headers";

const TOUR = ["12", "17", "02", "07", "18", "03", "11", "16", "09", "13", "08", "21"];

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

    // Mode: Atlas Cockpit (default) vs Classic Console
    const [viewMode, setViewMode] = useState<"atlas" | "classic">("atlas");
    const [cockpitTab, setCockpitTab] = useState<CockpitTab>("overview");
    const [atlasCategory, setAtlasCategory] = useState<AtlasCategory>("ALL");
    const [activeTier, setActiveTier] = useState<AtlasTier>("all");
    const [activePanel, setActivePanel] = useState<AtlasActivePanel>("none");
    const [networkEnabled, setNetworkEnabled] = useState(true);
    const [autoTour, setAutoTour] = useState(false);

    // Recent queries history
    const [recentQueries, setRecentQueries] = useState<string[]>(() => [
        "/api/admin/provinces/12/districts",
        "/api/boundaries/provinces",
        "/api/admin/hierarchy/12010101",
    ]);

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
            // Save to recent queries
            setRecentQueries((prev) => {
                const updated = [path, ...prev.filter((p) => p !== path)].slice(0, 6);
                return updated;
            });
        } catch (err) {
            setResult(entry ? { log: entry } : { log: null, error: (err as Error).message });
        } finally {
            setPending(false);
        }
    }, [customUrl, selectedEndpoint, paramValues, toast, t]);

    // Keyboard shortcuts: Cmd+Enter (Send), Cmd+K (Search), Esc (Close drawers)
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
            if (e.key === "Escape") {
                setActivePanel("none");
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleSend]);

    // Auto-Tour effect: automatically cycles provinces when enabled
    useEffect(() => {
        if (!autoTour) return;
        const interval = window.setInterval(() => {
            setActiveProvinceCode((current) => {
                const nextIdx = (TOUR.indexOf(current) + 1) % TOUR.length;
                const nextCode = TOUR[nextIdx];
                const p = PROVINCES.find((prov) => prov.code === nextCode);
                if (p) {
                    const path = `/api/admin/provinces/${p.id}/districts`;
                    setCustomUrl(path);
                    apiGet(path, (l) => setResult({ log: l })).catch(() => {});
                }
                return nextCode;
            });
        }, 4500);
        return () => window.clearInterval(interval);
    }, [autoTour]);

    // Apply preset
    const handleApplyPreset = (preset: PlaygroundPreset) => {
        const ep = ENDPOINTS.find((e) => e.id === preset.endpointId);
        if (ep) {
            handleSelectEndpoint(ep, preset.params);
            setCustomUrl(preset.path);
            handleSend(preset.path);
        }
    };

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

    // Place chips extracted from response
    const placeChips = useMemo<PlaceChipItem[]>(() => {
        if (Array.isArray(body?.data)) {
            return body.data.slice(0, 30).map((it: any) => ({
                id: it.id ?? it.code,
                code: String(it.code ?? it.id ?? ""),
                name_en: it.name_en || it.name || "Item",
                name_km: it.name_km,
                level: it.level || it.administrative_unit,
                province_code: it.province_code,
                district_code: it.district_code,
                commune_code: it.commune_code,
            }));
        }
        if (Array.isArray(body?.features)) {
            return body.features.slice(0, 30).map((f: any) => ({
                id: f.properties?.code ?? f.properties?.id,
                code: String(f.properties?.code ?? f.properties?.id ?? ""),
                name_en: f.properties?.name_en || f.properties?.name || "Feature",
                name_km: f.properties?.name_km,
                level: f.properties?.level || "boundary",
                province_code: f.properties?.province_code,
                district_code: f.properties?.district_code,
                commune_code: f.properties?.commune_code,
            }));
        }
        return [];
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

    // Intelligent context-aware province selection
    const handleSelectProvince = (p: HeroProvince) => {
        setActiveProvinceCode(p.code);
        if (autoTour) setAutoTour(false);

        let path = `/api/admin/provinces/${p.id}/districts`;
        let targetEp = selectedEndpoint;

        if (selectedEndpoint.group === "boundaries") {
            path = `/api/boundaries/provinces/${p.code}`;
            targetEp = ENDPOINTS.find((e) => e.id === "b-province") ?? selectedEndpoint;
        } else if (selectedEndpoint.group === "geocode") {
            const lat = (p.cy / 80).toFixed(4);
            const lon = (p.cx / 80).toFixed(4);
            path = `/api/geocode/reverse?lat=${lat}&lon=${lon}`;
            targetEp = ENDPOINTS.find((e) => e.id === "geo-reverse") ?? selectedEndpoint;
        } else if (selectedEndpoint.id === "admin-province") {
            path = `/api/admin/provinces/${p.id}`;
            targetEp = selectedEndpoint;
        } else {
            path = `/api/admin/provinces/${p.id}/districts`;
            targetEp = ENDPOINTS.find((e) => e.id === "admin-districts") ?? selectedEndpoint;
        }

        handleSelectEndpoint(targetEp, { id: String(p.id), code: p.code });
        setCustomUrl(path);
        handleSend(path);
    };

    // Selecting a place chip highlights the corresponding province
    const handleSelectPlaceChip = (chip: PlaceChipItem) => {
        const pCode = extractProvinceCode(chip.code || chip.province_code);
        if (pCode && PROVINCES.some((p) => p.code === pCode)) {
            setActiveProvinceCode(pCode);
        }
    };

    // Tier selection navigation
    const handleSelectTier = (tier: AtlasTier) => {
        setActiveTier(tier);
        let path = "/api/admin/provinces";
        let targetEp = ENDPOINTS[0];
        if (tier === "province") {
            path = "/api/admin/provinces";
            targetEp = ENDPOINTS.find((e) => e.id === "admin-provinces") ?? targetEp;
        } else if (tier === "district") {
            path = `/api/admin/provinces/${activeProvince.id}/districts`;
            targetEp = ENDPOINTS.find((e) => e.id === "admin-districts") ?? targetEp;
        } else if (tier === "commune") {
            path = "/api/admin/districts/1201/communes";
            targetEp = ENDPOINTS.find((e) => e.id === "admin-communes") ?? targetEp;
        } else if (tier === "village") {
            path = "/api/admin/communes/120101/villages";
            targetEp = ENDPOINTS.find((e) => e.id === "admin-villages") ?? targetEp;
        }
        handleSelectEndpoint(targetEp);
        setCustomUrl(path);
        handleSend(path);
    };

    // ==========================================
    // 1. ATLAS COCKPIT FRAMEWORK (Default Mode)
    // ==========================================
    if (viewMode === "atlas") {
        return (
            <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#04060b] p-2 sm:p-3 text-slate-100 font-sans select-none scheme-dark">
                {/* Dual Ambient Backlight Aura (Golden Top-Right, Cyan Bottom-Left) */}
                <div className="absolute -top-24 -right-24 size-[650px] rounded-full bg-amber-500/18 blur-[130px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 size-[650px] rounded-full bg-cyan-500/22 blur-[130px] pointer-events-none" />

                {/* The Cockpit Frame Shell (Rounded Dark Matte Canvas) */}
                <div className="relative flex h-full w-full max-w-[1840px] flex-col rounded-3xl border border-white/10 bg-[#070a13] shadow-[0_0_80px_rgba(0,0,0,0.95),-15px_15px_80px_rgba(6,182,212,0.18),15px_-15px_80px_rgba(245,158,11,0.14)] overflow-hidden ring-1 ring-white/5">
                    {/* Top Slim Utility & Tier Bar */}
                    <AtlasTopBar
                        category={atlasCategory}
                        onSelectCategory={handleSelectCategory}
                        tier={activeTier}
                        onSelectTier={handleSelectTier}
                        log={log}
                        customUrl={customUrl}
                        viewMode={viewMode}
                        onToggleViewMode={() => setViewMode("classic")}
                        activePanel={activePanel}
                        onTogglePanel={(p) => setActivePanel(p)}
                        lang={lang}
                        onToggleLang={() => setLang(lang === "km" ? "en" : "km")}
                        theme={dark ? "dark" : "light"}
                        onToggleTheme={toggleTheme}
                        autoTour={autoTour}
                        onToggleAutoTour={() => setAutoTour((a) => !a)}
                        itemCount={placeChips.length}
                    />

                    {/* Main Cockpit Body: Left Dashboard Column + Center 3D Map */}
                    <div className="relative flex-1 flex overflow-hidden min-h-0">
                        {/* Left Dashboard Column (Icon Rail + KPI Metrics + Donut Rings + Arc Gauges + Query Console) */}
                        <div className="h-full flex-none w-88 lg:w-96 flex">
                            <AtlasCockpitSidebar
                                activeTab={cockpitTab}
                                onSelectTab={setCockpitTab}
                                activeProvince={activeProvince}
                                onSelectProvince={handleSelectProvince}
                                selectedEndpoint={selectedEndpoint}
                                endpoints={filteredEndpoints}
                                onSelectEndpoint={(ep) => handleSelectEndpoint(ep)}
                                customUrl={customUrl}
                                onUrlChange={(u) => setCustomUrl(u)}
                                onSend={() => handleSend()}
                                pending={pending}
                                log={log}
                                onOpenParams={() => setActivePanel("params")}
                                onOpenRaw={() => setActivePanel("raw")}
                                onOpenTable={() => setActivePanel("table")}
                                recentQueries={recentQueries}
                                onSelectRecentQuery={(path) => {
                                    setCustomUrl(path);
                                    handleSend(path);
                                }}
                                theme={dark ? "dark" : "light"}
                                onToggleTheme={toggleTheme}
                                lang={lang}
                                onToggleLang={() => setLang(lang === "km" ? "en" : "km")}
                            />
                        </div>

                        {/* Center Stage: 3D Holographic Map Canvas */}
                        <div className="flex-1 relative h-full overflow-hidden flex flex-col bg-[#060911]">
                            <AtlasCanvas
                                activeProvince={activeProvince}
                                highlightedCodes={highlightedProvinceCodes}
                                geocodeMarker={geocodeMarker}
                                networkEnabled={networkEnabled}
                                onSelectProvince={handleSelectProvince}
                                onToggleNetwork={() => setNetworkEnabled((prev) => !prev)}
                            />

                            {/* Center Floating Inspector Card (Bottom-Left) */}
                            <div className="absolute left-4 bottom-5 z-20 hidden md:block">
                                <AtlasInspector
                                    province={activeProvince}
                                    log={log}
                                    endpointPath={customUrl}
                                    onDrillDown={handleDrillDown}
                                    onOpenRaw={() => setActivePanel("raw")}
                                    onOpenTable={() => setActivePanel("table")}
                                />
                            </div>

                            {/* Floating Response Place Chips Strip (Centered Bottom) */}
                            {placeChips.length > 0 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(90%,680px)] hidden sm:block">
                                    <AtlasPlaceChips
                                        items={placeChips}
                                        activeCode={activeProvinceCode}
                                        onSelectPlace={handleSelectPlaceChip}
                                        onDrillDown={handleDrillDown}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Slide-over Drawers (Params, Raw JSON, Data Table, Presets) */}
                    <AtlasDrawers
                        activePanel={activePanel}
                        onClose={() => setActivePanel("none")}
                        selectedEndpoint={selectedEndpoint}
                        paramValues={paramValues}
                        onParamChange={handleParamChange}
                        onResetParams={handleResetParams}
                        log={log}
                        customUrl={customUrl}
                        onApplyPreset={handleApplyPreset}
                        onDrillDown={handleDrillDown}
                    />
                </div>
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
                                <span>Switch to Cockpit Map →</span>
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
