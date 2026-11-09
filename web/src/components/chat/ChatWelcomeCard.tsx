import { Icon } from "../Icon";
import { IosEmoji } from "../../lib/emoji";

interface ChatWelcomeCardProps {
    onSelectPrompt: (prompt: string) => void;
}

export function ChatWelcomeCard({ onSelectPrompt }: ChatWelcomeCardProps) {
    const capabilities = [
        { emoji: "🏛️", label: "25 Provinces & 210 Districts" },
        { emoji: "📍", label: "Sub-ms Spatial Lookup" },
        { emoji: "🔍", label: "Khmer & English Search" },
        { emoji: "💻", label: "cURL, TypeScript & Python" },
    ];

    const quickFeatures = [
        {
            emoji: "🏛️",
            title: "4-Tier Hierarchy",
            desc: "Explore 25 Provinces, 210 Districts, 1,661 Communes, and 14,576 Villages with NCDD codes.",
            prompt: "How do I get all districts (Khan) in Phnom Penh with their codes?",
            badge: "GET /api/admin/*",
        },
        {
            emoji: "📍",
            title: "Spatial Zone Lookup",
            desc: "Sub-millisecond Point-in-Polygon containment query from GPS coordinates.",
            prompt: "How to find which Province, District, and Commune contain GPS coordinates (11.5564, 104.9282)?",
            badge: "GET /api/boundaries/zone",
        },
        {
            emoji: "🔍",
            title: "Multilingual Search",
            desc: "Accurate full-text matching for Khmer (ខ្មែរ) and English place names.",
            prompt: "How do I search for places by Khmer name (e.g. 'សៀមរាប') with the API?",
            badge: "GET /api/admin/search",
        },
        {
            emoji: "💻",
            title: "Runnable Code Samples",
            desc: "Ready-to-use copy-pasteable integration code in cURL, JavaScript, and Python.",
            prompt: "Show me a Python script to fetch all 25 provinces and print their English and Khmer names.",
            badge: "cURL · JS · Python",
        },
    ];

    return (
        <div className="flex flex-col space-y-3.5 pt-0.5 pb-2">
            {/* Hero Greeting Card */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/95 p-3.5 sm:p-4.5 shadow-xs backdrop-blur-md">
                {/* Ambient decorative glow */}
                <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-accent/10 blur-2xl" />

                <div className="relative flex items-start gap-3">
                    {/* Bot Avatar Badge */}
                    <div className="relative flex size-9.5 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-accent to-teal-400 text-bg shadow-xs mt-0.5">
                        <Icon name="bot" className="size-5" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-ok" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-display text-[14.5px] font-bold text-ink tracking-tight flex items-center gap-1.5">
                                <span>Hello! I'm OpenGeo Assistant</span>
                                <IosEmoji emoji="👋" className="size-4.5 inline-block" />
                            </h3>
                            <span className="rounded-full bg-accent/15 px-2 py-0.2 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                                Mistral AI
                            </span>
                        </div>

                        <p className="mt-1 text-xs text-ink-2 leading-relaxed">
                            I have full access to the official Cambodia Geography & Administrative API reference. Ask technical questions, look up administrative codes, or generate code snippets.
                        </p>

                        {/* Capability Badges */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {capabilities.map((c, i) => (
                                <div
                                    key={i}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2/60 px-2 py-0.5 text-[11px] font-medium text-ink-2"
                                >
                                    <IosEmoji emoji={c.emoji} className="size-3.5 shrink-0" />
                                    <span>{c.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Prompt Cards */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    <span className="flex items-center gap-1.5">
                        <Icon name="sparkles" className="size-3.5 text-accent" />
                        <span>What would you like to build?</span>
                    </span>
                    <span className="text-[10px] text-accent lowercase">click to ask</span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {quickFeatures.map((f, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectPrompt(f.prompt)}
                            className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-3 text-left transition-all hover:border-accent/60 hover:bg-surface-2/80 hover:shadow-xs active:scale-[0.99] cursor-pointer"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 font-semibold text-xs text-ink group-hover:text-accent transition-colors min-w-0">
                                        <IosEmoji emoji={f.emoji} className="size-4 shrink-0" />
                                        <span className="truncate">{f.title}</span>
                                    </div>
                                    <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                        {f.badge}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-ink-3 leading-normal line-clamp-2">
                                    {f.desc}
                                </p>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-line/50 text-[10.5px] font-medium text-accent">
                                <span className="truncate text-ink-2 group-hover:text-accent transition-colors italic">
                                    "{f.prompt}"
                                </span>
                                <span className="ml-1 shrink-0 transition-transform group-hover:translate-x-0.5">&rarr;</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
