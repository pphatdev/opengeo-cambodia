import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { Icon } from "./Icon";
import { cx } from "./ui";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Floating "back to top" button with a scroll-progress ring. Appears after ~one screen of scrolling. */
export function BackToTop() {
    const { lang } = useI18n();
    const [visible, setVisible] = useState(false);
    const ringRef = useRef<SVGCircleElement | null>(null);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            setVisible(y > Math.min(600, window.innerHeight * 0.8));
            // Progress ring updated directly (no re-render per scroll frame)
            if (ringRef.current) {
                const p = max > 0 ? Math.min(1, y / max) : 0;
                ringRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - p));
            }
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    const toTop = () => {
        let reduce = false;
        try {
            reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        } catch {
            // ignore
        }
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        // Move focus to the top of the page for keyboard / screen reader users
        const target = document.querySelector<HTMLElement>("header a, main");
        target?.focus({ preventScroll: true });
    };

    const label = lang === "km" ? "ត្រឡប់ទៅខាងលើ" : "Back to top";

    return (
        <button
            type="button"
            onClick={toTop}
            aria-label={label}
            title={label}
            tabIndex={visible ? 0 : -1}
            aria-hidden={!visible}
            className={cx(
                "group fixed bottom-5 right-5 z-1030 grid size-12 cursor-pointer place-items-center rounded-full glass-pill text-ink shadow-glass transition-all duration-300 hover:text-accent active:scale-95 max-sm:bottom-4 max-sm:right-4 max-sm:size-11",
                visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
            )}
        >
            <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                <circle cx="24" cy="24" r={RADIUS} className="fill-none stroke-line" strokeWidth={2} />
                <circle
                    ref={ringRef}
                    cx="24"
                    cy="24"
                    r={RADIUS}
                    className="fill-none stroke-accent"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE}
                />
            </svg>
            <Icon name="chevronUp" className="relative size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
        </button>
    );
}
