import { lazy, Suspense, useEffect, useRef, useState } from "react";

/**
 * Loads the AI chat (widget, settings modal, Markdown parser, streaming client) out of the critical path.
 * - Fetched when the browser is idle after first render (or after a short timeout as a fallback)
 * - Fetched immediately if anything asks to open the chat before then; that request is replayed on mount
 */
const OPEN_EVENT = "open-opengeo-chat";

const ChatWidget = lazy(() => import("./ChatWidget").then((m) => ({ default: m.ChatWidget })));

type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
};

/** Re-fires an open request that arrived before the widget existed. Rendered after ChatWidget, so its effect
 *  runs after the widget has registered its own listener. */
function ReplayOpen({ pending }: { pending: React.RefObject<boolean> }) {
    useEffect(() => {
        if (pending.current) {
            pending.current = false;
            window.dispatchEvent(new CustomEvent(OPEN_EVENT));
        }
    }, [pending]);
    return null;
}

export function ChatLoader() {
    const [load, setLoad] = useState(false);
    const pendingOpen = useRef(false);

    useEffect(() => {
        if (load) return;
        const w = window as IdleWindow;
        const start = () => setLoad(true);
        const onOpen = () => {
            pendingOpen.current = true;
            setLoad(true);
        };
        window.addEventListener(OPEN_EVENT, onOpen);

        let idleId: number | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (w.requestIdleCallback) idleId = w.requestIdleCallback(start, { timeout: 4000 });
        else timer = setTimeout(start, 2500);

        return () => {
            window.removeEventListener(OPEN_EVENT, onOpen);
            if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
            if (timer) clearTimeout(timer);
        };
    }, [load]);

    if (!load) return null;
    return (
        <Suspense fallback={null}>
            <ChatWidget />
            <ReplayOpen pending={pendingOpen} />
        </Suspense>
    );
}
