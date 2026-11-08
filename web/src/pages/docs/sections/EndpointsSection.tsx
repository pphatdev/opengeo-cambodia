import adminMd from "../content/api-admin.md?raw";
import boundariesMd from "../content/api-boundaries.md?raw";
import geocodingMd from "../content/api-geocoding.md?raw";
import systemMd from "../content/api-system.md?raw";
import { EndpointCard } from "../EndpointCard";
import { ENDPOINTS, GROUPS } from "../endpoints";
import { Markdown } from "../Markdown";

const GROUP_MD: Record<string, string> = {
    admin: adminMd,
    boundaries: boundariesMd,
    geocode: geocodingMd,
    system: systemMd,
};

export function EndpointsSection() {
    return (
        <>
            {GROUPS.map((g) => (
                <section key={g.id} id={g.id}>
                    {GROUP_MD[g.id] && <Markdown content={GROUP_MD[g.id]} />}
                    {ENDPOINTS.filter((e) => e.group === g.id).map((ep) => (
                        <EndpointCard key={ep.id} ep={ep} />
                    ))}
                </section>
            ))}
        </>
    );
}
