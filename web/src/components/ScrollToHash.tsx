import { useEffect } from "react";
import { useLocation } from "react-router";

/** Scroll to `#hash` targets after client-side navigation (and to top on page change). */
export function ScrollToHash() {
    const { pathname, hash } = useLocation();
    useEffect(() => {
        if (!hash) {
            window.scrollTo(0, 0);
            return;
        }
        // The target may not exist yet: /docs is a lazy-loaded chunk, so on a fresh deep link
        // (e.g. /docs#ep-admin-search) it can take a network round-trip to render. Keep looking for 3s.
        const id = decodeURIComponent(hash.slice(1));
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
