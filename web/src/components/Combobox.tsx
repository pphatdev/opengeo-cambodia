import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { cx } from "./ui";

export interface ComboboxOption {
    value: string;
    label: string;
    /** Secondary text shown muted after the label (e.g. the name in the other language). */
    hint?: string;
    /** Extra text matched by search but not shown (e.g. codes). */
    keywords?: string;
    labelClassName?: string;
    hintClassName?: string;
}

interface ComboboxProps {
    id?: string;
    options: ComboboxOption[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder: string;
    /** Show a search box in the popover (on by default). */
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: (query: string) => string;
    /** Choosing the selected option again clears it, like shadcn's combobox example. */
    clearable?: boolean;
    disabled?: boolean;
    size?: "md" | "sm";
    triggerClassName?: string;
    itemClassName?: string;
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ\s\-_'’.]/g, "");

/**
 * shadcn-style Combobox (Popover + Command) without the Radix/cmdk dependencies.
 * Follows the WAI-ARIA combobox pattern: the trigger is a button with role="combobox",
 * the popover holds an optional search input and a listbox navigated with the arrow keys.
 */
export function Combobox({
    id,
    options,
    value,
    onChange,
    placeholder,
    searchable = true,
    searchPlaceholder,
    emptyText = () => "No results.",
    clearable = false,
    disabled = false,
    size = "md",
    triggerClassName,
    itemClassName,
}: ComboboxProps) {
    const autoId = useId();
    const listId = `${id ?? autoId}-list`;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value) ?? null;

    const filtered = useMemo(() => {
        const q = normalize(query);
        if (!q) return options;
        return options.filter((o) => normalize(`${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`).includes(q));
    }, [options, query]);

    // Place the popover under the trigger (or above it when there isn't room below)
    const place = useCallback(() => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (!r) return;
        const popHeight = popRef.current?.offsetHeight ?? 320;
        const below = window.innerHeight - r.bottom;
        const up = below < popHeight + 12 && r.top > below;
        setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 220), up });
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        place();
        const onMove = () => place();
        window.addEventListener("resize", onMove);
        window.addEventListener("scroll", onMove, true);
        return () => {
            window.removeEventListener("resize", onMove);
            window.removeEventListener("scroll", onMove, true);
        };
    }, [open, place, filtered.length]);

    // Close on outside press
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (!popRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);

    // On open: reset the search, highlight the selected option, focus the search box
    useEffect(() => {
        if (!open) return;
        setQuery("");
        const i = options.findIndex((o) => o.value === value);
        setActive(i >= 0 ? i : 0);
        requestAnimationFrame(() => (searchable ? inputRef.current : listRef.current)?.focus());
    }, [open]); // only when opening

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    const close = (refocus = true) => {
        setOpen(false);
        if (refocus) triggerRef.current?.focus();
    };

    const choose = (opt: ComboboxOption) => {
        onChange(clearable && opt.value === value ? null : opt.value);
        close();
    };

    const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
        // While open (e.g. keys pressed before focus reaches the popover), drive the list
        if (open) return onListKey(e);
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
        }
    };

    const onListKey = (e: KeyboardEvent) => {
        const last = filtered.length - 1;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a >= last ? 0 : a + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? last : a - 1));
        } else if (e.key === "Home") {
            e.preventDefault();
            setActive(0);
        } else if (e.key === "End") {
            e.preventDefault();
            setActive(last);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[active]) choose(filtered[active]);
        } else if (e.key === "Escape") {
            e.preventDefault();
            close();
        } else if (e.key === "Tab") {
            setOpen(false);
        }
    };

    const sm = size === "sm";
    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={onTriggerKey}
                className={cx(
                    "flex w-full cursor-pointer items-center justify-between gap-2 border border-line/70 bg-surface/80 text-left text-ink backdrop-blur-sm transition-all",
                    "hover:border-accent/40 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--og-accent-soft)] focus-visible:outline-none",
                    "aria-expanded:border-accent aria-expanded:shadow-[0_0_0_3px_var(--og-accent-soft)]",
                    "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50",
                    sm ? "h-8.5 rounded-lg px-2.5 text-[13px]" : "h-10 rounded-xl pl-2.75 pr-2.5 text-sm",
                    triggerClassName,
                )}
            >
                <span className="flex min-w-0 items-baseline gap-1.5">
                    {selected ? (
                        <>
                            <span className={cx("truncate", selected.labelClassName)}>{selected.label}</span>
                            {selected.hint && <span className={cx("truncate text-xs text-ink-3", selected.hintClassName)}>{selected.hint}</span>}
                        </>
                    ) : (
                        <span className="truncate text-ink-3">{placeholder}</span>
                    )}
                </span>
                <Icon name="chevrons" className="size-4 flex-none text-ink-3" />
            </button>

            {open &&
                createPortal(
                    <div
                        ref={popRef}
                        style={pos ? { left: pos.left, top: pos.top, width: pos.width, transform: pos.up ? "translateY(-100%)" : undefined } : { visibility: "hidden" }}
                        className="fixed z-1100 overflow-hidden rounded-xl glass-panel text-ink shadow-glass-lg animate-pop"
                        onKeyDown={onListKey}
                    >
                        {searchable && (
                            <div className="flex items-center gap-2 border-b border-line/60 bg-surface-2/30 px-3">
                                <Icon name="search" className="size-4 flex-none text-ink-3" />
                                <input
                                    ref={inputRef}
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setActive(0);
                                    }}
                                    placeholder={searchPlaceholder}
                                    role="combobox"
                                    aria-expanded="true"
                                    aria-controls={listId}
                                    aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
                                    aria-autocomplete="list"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="h-10 w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3 km:font-khmer"
                                />
                            </div>
                        )}
                        <div
                            ref={listRef}
                            id={listId}
                            role="listbox"
                            tabIndex={searchable ? -1 : 0}
                            aria-activedescendant={!searchable && filtered[active] ? `${listId}-${active}` : undefined}
                            className="scrollbar-thin max-h-70 overflow-y-auto p-1 outline-none"
                        >
                            {filtered.length === 0 ? (
                                <div className="px-2 py-6 text-center text-sm text-ink-3">{emptyText(query)}</div>
                            ) : (
                                filtered.map((o, i) => {
                                    const isSelected = o.value === value;
                                    return (
                                        <div
                                            key={o.value}
                                            id={`${listId}-${i}`}
                                            data-index={i}
                                            role="option"
                                            aria-selected={isSelected}
                                            data-active={i === active || undefined}
                                            onPointerMove={() => i !== active && setActive(i)}
                                            onPointerDown={(e) => e.preventDefault() /* keep focus in the popover */}
                                            onClick={() => choose(o)}
                                            className={cx(
                                                "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm data-active:bg-surface-2",
                                                itemClassName,
                                            )}
                                        >
                                            <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                                                <span className={cx("truncate", o.labelClassName)}>{o.label}</span>
                                                {o.hint && <span className={cx("truncate text-xs text-ink-3", o.hintClassName)}>{o.hint}</span>}
                                            </span>
                                            <Icon name="check" className={cx("size-4 flex-none text-accent", isSelected ? "opacity-100" : "opacity-0")} />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
