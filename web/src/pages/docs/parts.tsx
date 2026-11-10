import type { ReactNode } from "react";
import { Icon, type IconName } from "../../components/Icon";
import { codePre, cx, docsH2 } from "../../components/ui";

/** Bordered, horizontally scrollable table used throughout the docs. */
export function Table({ head, rows, flush }: { head: string[]; rows: ReactNode[][]; flush?: boolean }) {
    return (
        <div className={cx("overflow-x-auto bg-surface", flush ? "border-b border-line" : "my-3.5 mb-5 rounded-xl border border-line")}>
            <table className="rich w-full border-collapse text-[13.5px] [&_code]:text-[12.5px]">
                <thead>
                    <tr>
                        {head.map((h) => (
                            <th key={h} className="whitespace-nowrap border-b border-line bg-surface-2 px-3.5 py-2.5 text-left align-top font-mono text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-3 km:font-khmer km:text-[12.5px] km:normal-case km:tracking-normal">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="[&:last-child>td]:border-b-0">
                            {r.map((c, j) => <td key={j} className="border-b border-line px-3.5 py-2.5 text-left align-top">{c}</td>)}
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
        <div className={cx("overflow-hidden rounded-xl border border-code-line bg-code text-code-ink", className ?? "my-3.5 mb-5")}>
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
                "my-[18px] grid grid-cols-[20px_1fr] gap-3 rounded-xl border px-4 py-3.5 text-sm",
                tone === "info" ? "border-water/25 bg-water-soft [&_svg]:text-water" : "border-accent/25 bg-accent-soft [&_svg]:text-accent",
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
