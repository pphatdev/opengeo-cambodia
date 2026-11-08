import { Icon } from "../../components/Icon";
import { chip, cx, lvl } from "../../components/ui";
import { useI18n } from "../../i18n";
import { fmt, forDisplay } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { LEVEL_KM, LEVELS, type AdminItem, type Level } from "../../lib/types";

interface Props {
    level: Level | null;
    item: AdminItem | null;
    selection: Record<Level, AdminItem | null>;
    childCount: number | null;
    onCrumb: (level: Level) => void;
}

const CHILD_LEVEL: Partial<Record<Level, Level>> = { province: "district", district: "commune", commune: "village" };

export function DetailCard({ level, item, selection, childCount, onCrumb }: Props) {
    const { copy } = useToast();
    const { t, rt, lang } = useI18n();

    if (!level || !item) {
        return (
            <div className="flex-1 overflow-y-auto px-4 py-4.5" aria-live="polite">
                <div className="grid place-items-center gap-2.5 px-2.5 py-7 text-center text-sm text-ink-3">
                    <Icon name="map" className="size-8 text-line-2" />
                    <div>{rt("explore.emptyDetail")}</div>
                </div>
            </div>
        );
    }

    const ancestors = LEVELS.slice(0, LEVELS.indexOf(level)).filter((l) => selection[l]);
    const coords = item.lat != null && item.lon != null ? `${item.lat.toFixed(4)}, ${item.lon.toFixed(4)}` : null;
    const childLevel = CHILD_LEVEL[level];

    const rows: { label: string; value: string; copyable?: boolean; km?: boolean }[] = [
        { label: t("explore.code"), value: item.code ?? "—", copyable: !!item.code },
        { label: t("explore.id"), value: String(item.id), copyable: true },
        { label: t("explore.type"), value: item.typeKm || LEVEL_KM[level], km: true },
        { label: t("explore.parentId"), value: item.parentId != null ? String(item.parentId) : "—", copyable: item.parentId != null },
        { label: t("explore.centroid"), value: coords ?? "—", copyable: !!coords },
    ];
    if (childLevel) rows.push({ label: t(`levelPlural.${childLevel}`), value: childCount != null ? fmt(childCount) : "…" });

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4.5" aria-live="polite">
            <div className="mb-2.5"><span className={lvl(level)}>{t(`level.${level}`)}</span></div>
            {ancestors.length > 0 && (
                <div className="mb-3.5 flex flex-wrap gap-1 text-[12.5px] text-ink-3">
                    {ancestors.map((l) => (
                        <span key={l}>
                            <button
                                type="button"
                                onClick={() => onCrumb(l)}
                                className="cursor-pointer border-0 bg-transparent p-0 text-ink-2 underline decoration-line-2 underline-offset-[3px] hover:text-accent"
                            >
                                {lang === "km" ? selection[l]!.name_km : selection[l]!.name_en}
                            </button>{" "}
                            /
                        </span>
                    ))}
                </div>
            )}
            {/* The official Khmer name is the heading in both languages; the romanised name sits below */}
            <h3 className="m-0 font-khmer text-[26px] font-semibold leading-[1.35]">{item.name_km}</h3>
            <p className="mb-3.5 mt-0.5 text-[15px] text-ink-2">{item.name_en}</p>
            <dl className="m-0 grid grid-cols-[auto_1fr] overflow-hidden rounded-xl border border-line/70 text-[13px] backdrop-blur-xs [&>*:nth-last-child(-n+2)]:border-b-0">
                {rows.map((r) => [
                    <dt key={`${r.label}-t`} className="m-0 border-b border-line/60 bg-surface-2/40 px-3 py-2 text-ink-3">{r.label}</dt>,
                    <dd key={`${r.label}-d`} className={cx("m-0 flex min-w-0 items-center justify-end gap-1.5 border-b border-line/60 px-3 py-2 bg-surface/50", r.km ? "font-khmer text-[13px]" : "font-mono text-[12.5px]")}>
                        {r.value}
                        {r.copyable && (
                            <button
                                className="inline-grid cursor-pointer border-0 bg-transparent p-0.5 text-ink-3 hover:text-accent"
                                type="button"
                                aria-label={t("explore.copyField", { field: r.label })}
                                onClick={() => copy(r.value)}
                            >
                                <Icon name="copy" className="size-3.25" />
                            </button>
                        )}
                    </dd>,
                ])}
            </dl>
            <div className="mt-3.5 flex flex-wrap gap-2">
                <a className={chip} href={`/api/admin/item/${item.id}`} target="_blank" rel="noopener noreferrer"><Icon name="ext" />{t("explore.json")}</a>
                {level !== "village" && item.code && (
                    <a className={chip} href={`/api/boundaries/item/${encodeURIComponent(item.code)}`} target="_blank" rel="noopener noreferrer"><Icon name="polygon" />{t("explore.geojson")}</a>
                )}
                <button className={chip} type="button" onClick={() => copy(JSON.stringify(forDisplay(item), null, 2), t("explore.recordCopied"))}>
                    <Icon name="copy" />{t("explore.copyRecord")}
                </button>
            </div>
        </div>
    );
}
