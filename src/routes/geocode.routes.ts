import { Hono } from 'hono';
import { GeocodeService } from '../services/geocode.service.js';
import { geocodeRateLimiter } from '../middleware/rate-limiter.js';
import type { ApiResponse } from '../types/api.js';
import type { GeocodeResult } from '../types/geocode.js';

export const geocodeRoutes = new Hono();
const geocodeService = new GeocodeService();

// Apply dedicated geocoding rate limiter (30 req/min/IP) to respect OSM policies
geocodeRoutes.use('*', geocodeRateLimiter);

// Long caching for successful geocode lookups (7 days client & CDN cache)
geocodeRoutes.use('*', async (c, next) => {
  await next();
  if (c.res.status === 200) {
    c.header('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
  }
});

/**
 * GET /api/geocode/reverse?lat=...&lon=...
 * Reverse geocode a GPS point to the Cambodian 4-tier hierarchy
 */
geocodeRoutes.get('/reverse', async (c) => {
  const start = performance.now();
  const latStr = c.req.query('lat');
  const lonStr = c.req.query('lon');

  if (!latStr || !lonStr) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: "Missing required query parameters 'lat' and 'lon'",
      },
      400
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: "Invalid coordinates: 'lat' must be [-90, 90] and 'lon' [-180, 180]",
      },
      400
    );
  }

  const result = await geocodeService.reverse(lat, lon);
  const tookMs = Number((performance.now() - start).toFixed(2));

  if (!result) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: 'Unable to reverse geocode the requested coordinates',
        meta: { tookMs },
      },
      404
    );
  }

  return c.json<ApiResponse<GeocodeResult>>({
    success: true,
    data: result,
    meta: {
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'nominatim',
    },
  });
});

/**
 * GET /api/geocode/search?q=...&limit=...
 * Free-text address search bounded to Cambodia
 */
geocodeRoutes.get('/search', async (c) => {
  const start = performance.now();
  const rawQ = c.req.query('q') || '';
  const q = rawQ.trim();

  if (q.length > 100) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        error: "Query parameter 'q' exceeds maximum length of 100 characters",
      },
      400
    );
  }

  const limitRaw = parseInt(c.req.query('limit') || '10', 10);
  const limit = Math.max(1, Math.min(50, isNaN(limitRaw) ? 10 : limitRaw));

  if (!q) {
    return c.json<ApiResponse<GeocodeResult[]>>({
      success: true,
      data: [],
      meta: { total: 0, tookMs: 0 },
    });
  }

  const results = await geocodeService.search(q, limit);
  const tookMs = Number((performance.now() - start).toFixed(2));

  return c.json<ApiResponse<GeocodeResult[]>>({
    success: true,
    data: results,
    meta: {
      total: results.length,
      tookMs,
      timestamp: new Date().toISOString(),
      source: 'nominatim',
    },
  });
});
