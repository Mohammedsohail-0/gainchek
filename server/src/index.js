require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRouter = require('./routes/auth');
const gymRouter = require('./routes/gym');
const coachRouter = require('./routes/coach');
const clientRouter = require('./routes/client');
const workoutRouter = require('./routes/workout');
const logRouter = require('./routes/log');
const analyticsRouter = require('./routes/analytics');
const libraryRouter = require('./routes/library');
const { errorHandler } = require('./lib/errors');

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiter on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: 'Too many requests, please try again in 15 minutes.' }
});
app.use('/auth', authLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.use('/auth', authRouter);
app.use('/gym', gymRouter);
app.use('/coach', coachRouter);
app.use('/client', clientRouter);
app.use('/workout', workoutRouter);
app.use('/log', logRouter);
app.use('/analytics', analyticsRouter);
app.use('/library', libraryRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 GainChek v2 API running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
