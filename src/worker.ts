/**
 * =========================================================================
 * OpenGeo Cambodia - Cloudflare Workers / Edge Serverless Entrypoint
 * =========================================================================
 *
 * Provides sub-1ms global edge routing across 300+ Cloudflare data centers.
 * Fully compatible with Cloudflare Workers runtime (V8 Isolate) and nodejs_compat.
 */

import { app } from "./app.js";
import { AdminStore } from "./data/store.js";
import { initSupplyChainDefense } from "./security/supply-chain.js";

// 1. Initialize Supply Chain Defense (Prototype pollution & config sealing)
initSupplyChainDefense();

// 2. Pre-warm In-Memory Geographic Store on Worker spin-up
const store = AdminStore.getInstance();
if (!store.isReady()) {
    console.log("⚡ [Cloudflare Worker] Pre-warming AdminStore...");
}

// 3. Export default Hono application for Cloudflare Workers fetch handler
export default app;
