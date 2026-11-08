import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Icon } from "../../components/Icon";
import { Nav } from "../../components/Nav";
import { cx, lvl, wrap } from "../../components/ui";
import { useI18n } from "../../i18n";
import { apiGet, fmtBytes, PROD_ORIGIN, type RequestLog } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { buildPath, displayPath, ENDPOINTS, type Endpoint } from "../docs/endpoints";
import { PlaygroundFloatingRequest } from "./PlaygroundFloatingRequest";
import { PlaygroundHeaders } from "./PlaygroundHeaders";
import { PlaygroundHeroPreview } from "./PlaygroundHeroPreview";
import { PlaygroundMap } from "./PlaygroundMap";
import { PlaygroundRawPreview } from "./PlaygroundRawPreview";
import { PlaygroundUiPreview } from "./PlaygroundUiPreview";
import { Explorer } from "../home/Explorer";

type PreviewTab = "map" | "table" | "drilldown" | "raw" | "headers";
const VALID_TABS: PreviewTab[] = ["map", "table", "drilldown", "raw", "headers"];

export default function Playground() {
    const { t, lang } = useI18n();
    const { toast } = useToast();
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

    const tabParam = searchParams.get("tab") as PreviewTab | null;
    const initialTab: PreviewTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "map";
    const [activeTab, setActiveTabState] = useState<PreviewTab>(initialTab);
    const [pending, setPending] = useState(false);
    const [result, setResult] = useState<{ log: RequestLog | null; error?: string } | null>(null);

    // Sync tab when URL changes
    useEffect(() => {
        const t = searchParams.get("tab") as PreviewTab | null;
        if (t && VALID_TABS.includes(t)) {
            setActiveTabState(t);
        }
    }, [searchParams]);

    const setActiveTab = useCallback((tab: PreviewTab) => {
        setActiveTabState(tab);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("tab", tab);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Update endpoint
    const handleSelectEndpoint = useCallback((ep: Endpoint, newParams?: Record<string, string>) => {
        setSelectedEndpoint(ep);
        const nextParams = newParams ?? Object.fromEntries((ep.params ?? []).map((p) => [p.name, p.example ?? ""]));
        setParamValues(nextParams);
        const built = displayPath(ep, nextParams);
        setCustomUrl(built);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("ep", ep.id);
            return next;
        }, { replace: true });
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
            handleSelectEndpoint(matched, params);
        }
        setCustomUrl(path);
        handleSend(path);
    };

    const log = result?.log;
    const body = log?.body as any;
    const isGeoJson = body && typeof body === "object" && (
        (body.type === "FeatureCollection" && Array.isArray(body.features)) ||
        (body.type === "Feature" && body.geometry)
    );
    const featuresCount = isGeoJson
        ? (body.type === "FeatureCollection" ? body.features.length : 1)
        : 0;
    const firstFeatureProps = isGeoJson
        ? (body.type === "FeatureCollection" ? body.features[0]?.properties : body.properties)
        : null;
    const boundaryLevel = firstFeatureProps?.level;
    const fullProdUrl = PROD_ORIGIN + (customUrl.startsWith("/") ? customUrl : `/${customUrl}`);

    return (
        <div className="min-h-screen bg-bg text-ink flex flex-col font-sans">
            <Nav variant="playground" />


            {/* Main Playground Content */}
            <main id="request-console" className={cx(wrap, "flex-1 py-8")}>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl">
                        <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-line bg-surface-2 p-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab("map")}
                                className={cx(
                                    "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
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
                                    "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                    activeTab === "table" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                )}
                            >
                                <Icon name="table" className="size-3.5" />
                                <span>{t("playground.tabTable")}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("drilldown")}
                                className={cx(
                                    "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                                    activeTab === "drilldown" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-3 hover:text-ink",
                                )}
                                title={t("explore.title")}
                            >
                                <Icon name="chevrons" className="size-3.5" />
                                <span>{t("playground.tabDrillDown")}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("raw")}
                                className={cx(
                                    "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
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
                                    "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
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
                                    {log.ms.toFixed(2)}ms
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
                            {isGeoJson ? (
                                <div className="space-y-4">
                                    {/* GeoJSON Boundary Summary Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                                                {body.type}
                                            </span>
                                            <span className="text-sm font-semibold text-ink">
                                                {featuresCount} {featuresCount === 1 ? "Boundary Polygon" : "Boundary Polygons"}
                                            </span>
                                            {boundaryLevel && (
                                                <span className={lvl(boundaryLevel)}>
                                                    {boundaryLevel} boundaries
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {body.bbox && (
                                                <span className="font-mono text-xs text-ink-3 max-sm:hidden">
                                                    bbox: [{body.bbox.map((n: number) => n.toFixed(2)).join(", ")}]
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDrillDown("/api/boundaries/provinces")}
                                                className="cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink hover:border-line-2"
                                            >
                                                All Provinces
                                            </button>
                                        </div>
                                    </div>

                                    {/* Interactive Leaflet Boundary Map */}
                                    <PlaygroundMap
                                        geojson={body}
                                        onDrillDown={handleDrillDown}
                                        className="h-130 w-full"
                                    />
                                </div>
                            ) : (
                                <PlaygroundHeroPreview
                                    log={log}
                                    endpointPath={customUrl}
                                    onDrillDown={handleDrillDown}
                                    onSwitchTab={(tab) => setActiveTab(tab)}
                                />
                            )}
                        </div>
                    ) : activeTab === "drilldown" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl">
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-2 rounded-lg border border-line/70 bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-accent font-semibold mb-2 shadow-xs">
                                        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                                        <span>{t("explore.kicker")}</span>
                                    </div>
                                    <h2 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink">
                                        {t("explore.title")}
                                    </h2>
                                    <p className="m-0 mt-2 max-w-2xl text-xs sm:text-sm text-ink-3">
                                        {t("explore.intro")}
                                    </p>
                                </div>
                                <Explorer />
                            </div>
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
            </main>

            {/* Floating Request Console in Bottom-Right Corner */}
            <PlaygroundFloatingRequest
                endpoints={ENDPOINTS}
                selectedEndpoint={selectedEndpoint}
                onSelectEndpoint={handleSelectEndpoint}
                customUrl={customUrl}
                onUrlChange={(u) => setCustomUrl(u)}
                paramValues={paramValues}
                onParamChange={handleParamChange}
                onResetParams={handleResetParams}
                onSend={() => handleSend()}
                pending={pending}
                log={log}
            />
        </div>
    );
}
