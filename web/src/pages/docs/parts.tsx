import type { ReactNode } from "react";
import { Icon, type IconName } from "../../components/Icon";
import { codePre, cx, docsH2 } from "../../components/ui";

/** Bordered, horizontally scrollable table used throughout the docs. */
export function Table({ head, rows, flush }: { head: string[]; rows: ReactNode[][]; flush?: boolean }) {
    return (
        <div className={cx("overflow-x-auto", flush ? "border-b border-line/60 bg-transparent" : "my-3.5 mb-5 rounded-2xl glass-panel shadow-glass")}>
            <table className="rich w-full border-collapse text-[13.5px] [&_code]:text-[12.5px]">
                <thead>
                    <tr>
                        {head.map((h) => (
                            <th key={h} className="whitespace-nowrap border-b border-line/60 bg-surface-2/60 px-3.5 py-2.5 text-left align-top font-mono text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-3 km:font-khmer km:text-[12.5px] km:normal-case km:tracking-normal">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="[&:last-child>td]:border-b-0 hover:bg-surface-2/30 transition-colors">
                            {r.map((c, j) => <td key={j} className="border-b border-line/60 px-3.5 py-2.5 text-left align-top">{c}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Dark code box with a header row (tabs, labels, copy button) and a <pre> body. */
export function CodeBox({ head, children, className, preClassName }: { head: ReactNode; children: ReactNode; className?: string; preClassName?: string }) {
    return (
        <div className={cx("overflow-hidden rounded-2xl border border-code-line/80 bg-code/95 text-code-ink shadow-[0_16px_36px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md", className ?? "my-3.5 mb-5")}>
            <div className="flex items-center gap-1 border-b border-code-line px-2.5 py-2">{head}</div>
            <pre className={cx(codePre, "px-4 py-3.5", preClassName)}>{children}</pre>
        </div>
    );
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
    return (
        <h2 id={id} className={docsH2}>
            <a className="group text-inherit no-underline" href={`#${id}`}>
                {children}
                <span className="ml-2 text-ink-3 opacity-0 group-hover:opacity-100">#</span>
            </a>
        </h2>
    );
}

export function Callout({ icon, tone, children }: { icon: IconName; tone: "accent" | "info"; children: ReactNode }) {
    return (
        <div
            className={cx(
                "my-[18px] grid grid-cols-[20px_1fr] gap-3 rounded-2xl glass-panel px-4.5 py-3.5 text-sm shadow-glass",
                tone === "info" ? "!border-water/30 !bg-water-soft/60 [&_svg]:text-water" : "!border-accent/30 !bg-accent-soft/60 [&_svg]:text-accent",
            )}
        >
            <Icon name={icon} className="mt-[3px] size-[18px]" />
            <p className="rich m-0 text-ink">{children}</p>
        </div>
    );
}

export const P = ({ children }: { children: ReactNode }) => <p className="rich mb-3.5 mt-0 text-ink-2">{children}</p>;
export const T = ({ children }: { children: ReactNode }) => <span className="font-mono text-xs text-water">{children}</span>;
export const C = ({ children }: { children: ReactNode }) => <code>{children}</code>;
