import { Hono } from 'hono';
import { config } from '../config.js';

import { getSupplyChainStatus } from '../security/supply-chain.js';

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    security: getSupplyChainStatus(),
  });
});

healthRoutes.get('/api/info', (c) => {
  c.header('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400');
  return c.json({
    name: 'OpenGeo Cambodia API',
    purpose: 'Open API for Cambodia geography data',
    pillars: [
      '1. Complete Administrative Hierarchy (Provinces, Districts, Communes, Villages)',
      '2. Allow user to use for free (100% Free & Open Access, No API Keys, No Paywalls)',
      '3. Provide fast response time (Sub-1ms in-memory cascading lookups)',
    ],
    domain: config.domain,
    url: config.appUrl,
    description: 'An Open API for Cambodia geography data providing complete 4-tier administrative hierarchy (25 Provinces, 210 Districts, 1,661 Communes, and 14,576 Villages), 100% free to use, with sub-1ms response times',
    dataSource: 'https://data.mef.gov.kh/',
    version: '1.0.0',
    convention: {
      tier1: 'City / Province (រាជធានី / ខេត្ត) - admin_level=4 (25)',
      tier2: 'District / Khan / Krong (ស្រុក / ខណ្ឌ / ក្រុង) - admin_level=6 (210)',
      tier3: 'Commune / Sangkat (ឃុំ / សង្កាត់) - admin_level=8 (1,661)',
      tier4: 'Village / Phum (ភូមិ) - place=village / place=hamlet (14,576)',
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
        root: 'GET /',
        health: 'GET /health',
        info: 'GET /api/info',
        llms: 'GET /llms.txt',
        llmsFull: 'GET /llms-full.txt',
        postman: 'GET /opengeo-cambodia.postman_collection.json',
      },
    },
  });
});
