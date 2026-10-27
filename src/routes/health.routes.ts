import { Hono } from 'hono';
import { config } from '../config.js';

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

healthRoutes.get('/api/info', (c) => {
  return c.json({
    name: 'OpenGeo Cambodia API',
    domain: config.domain,
    url: config.appUrl,
    description: 'Sub-1ms cascading lookups across all 25 Provinces, 210 Districts, 1,661 Communes, and 14,536 Villages with smart OpenStreetMap geocoding',
    version: '1.0.0',
    convention: {
      tier1: 'City / Province (រាជធានី / ខេត្ត) - admin_level=4 (25)',
      tier2: 'District / Khan / Krong (ស្រុក / ខណ្ឌ / ក្រុង) - admin_level=6 (210)',
      tier3: 'Commune / Sangkat (ឃុំ / សង្កាត់) - admin_level=8 (1,661)',
      tier4: 'Village / Phum (ភូមិ) - place=village / place=hamlet (14,536)',
    },
    endpoints: {
      admin: {
        provinces: 'GET /api/admin/provinces',
        districts: 'GET /api/admin/provinces/:id/districts',
        communes: 'GET /api/admin/districts/:id/communes',
        villages: 'GET /api/admin/communes/:id/villages',
        item: 'GET /api/admin/item/:id',
        hierarchy: 'GET /api/admin/hierarchy/:id',
        search: 'GET /api/admin/search?q=:query&level=:level&limit=:limit',
        stats: 'GET /api/admin/stats',
      },
      geocode: {
        reverse: 'GET /api/geocode/reverse?lat=:lat&lon=:lon',
        search: 'GET /api/geocode/search?q=:query&limit=:limit',
      },
      system: {
        health: 'GET /health',
        info: 'GET /api/info',
        demo: 'GET /',
      },
    },
  });
});
