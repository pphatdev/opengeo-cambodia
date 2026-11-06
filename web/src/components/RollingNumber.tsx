import { useEffect, useRef, useState, type CSSProperties } from "react";
import { fmt } from "../lib/api";
import { cx } from "./ui";

// Height of one digit row. A little over 1em so serif glyphs never touch the window edges.
const ROW = 1.1;

/**
 * Odometer-style number: each digit is a 0–9 strip that slides up (translateY) to its
 * value when the number scrolls into view, staggered left to right. Changing `value`
 * later rolls from the old digits to the new ones. Columns are keyed by place value
 * (ones, tens, …) so they keep their identity when the number grows.
 *
 * Screen readers get the plain formatted number; the strips are decorative. Under
 * prefers-reduced-motion the global rule removes the transition, so it just shows the value.
 */
export function RollingNumber({ value, className, duration = 1400, stagger = 90 }: { value: number; className?: string; duration?: number; stagger?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || !("IntersectionObserver" in window)) return setVisible(true);
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { threshold: 0.4 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const text = fmt(value);
    const chars = [...text];
    let digitOrder = 0;

    return (
        <span ref={ref} className={cx("relative inline-flex tabular-nums", className)}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true" className="inline-flex">
                {chars.map((ch, i) => {
                    const place = chars.length - i; // stable key: position from the right
                    if (!/\d/.test(ch)) {
                        return (
                            <span key={`s${place}`} className="block" style={{ height: `${ROW}em`, lineHeight: `${ROW}em` }}>
                                {ch}
                            </span>
                        );
                    }
                    const digit = visible ? Number(ch) : 0;
                    const style: CSSProperties = {
                        transform: `translateY(-${digit * ROW}em)`,
                        transitionDuration: `${duration}ms`,
                        transitionDelay: `${digitOrder++ * stagger}ms`,
                    };
                    return (
                        <span key={`d${place}`} className="relative block overflow-hidden" style={{ height: `${ROW}em` }}>
                            <span className="block transition-transform ease-[cubic-bezier(.22,1,.36,1)] will-change-transform" style={style}>
                                {Array.from({ length: 10 }, (_, n) => (
                                    <span key={n} className="block text-center" style={{ height: `${ROW}em`, lineHeight: `${ROW}em` }}>
                                        {n}
                                    </span>
                                ))}
                            </span>
                        </span>
                    );
                })}
            </span>
        </span>
    );
}
