import llmsMd from "../content/10-llms.md?raw";
import { cx } from "../../../components/ui";
import { Markdown } from "../Markdown";

export function LlmsSection() {
    const resources = [
        {
            href: "/llms.txt",
            tag: "llms.txt",
            tagColor: "bg-accent-soft text-accent border-accent/25",
            title: "/llms.txt",
            desc: "Compact agent index & endpoints for LLM system prompt context",
        },
        {
            href: "/llms-full.txt",
            tag: "full context",
            tagColor: "bg-water-soft text-water border-water/25",
            title: "/llms-full.txt",
            desc: "Complete API specification with real response examples & schemas",
        },
        {
            href: "/opengeo-cambodia.postman_collection.json",
            tag: "postman",
            tagColor: "bg-warn/15 text-warn border-warn/25",
            title: "Postman Collection v2.1",
            desc: "Pre-configured requests with automated assertions & environment",
        },
        {
            href: "/api/info",
            tag: "discovery",
            tagColor: "bg-ok/15 text-ok border-ok/25",
            title: "/api/info",
            desc: "Machine-readable JSON metadata & live dataset counts",
        },
    ];

    return (
        <section id="llms">
            <div className="my-3.5 mb-6 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {resources.map((r) => (
                    <a
                        key={r.href}
                        href={r.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-3 text-ink no-underline transition hover:border-line-2 hover:bg-surface-2"
                    >
                        <span className={cx("grid h-10 w-22 flex-none place-items-center rounded-lg border text-center font-mono text-[10px] font-bold tracking-wider uppercase", r.tagColor)}>
                            {r.tag}
                        </span>
                        <div className="min-w-0 flex-1">
                            <b className="block font-mono text-[13.5px] font-semibold text-ink">{r.title}</b>
                            <span className="block truncate text-[12px] text-ink-3">{r.desc}</span>
                        </div>
                    </a>
                ))}
            </div>
            <Markdown content={llmsMd} />
        </section>
    );
}
