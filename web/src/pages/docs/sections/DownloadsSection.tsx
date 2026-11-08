import downloadsMd from "../content/09-downloads.md?raw";
import { cx } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { Markdown } from "../Markdown";

export function DownloadsSection() {
    const { t } = useI18n();

    const downloads = [
        { href: "/api/boundaries/raw/provinces.geojson", csv: false, name: "province.geojson", sub: t("downloads.polygons", { n: 25 }) },
        { href: "/api/boundaries/raw/districts.geojson", csv: false, name: "district.geojson", sub: t("downloads.polygons", { n: 197 }) },
        { href: "/api/boundaries/raw/communes.geojson", csv: false, name: "commune.geojson", sub: t("downloads.polygons", { n: "1,633" }) },
        { href: "/data/CambodiaGeographicalList.csv", csv: true, name: "CambodiaGeographicalList.csv", sub: t("docs.dlCombined") },
        { href: "/data/CambodiaProvinceList.csv", csv: true, name: "CambodiaProvinceList.csv", sub: t("levelPlural.province") },
        { href: "/data/CambodiaDistrictList.csv", csv: true, name: "CambodiaDistrictList.csv", sub: t("levelPlural.district") },
        { href: "/data/CambodiaCommuneList.csv", csv: true, name: "CambodiaCommuneList.csv", sub: t("levelPlural.commune") },
        { href: "/data/CambodiaVillagesList.csv", csv: true, name: "CambodiaVillagesList.csv", sub: t("levelPlural.village") },
    ];

    return (
        <section id="downloads">
            <Markdown content={downloadsMd} />
            <div className="my-3.5 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {downloads.map((d) => (
                    <a className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-ink no-underline hover:border-line-2" href={d.href} download key={d.href}>
                        <span className={cx("grid size-10 flex-none place-items-center rounded-[9px] text-center font-mono text-[10px] font-semibold uppercase leading-[1.1]", d.csv ? "bg-ok/15 text-ok" : "bg-water-soft text-water")}>
                            {d.csv ? "csv" : "geo json"}
                        </span>
                        <div>
                            <b className="block font-mono text-[13.5px] font-semibold">{d.name}</b>
                            <span className="text-[12.5px] text-ink-3">{d.sub}</span>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}
