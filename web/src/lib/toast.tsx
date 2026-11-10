import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";

interface ToastCtx {
    toast: (message: string) => void;
    copy: (text: string, label?: string) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {}, copy: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
    const { t } = useI18n();
    const [message, setMessage] = useState("");
    const [show, setShow] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    const toast = useCallback((msg: string) => {
        setMessage(msg);
        setShow(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setShow(false), 1600);
    }, []);

    const copy = useCallback(
        (text: string, label?: string) => {
            const done = () => toast(label ?? t("common.copied"));
            const fallback = () => {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand("copy");
                    done();
                } catch {
                    toast(t("common.copyFailed"));
                }
                ta.remove();
            };
            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
            else fallback();
        },
        [toast, t],
    );

    return (
        <Ctx.Provider value={{ toast, copy }}>
            {children}
            <div
                className={`pointer-events-none fixed bottom-6 left-1/2 z-2000 -translate-x-1/2 rounded-full bg-ink px-4 py-2.25 text-[13px] font-medium text-bg transition duration-200 ${show ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
                role="status"
                aria-live="polite"
            >
                {message}
            </div>
        </Ctx.Provider>
    );
}

export const useToast = () => useContext(Ctx);
