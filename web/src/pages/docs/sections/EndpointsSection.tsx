import { useI18n } from "../../../i18n";
import { EndpointCard } from "../EndpointCard";
import { ENDPOINTS, GROUPS } from "../endpoints";
import { H2, P } from "../parts";

export function EndpointsSection() {
    const { tx } = useI18n();

    return (
        <>
            {GROUPS.map((g) => (
                <section key={g.id} id={g.id}>
                    <H2 id={`${g.id}-h`}>{tx(g.title)}</H2>
                    <P>{tx(g.intro)}</P>
                    {ENDPOINTS.filter((e) => e.group === g.id).map((ep) => (
                        <EndpointCard key={ep.id} ep={ep} />
                    ))}
                </section>
            ))}
        </>
    );
}
