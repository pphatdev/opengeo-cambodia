/**
 * =========================================================================
 * OpenGeo Cambodia - Cloudflare Workers / Edge Serverless Entrypoint
 * =========================================================================
 *
 * Provides sub-1ms global edge routing across 300+ Cloudflare data centers.
 * Fully compatible with Cloudflare Workers runtime (V8 Isolate) and nodejs_compat.
 */

import "./worker-seed.ts"; // must stay first: registers bundled seed data
import { app } from "./app.ts";
import { AdminStore } from "./data/store.ts";
import { BoundariesService } from "./services/boundaries.service.ts";
import { initSupplyChainDefense } from "./security/supply-chain.ts";

// 1. Initialize Supply Chain Defense (Prototype pollution & config sealing)
initSupplyChainDefense();

// 2. Pre-warm In-Memory Geographic & Boundary Stores on Worker spin-up
const store = AdminStore.getInstance();
if (!store.isReady()) {
    console.log("⚡ [Cloudflare Worker] Pre-warming AdminStore...");
}
BoundariesService.getInstance();

// 3. Export default Hono application for Cloudflare Workers fetch handler
export default app;
