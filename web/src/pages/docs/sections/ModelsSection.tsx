import { useI18n } from "../../../i18n";
import { C, H2, P, T, Table } from "../parts";

export function ModelsSection() {
    const { t, rt } = useI18n();

    const fieldHead = [t("docs.thField"), t("docs.thType"), t("docs.thDescription")];

    return (
        <>
            <section id="model-admin">
                <H2 id="model-admin-h">AdminItem</H2>
                <P>{rt("docs.adminItemIntro")}</P>
                <Table
                    head={fieldHead}
                    rows={[
                        [<C key="id">id</C>, <T key="t-id">number</T>, t("docs.fId")],
                        [<C key="code">code</C>, <T key="t-code">string</T>, t("docs.fCode")],
                        [<C key="name">name</C>, <T key="t-name">string</T>, rt("docs.fName")],
                        [<C key="name_en">name_en</C>, <T key="t-en">string</T>, rt("docs.fNameEn")],
                        [<C key="name_km">name_km</C>, <T key="t-km">string</T>, rt("docs.fNameKm")],
                        [<C key="level">level</C>, <T key="t-level">"province" | "district" | "commune" | "village"</T>, t("docs.fLevel")],
                        [<C key="typeKm">typeKm</C>, <T key="t-type">string</T>, rt("docs.fTypeKm")],
                        [<C key="parentId">parentId</C>, <T key="t-pid">number?</T>, t("docs.fParentId")],
                        [<span key="latlon"><C>lat</C>, <C>lon</C></span>, <T key="t-latlon">number?</T>, t("docs.fLatLon")],
                    ]}
                />
                <P>{rt("docs.internalFields")}</P>
            </section>

            <section id="model-boundary">
                <H2 id="model-boundary-h">{t("docs.navBoundary")}</H2>
                <P>{rt("docs.boundaryIntro")}</P>
                <Table
                    head={fieldHead}
                    rows={[
                        [<span key="code"><C>code</C>, <C>pcode</C></span>, <T key="t-code">string</T>, rt("docs.bCode")],
                        [<span key="names"><C>name_en</C>, <C>name_km</C>, <C>type_km</C></span>, <T key="t-names">string</T>, t("docs.bNames")],
                        [<C key="level">level</C>, <T key="t-level">string</T>, rt("docs.bLevel")],
                        [<span key="prov"><C>province_code</C>, <C>province_name_en</C>, <C>province_name_km</C></span>, <T key="t-prov">string</T>, t("docs.bProvince")],
                        [<span key="dist"><C>district_code</C>, <C>district_name_en</C>, <C>district_name_km</C></span>, <T key="t-dist">string?</T>, t("docs.bDistrict")],
                        [<span key="latlon"><C>lat</C>, <C>lon</C></span>, <T key="t-latlon">number</T>, t("docs.bLatLon")],
                        [<C key="bbox">bbox</C>, <T key="t-bbox">[minLon, minLat, maxLon, maxLat]</T>, t("docs.bBbox")],
                        [<span key="shape"><C>shape_length</C>, <C>shape_area</C></span>, <T key="t-shape">number</T>, t("docs.bShape")],
                    ]}
                />
            </section>

            <section id="model-geocode">
                <H2 id="model-geocode-h">GeocodeResult</H2>
                <Table
                    head={fieldHead}
                    rows={[
                        [<C key="disp">displayName</C>, <T key="t-disp">string</T>, t("docs.gDisplay")],
                        [<span key="latlon"><C>lat</C>, <C>lon</C></span>, <T key="t-latlon">number</T>, t("docs.gLatLon")],
                        [<C key="hier">hierarchy</C>, <T key="t-hier">object</T>, rt("docs.gHierarchy")],
                        [<span key="osm"><C>osmId</C>, <C>osmType</C></span>, <T key="t-osm">number, string</T>, t("docs.gOsm")],
                        [<span key="type"><C>type</C>, <C>importance</C></span>, <T key="t-type">string, number</T>, t("docs.gType")],
                        [<C key="raw">rawAddress</C>, <T key="t-raw">object</T>, t("docs.gRaw")],
                    ]}
                />
            </section>
        </>
    );
}
