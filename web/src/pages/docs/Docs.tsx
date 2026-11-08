import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Footer } from "../../components/Footer";
import { Nav } from "../../components/Nav";
import { useI18n } from "../../i18n";
import { Sidebar } from "./Sidebar";

export function Docs() {
    const { t } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        document.title = t("meta.docsTitle");
    }, [t]);

    return (
        <div className="flex min-h-screen flex-col bg-bg text-ink leading-[1.7]">
            <Nav variant="docs" menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
            <div className="mx-auto flex-1 w-full max-w-340 grid grid-cols-[minmax(0,1fr)] gap-0 px-6 max-sm:px-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
                <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
                <main className="min-w-0 max-w-220 pb-16 pt-8 lg:pt-12">
                    <Outlet />
                </main>
            </div>
            <Footer />
        </div>
    );
}
export default Docs;
