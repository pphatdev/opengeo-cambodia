import adminModelMd from "../content/06-model-admin.md?raw";
import boundaryModelMd from "../content/07-model-boundary.md?raw";
import geocodeModelMd from "../content/08-model-geocode.md?raw";
import { Markdown } from "../Markdown";

export function ModelsSection() {
    return (
        <>
            <section id="model-admin">
                <Markdown content={adminModelMd} />
            </section>

            <section id="model-boundary">
                <Markdown content={boundaryModelMd} />
            </section>

            <section id="model-geocode">
                <Markdown content={geocodeModelMd} />
            </section>
        </>
    );
}
