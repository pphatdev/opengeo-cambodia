import { Icon } from "../Icon";
import { IosEmoji } from "../../lib/emoji";

interface ChatWelcomeCardProps {
    onSelectPrompt: (prompt: string) => void;
}

export function ChatWelcomeCard({ onSelectPrompt }: ChatWelcomeCardProps) {
    const quickFeatures = [
        {
            icon: "layers" as const,
            title: "4-Tier Hierarchy",
            desc: "25 Provinces, 210 Districts, 1,661 Communes, 14,576 Villages",
            prompt: "How do I get all districts (Khan) in Phnom Penh with their codes?",
            badge: "GET /api/admin/*",
        },
        {
            icon: "pin" as const,
            title: "Spatial Zone Lookup",
            desc: "Sub-millisecond Point-in-Polygon query from GPS coordinates",
            prompt: "How to find which Province, District, and Commune contain GPS coordinates (11.5564, 104.9282)?",
            badge: "GET /api/boundaries/zone",
        },
        {
            icon: "search" as const,
            title: "Multilingual Search",
            desc: "Accurate matching for Khmer (ខ្មែរ) and English place names",
            prompt: "How do I search for places by Khmer name (e.g. 'សៀមរាប') with the API?",
            badge: "GET /api/admin/search",
        },
        {
            icon: "code" as const,
            title: "Runnable Code Samples",
            desc: "Copy-pasteable integration in cURL, JavaScript, and Python",
            prompt: "Show me a Python script to fetch all 25 provinces and print their English and Khmer names.",
            badge: "cURL · JS · Python",
        },
    ];

    return (
        <div className="space-y-3.5">
            {/* Assistant Welcome Bubble (Mirrors assistant message styling with Apple iOS Emojis) */}
            <div className="group flex w-full gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent text-xs font-semibold shadow-xs select-none mt-0.5">
                    <Icon name="bot" className="size-4" />
                </div>

                <div className="flex flex-col min-w-0 max-w-[96%] sm:max-w-[92%]">
                    {/* Header */}
                    <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-ink-3 px-1">
                        <span className="font-semibold text-ink">OpenGeo Assistant</span>
                        <span className="rounded bg-accent/10 px-1.5 py-0.2 font-mono text-[9.5px] font-semibold text-accent">
                            MISTRAL
                        </span>
                    </div>

                    {/* Bubble Content */}
                    <div className="w-full rounded-2xl rounded-tl-xs border border-line bg-surface p-3.5 sm:p-4 text-[13px] leading-relaxed shadow-xs text-ink space-y-3">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-ink tracking-tight">
                            <IosEmoji emoji="👋" className="size-5 inline-block align-[-0.15em]" />
                            <span>Hello! I'm your OpenGeo Cambodia API Assistant.</span>
                        </div>

                        <p className="text-xs text-ink-2 leading-relaxed">
                            I have full access to the complete official API reference powered by <strong>Mistral AI</strong>.
                        </p>

                        <div className="text-xs text-ink-2 space-y-1.5 pt-0.5">
                            <p className="font-semibold text-ink text-[12px]">Ask me anything about:</p>
                            <ul className="space-y-1.5 pl-1">
                                <li className="flex items-start gap-2">
                                    <IosEmoji emoji="🏛️" className="size-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-ink">4-Tier Administrative Hierarchy</strong> (Provinces, Districts, Communes, Villages)
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <IosEmoji emoji="📍" className="size-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-ink">Sub-millisecond Spatial Containment</strong> (<code>GET /api/boundaries/zone?lat=...&lng=...</code>)
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <IosEmoji emoji="🔍" className="size-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-ink">Multilingual Place Search</strong> (Khmer & English)
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <IosEmoji emoji="💻" className="size-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong className="text-ink">Runnable Code Examples</strong> in cURL, JavaScript/TypeScript, and Python
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <p className="text-[11.5px] italic text-ink-3 pt-1 border-t border-line">
                            Choose a suggested prompt below or type your question to get started!
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Prompt Cards */}
            <div className="pl-9.5">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    <span>What would you like to build?</span>
                    <span className="text-[10px] text-accent lowercase">click to ask</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {quickFeatures.map((f, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectPrompt(f.prompt)}
                            className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-3 text-left transition-all hover:border-accent/50 hover:bg-surface-2 hover:shadow-xs active:scale-[0.99] cursor-pointer"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 font-semibold text-xs text-ink group-hover:text-accent transition-colors">
                                        <Icon name={f.icon} className="size-3.5 text-accent" />
                                        <span>{f.title}</span>
                                    </div>
                                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3 group-hover:text-ink">
                                        {f.badge}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-ink-3 line-clamp-2 leading-normal">
                                    {f.desc}
                                </p>
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-[10.5px] font-medium text-accent opacity-80 group-hover:opacity-100">
                                <span className="line-clamp-1 italic">"{f.prompt}"</span>
                                <span className="shrink-0">&rarr;</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
