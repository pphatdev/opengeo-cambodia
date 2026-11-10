import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { cx, focusRing, lvl } from "../../components/ui";
import { useI18n } from "../../i18n";
import { ApiError, apiGet, type RequestLog } from "../../lib/api";
import type { AdminItem, ApiEnvelope } from "../../lib/types";

interface Props {
    onPick: (item: AdminItem) => void;
    onLog: (entry: RequestLog) => void;
}

export function SearchBox({ onPick, onLog }: Props) {
    const { t, lang } = useI18n();
    const tRef = useRef(t);
    tRef.current = t;
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<AdminItem[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Debounced search; aborts stale requests
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setOpen(false);
            setItems([]);
            return;
        }
        const ctrl = new AbortController();
        const t = window.setTimeout(() => {
            apiGet<ApiEnvelope<AdminItem[]>>(`/api/admin/search?q=${encodeURIComponent(q)}&limit=8`, onLog, ctrl.signal)
                .then((j) => {
                    setItems(j.data);
                    setActive(0);
                    setMessage(j.data.length ? null : tRef.current("explore.noMatch", { q }));
                    setOpen(true);
                })
                .catch((e) => {
                    if (e?.name === "AbortError") return;
                    setItems([]);
                    setMessage(e instanceof ApiError && e.status === 429 ? tRef.current("explore.searchLimit") : (e as Error).message);
                    setOpen(true);
                });
        }, 220);
        return () => {
            window.clearTimeout(t);
            ctrl.abort();
        };
    }, [query, onLog]);

    // "/" focuses search from anywhere on the page
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (document.activeElement?.tagName || "").toUpperCase();
            if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const pick = (i: number) => {
        const it = items[i];
        if (!it) return;
        setOpen(false);
        setQuery(lang === "km" ? it.name_km : it.name_en);
        inputRef.current?.blur();
        onPick(it);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open || !items.length) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            pick(active);
        } else if (e.key === "Escape") setOpen(false);
    };

    return (
        <div className="relative border-b border-line/60 p-4">
            <label htmlFor="search" className="sr-only">{t("explore.searchLabel")}</label>
            <Icon name="search" className="pointer-events-none absolute left-7 top-7 size-4.25 text-ink-3" />
            <input
                ref={inputRef}
                id="search"
                className={cx("h-10.5 w-full rounded-xl border border-line/70 bg-surface/75 pl-9.5 pr-10 text-sm text-ink backdrop-blur-sm transition-all focus:bg-surface focus:border-accent km:font-khmer", focusRing)}
                type="search"
                placeholder={t("explore.searchPlaceholder")}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls="search-results"
                aria-activedescendant={open && items.length ? `sr-${active}` : undefined}
                maxLength={50}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => items.length && query.trim().length >= 2 && setOpen(true)}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            />
            <kbd aria-hidden="true" className="absolute right-6.5 top-6.75 rounded-[6px] glass-pill px-1.75 py-px font-mono text-[11px] font-medium text-ink-3">/</kbd>
            {open && (
                <div className="absolute inset-x-4 top-15.5 z-600 max-h-90 overflow-y-auto rounded-xl glass-panel p-1.5 shadow-glass-lg animate-pop" id="search-results" role="listbox" ref={listRef}>
                    {message && <div className="p-3.5 text-[13.5px] text-ink-3">{message}</div>}
                    {items.map((it, i) => (
                        <button
                            key={it.id}
                            id={`sr-${i}`}
                            data-i={i}
                            className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-ink hover:bg-surface-2 aria-selected:bg-surface-2"
                            type="button"
                            role="option"
                            aria-selected={i === active}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(i);
                            }}
                            onMouseEnter={() => setActive(i)}
                        >
                            <span className={lvl(it.level)}>{it.level ? (lang === "km" ? t(`level.${it.level}`) : it.level.slice(0, 4)) : ""}</span>
                            <span>
                                <span className={cx("block text-sm font-medium leading-[1.3]", lang === "km" && "font-khmer")}>{lang === "km" ? it.name_km : it.name_en}</span>
                                <span className={cx("text-[12.5px] text-ink-3", lang !== "km" && "font-khmer")}>{lang === "km" ? it.name_en : it.name_km}</span>
                            </span>
                            <span className="font-mono text-xs text-ink-3">{it.code}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
