import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./en";
import km from "./km";
import type { Lang, Localized, MessageKey, Messages } from "./types";

export type { Lang, Localized, MessageKey } from "./types";

const DICTS: Record<Lang, Messages> = { en, km };
const STORAGE_KEY = "og-lang";
export const LANGS: { id: Lang; label: string; name: string }[] = [
    { id: "en", label: "EN", name: "English" },
    { id: "km", label: "ខ្មែរ", name: "ភាសាខ្មែរ" },
];

type Vars = Record<string, string | number>;

interface I18nCtx {
    lang: Lang;
    setLang: (lang: Lang) => void;
    /** Plain string with {placeholders} filled in. */
    t: (key: MessageKey, vars?: Vars) => string;
    /** Rich text: renders <strong>, <em>, <code>, <km>, <br/> and <a href> from the message. */
    rt: (key: MessageKey, vars?: Vars) => ReactNode;
    /** Pick the current language from an inline { en, km } value. */
    tx: (value: Localized) => string;
}

function lookup(dict: Messages, key: string): string | undefined {
    let node: unknown = dict;
    for (const part of key.split(".")) {
        if (node && typeof node === "object") node = (node as Record<string, unknown>)[part];
        else return undefined;
    }
    return typeof node === "string" ? node : undefined;
}

const interpolate = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

function detectLang(): Lang {
    try {
        if (typeof window !== "undefined") {
            const fromUrl = new URLSearchParams(window.location.search).get("lang");
            if (fromUrl === "km" || fromUrl === "en") return fromUrl;
        }
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "km" || stored === "en") return stored;
    } catch {
        /* storage or URL unavailable */
    }
    return typeof navigator !== "undefined" && navigator.languages?.some((l) => l.toLowerCase().startsWith("km")) ? "km" : "en";
}

const I18n = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(detectLang);

    useEffect(() => {
        document.documentElement.lang = lang;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            /* ignore */
        }
    }, [lang]);

    // Reactively listen to URL ?lang= parameter changes (e.g. popstate, back/forward)
    useEffect(() => {
        const syncFromUrl = () => {
            const urlLang = new URLSearchParams(window.location.search).get("lang");
            if ((urlLang === "km" || urlLang === "en") && urlLang !== lang) {
                setLangState(urlLang);
            }
        };
        window.addEventListener("popstate", syncFromUrl);
        return () => window.removeEventListener("popstate", syncFromUrl);
    }, [lang]);

    // Explicit switch handler updates state, localStorage, and synchronizes URL query
    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
            if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                if (next === "km") {
                    url.searchParams.set("lang", "km");
                } else {
                    url.searchParams.delete("lang");
                }
                window.history.replaceState(null, "", url.pathname + url.search + url.hash);
            }
        } catch {
            /* ignore */
        }
    }, []);

    const value = useMemo<I18nCtx>(() => {
        const t = (key: MessageKey, vars?: Vars) => interpolate(lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key, vars);
        return {
            lang,
            setLang,
            t,
            rt: (key, vars) => renderRich(t(key, vars)),
            tx: (v) => v[lang] || v.en,
        };
    }, [lang, setLang]);

    return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n(): I18nCtx {
    const ctx = useContext(I18n);
    if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
    return ctx;
}

/**
 * Minimal markup renderer for trusted message strings (never user input).
 * Supports nesting, e.g. <a href="#x"><code>…</code></a>.
 */
export function renderRich(input: string): ReactNode {
    const re = /<(strong|em|code|km)>([\s\S]*?)<\/\1>|<a href="([^"]+)">([\s\S]*?)<\/a>|<br\s*\/?>/g;
    const out: ReactNode[] = [];
    let last = 0;
    let key = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input))) {
        if (m.index > last) out.push(input.slice(last, m.index));
        if (m[1]) {
            const inner = renderRich(m[2]);
            if (m[1] === "km") out.push(<span className="font-khmer" key={key++}>{inner}</span>);
            else if (m[1] === "strong") out.push(<strong key={key++}>{inner}</strong>);
            else if (m[1] === "em") out.push(<em key={key++}>{inner}</em>);
            else out.push(<code key={key++}>{inner}</code>);
        } else if (m[3]) {
            const href = m[3];
            const external = /^https?:/.test(href);
            out.push(
                <a key={key++} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {renderRich(m[4])}
                </a>,
            );
        } else out.push(<br key={key++} />);
        last = re.lastIndex;
    }
    if (last < input.length) out.push(input.slice(last));
    return out.length === 1 ? out[0] : out;
}
