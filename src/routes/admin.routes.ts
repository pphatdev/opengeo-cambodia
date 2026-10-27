import { Hono } from 'hono';
import { AdminService } from '../services/admin.service.js';
import type { ApiResponse } from '../types/api.js';
import type { AdminItem, AdminStats, HierarchyPath, AdminLevel } from '../types/admin.js';

export const adminRoutes = new Hono();
const adminService = new AdminService();

// Middleware: Set caching headers for ultra-fast local administrative responses
adminRoutes.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const tookMs = Number((performance.now() - start).toFixed(2));
  c.header('X-Response-Time', `${tookMs}ms`);
  c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
});

/**
 * GET /api/admin/provinces
 * Returns all 25 provinces/capital of Cambodia
 */
adminRoutes.get('/provinces', (c) => {
  const start = performance.now();
  const provinces = adminService.getProvinces();
  const tookMs = Number((performance.now() - start).toFixed(2));

  const response: ApiResponse<AdminItem[]> = {
    success: true,
    data: provinces,
    meta: {
      total: provinces.length,
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'local_cache',
    },
  };

  return c.json(response);
});

/**
 * GET /api/admin/provinces/:id/districts
 * Returns all districts / khans / krongs within a province
 */
adminRoutes.get('/provinces/:id/districts', (c) => {
  const start = performance.now();
  const provinceId = parseInt(c.req.param('id'), 10);

  if (isNaN(provinceId)) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: 'Invalid province ID format',
      },
      400
    );
  }

  const districts = adminService.getDistricts(provinceId);
  const tookMs = Number((performance.now() - start).toFixed(2));

  const response: ApiResponse<AdminItem[]> = {
    success: true,
    data: districts,
    meta: {
      total: districts.length,
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'local_cache',
    },
  };

  return c.json(response);
});

/**
 * GET /api/admin/districts/:id/communes
 * Returns all communes / sangkats within a district
 */
adminRoutes.get('/districts/:id/communes', (c) => {
  const start = performance.now();
  const districtId = parseInt(c.req.param('id'), 10);

  if (isNaN(districtId)) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: 'Invalid district ID format',
      },
      400
    );
  }

  const communes = adminService.getCommunes(districtId);
  const tookMs = Number((performance.now() - start).toFixed(2));

  const response: ApiResponse<AdminItem[]> = {
    success: true,
    data: communes,
    meta: {
      total: communes.length,
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'local_cache',
    },
  };

  return c.json(response);
});

/**
 * GET /api/admin/communes/:id/villages
 * Returns all villages (phum) within a commune
 */
adminRoutes.get('/communes/:id/villages', (c) => {
  const start = performance.now();
  const communeId = parseInt(c.req.param('id'), 10);

  if (isNaN(communeId)) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: 'Invalid commune ID format',
      },
      400
    );
  }

  const villages = adminService.getVillages(communeId);
  const tookMs = Number((performance.now() - start).toFixed(2));

  const response: ApiResponse<AdminItem[]> = {
    success: true,
    data: villages,
    meta: {
      total: villages.length,
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'local_cache',
    },
  };

  return c.json(response);
});

/**
 * GET /api/admin/item/:id
 * Lookup single item by ID
 */
adminRoutes.get('/item/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json<ApiResponse<null>>({ success: false, data: null, error: 'Invalid ID' }, 400);
  }

  const item = adminService.getItemById(id);
  if (!item) {
    return c.json<ApiResponse<null>>({ success: false, data: null, error: 'Item not found' }, 404);
  }

  return c.json<ApiResponse<AdminItem>>({
    success: true,
    data: item,
  });
});

/**
 * GET /api/admin/hierarchy/:id
 * Resolves full ascending 4-tier tree (Province -> District -> Commune -> Village)
 */
adminRoutes.get('/hierarchy/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json<ApiResponse<null>>({ success: false, data: null, error: 'Invalid ID' }, 400);
  }

  const path = adminService.getHierarchy(id);
  return c.json<ApiResponse<HierarchyPath>>({
    success: true,
    data: path,
  });
});

/**
 * GET /api/admin/search?q=...&level=...&limit=...
 * Search administrative divisions by Khmer or Romanized name
 */
adminRoutes.get('/search', (c) => {
  const start = performance.now();
  const q = c.req.query('q') || '';
  const level = c.req.query('level') as AdminLevel | undefined;
  const limit = parseInt(c.req.query('limit') || '20', 10);

  if (!q.trim()) {
    return c.json<ApiResponse<AdminItem[]>>({
      success: true,
      data: [],
      meta: { total: 0, tookMs: 0 },
    });
  }

  const results = adminService.search(q, level, limit);
  const tookMs = Number((performance.now() - start).toFixed(2));

  return c.json<ApiResponse<AdminItem[]>>({
    success: true,
    data: results,
    meta: {
      total: results.length,
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'local_cache',
    },
  });
});

/**
 * GET /api/admin/stats
 * Summary statistics of administrative records
 */
adminRoutes.get('/stats', (c) => {
  const stats = adminService.getStats();
  return c.json<ApiResponse<AdminStats>>({
    success: true,
    data: stats,
  });
});
