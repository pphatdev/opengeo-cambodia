import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
interface ThemeCtx {
    dark: boolean;
    toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

function readStored(): Theme | null {
    try {
        const t = localStorage.getItem("og-theme");
        return t === "light" || t === "dark" ? t : null;
    } catch {
        return null;
    }
}

const systemDark = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [stored, setStored] = useState<Theme | null>(readStored);
    const [sysDark, setSysDark] = useState(systemDark);

    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        if (!mq) return;
        const onChange = () => setSysDark(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
        if (stored) document.documentElement.setAttribute("data-theme", stored);
        else document.documentElement.removeAttribute("data-theme");
    }, [stored]);

    const dark = stored ? stored === "dark" : sysDark;
    const toggle = useCallback(() => {
        const next: Theme = dark ? "light" : "dark";
        setStored(next);
        try {
            localStorage.setItem("og-theme", next);
        } catch {
            /* storage unavailable */
        }
    }, [dark]);

    return <Ctx.Provider value={{ dark, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/** Read a CSS custom property from :root (used to colour map layers). */
export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
