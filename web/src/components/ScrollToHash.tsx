import { useEffect } from "react";
import { useLocation } from "react-router";

const PATH_MAP: Record<string, string> = {
    "01-introduction-and-domain-model": "introduction",
    "getting-started": "introduction",
    "02-architecture-and-performance": "responses",
    "system": "responses",
    "03-administrative-hierarchy-api": "ep-admin-provinces",
    "administrative": "ep-admin-provinces",
    "04-boundaries-and-point-in-polygon": "ep-b-zone",
    "boundaries": "ep-b-zone",
    "05-geocoding-and-reverse-lookup": "ep-geo-reverse",
    "geocoding": "ep-geo-reverse",
    "06-developer-integration-and-examples": "quickstart",
    "07-ai-agents-and-llms": "llms",
    "reference": "model-admin",
    "downloads": "downloads",
};

/** Scroll to `#hash` targets after client-side navigation (and to top on page change). */
export function ScrollToHash() {
    const { pathname, hash } = useLocation();
    useEffect(() => {
        let targetId = hash ? decodeURIComponent(hash.slice(1)) : "";
        if (!targetId && pathname.startsWith("/docs/")) {
            const parts = pathname.replace(/^\/docs\//, "").split("/").filter(Boolean);
            for (let i = parts.length - 1; i >= 0; i--) {
                if (PATH_MAP[parts[i]]) {
                    targetId = PATH_MAP[parts[i]];
                    break;
                }
            }
        }

        if (!targetId) {
            window.scrollTo(0, 0);
            return;
        }
        // The target may not exist yet: /docs is a lazy-loaded chunk, so on a fresh deep link
        // (e.g. /docs#ep-admin-search) it can take a network round-trip to render. Keep looking for 3s.
        const id = targetId;
        const deadline = performance.now() + 3000;
        let frame = 0;
        const tick = () => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "auto" });
            else if (performance.now() < deadline) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [pathname, hash]);
    return null;
}
