import { initSupplyChainDefense } from "./security/supply-chain.ts";
import { app } from "./app.ts";
import { config } from "./config.ts";
import { AdminStore } from "./data/store.ts";

// Initialize runtime supply chain defense (prototype pollution & config sealing)
initSupplyChainDefense();

const store = AdminStore.getInstance();
const stats = store.getStats();

Deno.serve(
    {
        port: config.port,
        hostname: config.host,
        onListen: (info) => {
            console.log(`
=========================================================
    🇰🇭 OpenGeo Cambodia API - Hono.js on Deno
=========================================================
    🚀 Server Running:   http://${info.address}:${info.port}
    🖥️  Interactive Demo: http://localhost:${info.port}/demo
    🌐 API Welcome:      http://localhost:${info.port}/
    📖 API Endpoints:    http://localhost:${info.port}/api/info
    🏛️  Provinces:        http://localhost:${info.port}/api/admin/provinces
    🗺️  Boundaries:       http://localhost:${info.port}/api/boundaries/provinces
    📍 GPS Reverse Geo:  http://localhost:${info.port}/api/geocode/reverse?lat=11.5714&lon=104.9250
    📊 Loaded Records:   ${stats.provinces} Provinces | ${stats.districts} Districts | ${stats.communes} Communes | ${stats.villages} Villages
=========================================================
`);
        },
    },
    app.fetch,
);
