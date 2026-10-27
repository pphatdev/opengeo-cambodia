import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { adminRoutes } from './routes/admin.routes.js';
import { geocodeRoutes } from './routes/geocode.routes.js';
import { healthRoutes } from './routes/health.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-Response-Time'],
  })
);

// Serve Interactive Testing Dashboard at Root & /demo
const demoHtmlPath = path.resolve(__dirname, 'views', 'demo.html');

app.get('/', (c) => {
  if (fs.existsSync(demoHtmlPath)) {
    return c.html(fs.readFileSync(demoHtmlPath, 'utf-8'));
  }
  return c.text('OpenGeo Cambodia API is running. Visit /api/info for documentation.');
});

app.get('/demo', (c) => {
  if (fs.existsSync(demoHtmlPath)) {
    return c.html(fs.readFileSync(demoHtmlPath, 'utf-8'));
  }
  return c.redirect('/');
});

// Mount Routes
app.route('/api/admin', adminRoutes);
app.route('/api/geocode', geocodeRoutes);
app.route('/', healthRoutes);

// 404 Not Found Handler
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

// Global Error Handler
app.onError((err, c) => {
  console.error('[Hono Error]', err);
  return c.json(
    {
      success: false,
      error: err.message || 'Internal Server Error',
    },
    500
  );
});
