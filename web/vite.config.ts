import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const webRoot = fileURLToPath(new URL(".", import.meta.url));

// The API (Hono) runs on :3000 in development; Vite proxies API calls to it.
const API_TARGET = process.env.API_URL || "http://localhost:3000";
const proxied = ["/api", "/health", "/llms.txt", "/llms-full.txt", "/opengeo-cambodia.postman_collection.json"];

export default defineConfig({
    root: webRoot,
    plugins: [react(), tailwindcss()],
    // Static files (logo, data downloads, boundaries, robots.txt...) live in /public
    publicDir: "../public",
    build: {
        outDir: "../dist/client",
        emptyOutDir: true,
        sourcemap: false,
        chunkSizeWarningLimit: 700,
    },
    server: {
        port: 5173,
        proxy: Object.fromEntries(proxied.map((p) => [p, { target: API_TARGET, changeOrigin: true }])),
    },
    preview: {
        port: 4173,
        proxy: Object.fromEntries(proxied.map((p) => [p, { target: API_TARGET, changeOrigin: true }])),
    },
});
