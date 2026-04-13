require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const socketIo = require('socket.io');

const logger = require('./config/logger');
const constants = require('./config/constants');
const { requestLogger, errorHandler } = require('./middleware/authMiddleware');

// Routes
const healthRoutes = require('./routes/health');
const relayRoutes = require('./routes/relay');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const streamingRoutes = require('./routes/streaming');
const adminRoutes = require('./routes/admin');
const alertsRoutes = require('./routes/alerts');

// Create Express app
const app = express();
const server = createServer(app);
const io = socketIo(server, {
  cors: {
    origin: constants.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(requestLogger);

// CORS configuration - restrict to allowed origins
const corsOrigins = constants.CORS_ORIGIN === '*'
  ? '*'
  : constants.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parser: support raw binary for frames
app.use(bodyParser.raw({ type: 'image/jpeg', limit: `${constants.MAX_FRAME_SIZE / (1024 * 1024)}mb` }));
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '128kb' }));
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: constants.RATE_LIMIT_WINDOW_MS,
  max: constants.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', deviceRoutes);
app.use('/api', streamingRoutes);
app.use('/api', adminRoutes);
app.use('/api', alertsRoutes);
app.use('/api', relayRoutes); // Legacy routes - keep last for fallback

// Health check on root
app.get('/', (req, res) => {
  res.json({
    message: 'Alfred Camera Relay Server',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use(errorHandler);

// WebSocket setup (ready for future use)
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`Alfred Camera Relay Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Auth token configured: ${constants.AUTH_TOKEN ? 'yes' : 'no'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Unhandled rejection
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection at:', err);
});

module.exports = app;
