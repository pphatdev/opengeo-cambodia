import { useEffect, useRef, useState } from "react";

/** Public collection in the OpenGeo Cambodia Postman workspace. */
const COLLECTION_ID = "16827919-7df700c1-c7d3-4fd5-b8ab-c45182edcae6";
const WORKSPACE_ID = "8cb8ec50-4940-417a-b7d6-d89ebfd1855c";
const COLLECTION_URL = `entityId=${COLLECTION_ID}&entityType=collection&workspaceId=${WORKSPACE_ID}`;
/** Same fork flow as Postman's Markdown badge — used when button.js is blocked (ad/tracker blockers). */
const FALLBACK_HREF = `https://app.getpostman.com/run-collection/${COLLECTION_ID}?action=collection%2Ffork&source=rip_markdown&collection-url=${encodeURIComponent(COLLECTION_URL)}`;
const SCRIPT_ID = "_pmPostmanRunObject";
const SCRIPT_SRC = "https://run.pstmn.io/button.js";

/**
 * Official "Run in Postman" button (fork the public collection).
 *
 * Postman's button.js only renders `.postman-run-button` elements present when it executes,
 * so in this SPA the script is (re)injected on each mount — lazily, once the button nears the viewport.
 */
export function PostmanRunButton({ className, eager = false }: { className?: string; /** Load the script immediately instead of when scrolled near. */ eager?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const [blocked, setBlocked] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const load = () => {
            const w = window as unknown as Record<string, unknown>;
            if (!w._pm) {
                w._pm = function (...args: unknown[]) {
                    ((w.PostmanRunObject as unknown[][]) ||= []).push(args);
                };
            }
            document.getElementById(SCRIPT_ID)?.remove();
            const s = document.createElement("script");
            s.id = SCRIPT_ID;
            s.async = true;
            s.src = SCRIPT_SRC;
            s.onerror = () => setBlocked(true);
            document.head.appendChild(s);
        };

        if (eager || !("IntersectionObserver" in window)) {
            load();
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    io.disconnect();
                    load();
                }
            },
            { rootMargin: "400px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [eager]);

    if (blocked) {
        return (
            <div className={className}>
                <a
                    href={FALLBACK_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#ff6c37] px-3 text-[13px] font-semibold text-white no-underline hover:bg-[#e85b28]"
                >
                    <svg viewBox="0 0 10 12" className="size-2.5 fill-current" aria-hidden="true"><path d="M0 0v12l10-6z" /></svg>
                    Run in Postman
                </a>
            </div>
        );
    }

    return (
        <div className={className}>
            <div
                ref={ref}
                className="postman-run-button"
                data-postman-action="collection/fork"
                data-postman-visibility="public"
                data-postman-var-1={COLLECTION_ID}
                data-postman-collection-url={COLLECTION_URL}
            />
        </div>
    );
}
