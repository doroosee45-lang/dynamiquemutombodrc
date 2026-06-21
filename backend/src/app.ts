import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { logger } from './utils/logger';
import { redis } from './utils/redis';
import { globalLimiter } from './middleware/rateLimiter';
import { initSocket } from './services/socket.service';

import authRoutes from './routes/auth.routes';
import reportsRoutes from './routes/reports.routes';
import publicationsRoutes from './routes/publications.routes';
import adminRoutes from './routes/admin.routes';
import campaignsRoutes from './routes/campaigns.routes';
import innovationsRoutes from './routes/innovations.routes';
import notificationsRoutes from './routes/notifications.routes';
import territoriesRoutes from './routes/territories.routes';
import eventsRoutes from './routes/events.routes';
import newsletterRoutes from './routes/newsletter.routes';
import joinRoutes from './routes/join.routes';

const app = express();
app.set('trust proxy', 1); // Render / reverse proxy — use X-Forwarded-For for real client IP
const httpServer = http.createServer(app);

const io = initSocket(httpServer);
app.set('io', io);

// Ensure upload / logs directories exist
for (const dir of [path.resolve(config.uploadDir), path.resolve('./logs')]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Security
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      config.frontendUrl,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    const isOnRender = origin?.endsWith('.onrender.com');
    if (!origin || allowed.includes(origin) || isOnRender) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(globalLimiter);

app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/publications', publicationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/innovations', innovationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/territories', territoriesRoutes);
app.use('/api/events',     eventsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/join',       joinRoutes);

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
});

// Root → redirect to frontend
app.get('/', (_req, res) => {
  res.redirect(301, config.frontendUrl);
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.path} introuvable` });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne du serveur' });
});

const start = async () => {
  // MongoDB connection
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', err);
    process.exit(1);
  }

  // Redis — optional, auth falls back to MongoDB when unavailable
  redis.connect().catch(() => {
    logger.info('Redis indisponible — mode dégradé (tokens via MongoDB)');
  });

  httpServer.listen(config.port, () => {
    logger.info(`🚀 Dynamique RDC API (MERN) — Port ${config.port} — ${config.nodeEnv}`);
  });
};

start();

export { io };
