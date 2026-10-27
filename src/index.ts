import { serve } from '@hono/node-server';
import { app } from './app.js';
import { config } from './config.js';
import { AdminStore } from './data/store.js';

// Initialize in-memory cache and sync seed files from CambodiaGeographicalList.csv
const store = AdminStore.getInstance();
const stats = store.getStats();

serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  },
  (info) => {
    console.log(`
=========================================================
  🇰🇭 OpenGeo Cambodia API - Hono.js on Node.js
=========================================================
  🚀 Server Running:   http://${info.address}:${info.port}
  🖥️  Interactive Demo: http://localhost:${info.port}/
  📖 API Endpoints:    http://localhost:${info.port}/api/info
  🏛️  Provinces:        http://localhost:${info.port}/api/admin/provinces
  📍 GPS Reverse Geo:  http://localhost:${info.port}/api/geocode/reverse?lat=11.5714&lon=104.9250
  📊 Loaded Records:   ${stats.provinces} Provinces | ${stats.districts} Districts | ${stats.communes} Communes | ${stats.villages} Villages
=========================================================
`);
  }
);
