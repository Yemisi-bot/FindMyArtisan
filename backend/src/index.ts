import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';
import { UPLOAD_DIR } from './middleware/upload';
import { query } from './config/database';
import authRoutes from './routes/auth';
import providerRoutes from './routes/providers';
import reviewRoutes from './routes/reviews';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Single allowed origin — set CLIENT_URL in .env to your frontend URL
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) which have no Origin header
    if (!origin) return callback(null, true);
    // Allow the single configured origin
    if (origin === allowedOrigin) return callback(null, true);
    // In development, also allow alternative localhost ports (Vite may pick 5173, 5174, ...)
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploaded images (work catalogs, review photos)
// On Railway: mount a Volume and set UPLOAD_DIR to its mount path
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// Health check — `build` lets you confirm which code version is actually
// running (bump this string whenever you need to verify a restart took effect).
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'FindMyArtisan API',
    build: 'auto-visibility+admin-users-2026-07-06',
    routes: ['/api/admin/providers', '/api/admin/users', '/api/admin/providers/:id/suspend'],
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Categories endpoint — mounted at /api/categories for direct access
app.get('/api/categories', async (_req, res) => {
  try {
    const result = await query('SELECT id, name, slug, icon, description FROM service_categories ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Categories] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Upload errors (file too large, wrong type) → client error, not server error
  if (err.name === 'MulterError' || /images are allowed/i.test(err.message)) {
    const message =
      err.message === 'File too large'
        ? 'Each image must be 25 MB or smaller.'
        : err.message;
    res.status(400).json({ success: false, message });
    return;
  }

  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

// Start server
async function start() {
  try {
    // Run database migrations
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`\n🚀 FindMyArtisan API running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
