import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { ScrollToHash } from "./components/ScrollToHash";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./lib/toast";
import { Home } from "./pages/home/Home";
import { NotFound } from "./pages/NotFound";

// Docs is a separate chunk so the landing page doesn't download it
const Docs = lazy(() => import("./pages/docs/Docs"));

export function App() {
    return (
        <I18nProvider>
            <ThemeProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <ScrollToHash />
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/demo" element={<Home />} />
                            <Route path="/docs" element={<Suspense fallback={<div className="min-h-screen" />}><Docs /></Suspense>} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </ToastProvider>
            </ThemeProvider>
        </I18nProvider>
    );
}
