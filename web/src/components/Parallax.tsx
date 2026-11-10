import {
    createElement,
    useEffect,
    useRef,
    type CSSProperties,
    type ElementType,
    type ReactNode,
} from "react";

/* ==========================================================================
   Parallax + scroll reveal
   - One shared rAF ticker for every layer (no per-layer scroll listeners)
   - Transforms only (GPU), measured against the untransformed parent → no feedback loop
   - Disabled entirely under prefers-reduced-motion
   ========================================================================== */

function prefersReducedMotion(): boolean {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
}

interface Layer {
    el: HTMLElement;
    /** px of movement per px the parent's centre is away from the viewport centre */
    speed: number;
    /** horizontal drift factor (same unit as speed) */
    x: number;
    /** extra scale per unit of progress (subtle zoom on scroll) */
    zoom: number;
    /** fade out as the parent scrolls off the top */
    fade: boolean;
    /** cap on |translateY| in px */
    max: number;
    /** "center": offset from viewport centre (mid-page sections). "scroll": offset = page scroll (hero at the top, starts at 0) */
    origin: "center" | "scroll";
}

const layers = new Set<Layer>();
let frame = 0;
let listening = false;

interface Pending {
    l: Layer;
    transform: string;
    opacity?: string;
}

// Last values written per element, so unchanged layers cost no style invalidation
const lastTransform = new WeakMap<HTMLElement, string>();
const lastOpacity = new WeakMap<HTMLElement, string>();

function update() {
    frame = 0;
    const vh = window.innerHeight || 1;
    const scrollY = window.scrollY;

    // Phase 1 — READ everything (one layout at most), compute targets
    const writes: Pending[] = [];
    for (const l of layers) {
        const host = l.el.parentElement;
        if (!host) continue;
        const r = host.getBoundingClientRect();
        // Skip work for sections far outside the viewport
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;

        const delta = l.origin === "scroll" ? -scrollY : r.top + r.height / 2 - vh / 2;
        const y = Math.max(-l.max, Math.min(l.max, -delta * l.speed));
        const x = -delta * l.x;
        const progress = Math.max(-1, Math.min(1, delta / vh));
        const scale = 1 + Math.abs(progress) * l.zoom;

        const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${l.zoom ? ` scale(${scale.toFixed(4)})` : ""}`;
        let opacity: string | undefined;
        if (l.fade) {
            // 1 while the section is on screen, → 0 as its bottom half scrolls past the top
            const past = Math.max(0, -r.top) / Math.max(1, r.height * 0.75);
            opacity = Math.max(0, 1 - past).toFixed(3);
        }
        writes.push({ l, transform, opacity });
    }

    // Phase 2 — WRITE everything (no reads in between → no forced reflow per layer)
    for (const w of writes) {
        if (lastTransform.get(w.l.el) !== w.transform) {
            w.l.el.style.transform = w.transform;
            lastTransform.set(w.l.el, w.transform);
        }
        if (w.opacity !== undefined && lastOpacity.get(w.l.el) !== w.opacity) {
            w.l.el.style.opacity = w.opacity;
            lastOpacity.set(w.l.el, w.opacity);
        }
    }
}

function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
}

function attach(layer: Layer) {
    layers.add(layer);
    if (!listening) {
        listening = true;
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule, { passive: true });
    }
    schedule();
}

function detach(layer: Layer) {
    layers.delete(layer);
    layer.el.style.transform = "";
    layer.el.style.opacity = "";
    lastTransform.delete(layer.el);
    lastOpacity.delete(layer.el);
    if (layers.size === 0 && listening) {
        listening = false;
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
    }
}

interface ParallaxProps {
    /** Positive = moves slower than the page (sinks back); negative = moves faster (floats forward). Typical 0.05–0.4 */
    speed?: number;
    x?: number;
    zoom?: number;
    fade?: boolean;
    max?: number;
    origin?: "center" | "scroll";
    /** Only animate at or above this viewport width (px). Default 0 (always). */
    minWidth?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    as?: ElementType;
    "aria-hidden"?: boolean | "true" | "false";
}

/**
 * A layer that drifts relative to its parent as the page scrolls.
 * The parent must not itself be a Parallax layer (it is the measuring reference).
 */
export function Parallax({
    speed = 0.15,
    x = 0,
    zoom = 0,
    fade = false,
    max = 240,
    origin = "center",
    minWidth = 0,
    className,
    style,
    children,
    as = "div",
    ...rest
}: ParallaxProps) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;

        let layer: Layer | null = null;
        const mq = minWidth > 0 ? window.matchMedia(`(min-width: ${minWidth}px)`) : null;
        const sync = () => {
            const on = !mq || mq.matches;
            if (on && !layer) {
                layer = { el, speed, x, zoom, fade, max, origin };
                attach(layer);
            } else if (!on && layer) {
                detach(layer);
                layer = null;
            }
        };
        sync();
        mq?.addEventListener("change", sync);
        return () => {
            mq?.removeEventListener("change", sync);
            if (layer) detach(layer);
        };
    }, [speed, x, zoom, fade, max, origin, minWidth]);

    return createElement(
        as,
        { ref, className, style: { willChange: "transform", ...style }, ...rest },
        children,
    );
}

/* -------------------------------------------------------------------------- */
/* Scroll reveal                                                              */
/* -------------------------------------------------------------------------- */

let revealObserver: IntersectionObserver | null = null;

function getRevealObserver(): IntersectionObserver | null {
    if (typeof IntersectionObserver === "undefined") return null;
    if (!revealObserver) {
        revealObserver = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        (e.target as HTMLElement).dataset.reveal = "in";
                        revealObserver?.unobserve(e.target);
                    }
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
        );
    }
    return revealObserver;
}

interface RevealProps {
    /** Delay in ms (use for staggering siblings) */
    delay?: number;
    /** Entrance direction */
    from?: "up" | "left" | "right" | "scale";
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    as?: ElementType;
    [key: string]: unknown;
}

/** Fades/slides its content in once it enters the viewport. Visible immediately without IO or with reduced motion. */
export function Reveal({ delay = 0, from = "up", className, style, children, as = "div", ...rest }: RevealProps) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = getRevealObserver();
        if (!io || prefersReducedMotion()) {
            el.dataset.reveal = "in";
            return;
        }
        el.dataset.reveal = "out";
        io.observe(el);
        return () => io.unobserve(el);
    }, []);

    return createElement(
        as,
        {
            ref,
            className,
            "data-reveal-from": from,
            style: { transitionDelay: delay ? `${delay}ms` : undefined, ...style },
            ...rest,
        },
        children,
    );
}
