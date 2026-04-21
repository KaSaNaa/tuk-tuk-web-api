require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes/index');
const { globalErrorHandler, notFoundHandler } = require('./middleware/response');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── 1. Trust proxy (nginx sits in front in production) ────────────────────────
// Required for accurate req.ip and rate-limit keying when behind nginx
if (isProd) app.set('trust proxy', 1);

// ── 2. Helmet — HTTP security headers ─────────────────────────────────────────
// Sets: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
//       Strict-Transport-Security (HSTS), Referrer-Policy,
//       Permissions-Policy, Content-Security-Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   // needed for Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,  // don't enforce HSTS in dev (no cert)
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'no-referrer' },
  hidePoweredBy: true,  // removes X-Powered-By: Express
}));

// ── 3. CORS — locked down in production ──────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: isProd
    ? (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: Origin ${origin} not allowed.`));
    }
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,   // preflight cache: 24 hours
}));

// ── 4. Body parsing — enforce strict limits ───────────────────────────────────
// 10kb is plenty for any API request body — prevents large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── 5. HTTP Parameter Pollution prevention ────────────────────────────────────
// Prevents ?status=ACTIVE&status=SUSPENDED being passed as an array
app.use(hpp({ whitelist: [] }));

// ── 6. Request ID — for distributed tracing and audit correlation ─────────────
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// ── 7. Structured access logging ──────────────────────────────────────────────
morgan.token('request-id', (req) => req.requestId);
morgan.token('user-role', (req) => req.user?.role || 'anon');
const logFormat = isProd
  ? ':remote-addr - [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" :request-id :user-role'
  : 'dev';
app.use(morgan(logFormat));

// ── 8. Rate limiting (defence in depth — nginx also rate-limits) ──────────────
// General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', code: 429, message: 'Too many requests. Please slow down.' },
});

// Stricter limiter for auth endpoints — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', code: 429, message: 'Too many authentication attempts. Try again in 15 minutes.' },
});

// High-frequency limiter for GPS device pings (devices ping every 5-10s)
const devicePingLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 60,          // max 60 pings per minute per IP (1/sec)
  message: { status: 'error', code: 429, message: 'GPS ping rate limit exceeded.' },
});

app.use('/api/', generalLimiter);
app.use('/api/v1/auth/', authLimiter);
app.use('/api/v1/locations', devicePingLimiter);  // device push endpoint

// ── 9. Response hardening headers ────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// ── 10. Swagger UI ────────────────────────────────────────────────────────────
// Disable Swagger in production or gate it behind auth — it exposes API schema
if (!isProd) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Tuk-Tuk Tracking API | Sri Lanka Police',
    customCss: '.swagger-ui .topbar { background-color: #1a237e; }',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api-spec.json', (req, res) => res.json(swaggerSpec));
}

// ── 11. API routes ────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 12. Root info endpoint ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  service: 'Sri Lanka Police – Tuk-Tuk Tracking API',
  version: '1.0.0',
  docs: isProd ? 'Swagger UI disabled in production.' : '/api-docs',
  health: '/api/v1/health',
}));

// ── 13. Error handling ────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── 14. Start server ──────────────────────────────────────────────────────────
// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log('\n🚦 Tuk-Tuk Tracking API');
    console.log(`   Running  : http://127.0.0.1:${PORT}  (internal only — nginx proxies externally)`);
    if (!isProd) console.log(`   API Docs : http://localhost:${PORT}/api-docs`);
    console.log(`   Env      : ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
