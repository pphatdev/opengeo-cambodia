import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { ScrollToHash } from "./components/ScrollToHash";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./lib/toast";
import { Home } from "./pages/home/Home";
import { NotFound } from "./pages/NotFound";

// Docs and Blog are separate chunks so the landing page doesn't download them
const Docs = lazy(() => import("./pages/docs/Docs"));
const BlogLayout = lazy(() => import("./pages/blog/BlogLayout"));
const BlogIndex = lazy(() => import("./pages/blog/BlogIndex"));
const BlogPost = lazy(() => import("./pages/blog/BlogPost"));

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
                            <Route
                                path="/blog"
                                element={
                                    <Suspense fallback={<div className="min-h-screen" />}>
                                        <BlogLayout />
                                    </Suspense>
                                }
                            >
                                <Route index element={<BlogIndex />} />
                                <Route path=":slug" element={<BlogPost />} />
                            </Route>
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </ToastProvider>
            </ThemeProvider>
        </I18nProvider>
    );
}
