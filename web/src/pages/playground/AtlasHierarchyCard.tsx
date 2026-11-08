export function AtlasHierarchyCard() {
    const tiers = [
        { name: "Provinces & Capital", count: 25, labelKm: "រាជធានី-ខេត្ត", color: "#f43f5e", pct: "100%", sub: "1 Capital · 24 Provinces" },
        { name: "Districts / Khans", count: 210, labelKm: "ក្រុង-ស្រុក-ខណ្ឌ", color: "#06b6d4", pct: "100%", sub: "14 Khans · 196 Districts" },
        { name: "Communes / Sangkats", count: 1661, labelKm: "ឃុំ-សង្កាត់", color: "#10b981", pct: "100%", sub: "250 Sangkats · 1,411 Khums" },
        { name: "Villages (Phum)", count: 14576, labelKm: "ភូមិ", color: "#f59e0b", pct: "100%", sub: "100% Edge Validated NCDD" },
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0d121d]/90 p-3.5 shadow-2xl backdrop-blur-xl space-y-2.5">
            {/* Header: Title & Verified Status */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="m-0 font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-300">
                        Administrative Hierarchy
                    </h3>
                    <div className="font-mono text-[9px] text-slate-500">
                        NCDD OFFICIAL 4-TIER MODEL
                    </div>
                </div>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                    SUB-1MS EDGE
                </span>
            </div>

            {/* Tier Progress Bars (modeled after CyberDefend data center meters) */}
            <div className="space-y-2 pt-1 font-mono text-xs">
                {tiers.map((t) => (
                    <div key={t.name} className="rounded-xl border border-white/5 bg-[#080b13]/80 p-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white font-sans font-medium">
                                {t.name}
                            </span>
                            <span className="font-bold" style={{ color: t.color }}>
                                {t.count.toLocaleString()}
                            </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: t.pct,
                                    backgroundColor: t.color,
                                    boxShadow: `0 0 8px ${t.color}`,
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                            <span className="font-khmer text-slate-500">{t.labelKm}</span>
                            <span>{t.sub}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
