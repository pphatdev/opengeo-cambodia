import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { etag } from 'hono/etag';

import { config } from './config.js';
import { globalRateLimiter } from './middleware/rate-limiter.js';
import { adminRoutes } from './routes/admin.routes.js';
import { geocodeRoutes } from './routes/geocode.routes.js';
import { healthRoutes } from './routes/health.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = new Hono();

// 1. Essential HTTP Security Headers (OWASP Recommended)
app.use(
  '*',
  secureHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'SAMEORIGIN',
    xXssProtection: '0',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://opengeo-cambodia.pphat.me'],
    },
  })
);

// 2. Request Logging & JSON Formatting
app.use('*', logger());
app.use('*', prettyJSON());

// 3. Automatic HTTP ETag generation & conditional request handling (304 Not Modified)
app.use('*', etag());

// 4. Hardened CORS Configuration (Supports ETag / If-None-Match)
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Accept', 'If-None-Match'],
    exposeHeaders: ['ETag', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    maxAge: 86400,
  })
);

// 4. Rate Limiting for all API routes (120 req/min/IP)
app.use('/api/*', globalRateLimiter);

// 5. Serve Interactive Testing Dashboard at Root & /demo
function findDemoHtml(): string | null {
  const candidates = [
    path.resolve(__dirname, 'views', 'demo.html'),
    path.resolve(__dirname, '..', 'src', 'views', 'demo.html'),
    path.resolve(process.cwd(), 'dist', 'views', 'demo.html'),
    path.resolve(process.cwd(), 'src', 'views', 'demo.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }
  return null;
}

app.get('/', (c) => {
  const html = findDemoHtml();
  if (html) {
    c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    return c.html(html);
  }
  return c.text('OpenGeo Cambodia API is running. Visit /api/info for documentation.');
});

app.get('/demo', (c) => {
  const html = findDemoHtml();
  if (html) {
    c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    return c.html(html);
  }
  return c.redirect('/');
});

// 6. Mount API Routes
app.route('/api/admin', adminRoutes);
app.route('/api/geocode', geocodeRoutes);
app.route('/', healthRoutes);

// 7. 404 Not Found Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Endpoint not found',
      path: c.req.path,
      documentation: '/api/info',
    },
    404
  );
});

// 8. Global Error Handler with Production Sanitization (CWE-209 Prevention)
app.onError((err, c) => {
  console.error('[Hono Error]', err);
  const isProd = config.nodeEnv === 'production';
  const errorMessage = isProd ? 'Internal Server Error' : err.message || 'Internal Server Error';

  return c.json(
    {
      success: false,
      error: errorMessage,
    },
    500
  );
});
