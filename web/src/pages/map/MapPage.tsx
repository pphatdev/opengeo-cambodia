import { Nav } from "../../components/Nav";
import { useSeo } from "../../components/Seo";
import { useI18n } from "../../i18n";
import { PROD_ORIGIN } from "../../lib/api";
import { PlaygroundMap } from "../playground/PlaygroundMap";

/**
 * /map — standalone Cambodia boundaries map.
 * Boundary layers (province / district / commune) are independent of the basemap (OSM, satellite, terrain or none).
 */
export default function MapPage() {
    const { t, lang } = useI18n();

    useSeo({
        title: t("meta.mapTitle"),
        description: t("meta.mapDesc"),
        canonical: lang === "km" ? `${PROD_ORIGIN}/map?lang=km` : `${PROD_ORIGIN}/map`,
    });

    return (
        <div className="flex min-h-dvh flex-col bg-bg font-sans text-ink">
            <Nav variant="map" />
            <main className="relative flex-1 p-3 max-sm:p-2">
                <h1 className="sr-only">{t("meta.mapTitle")}</h1>
                <PlaygroundMap
                    title={t("nav.map")}
                    className="h-[calc(100dvh-4rem-1.5rem)] w-full max-sm:h-[calc(100dvh-4rem-1rem)]"
                />
            </main>
        </div>
    );
}
