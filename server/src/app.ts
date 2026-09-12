import express, { Application, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { config, allowedOrigins } from './config/env';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.routes';
import likeRoutes from './routes/like.routes';
import feedRoutes from './routes/feed.routes';
import exploreRoutes from './routes/explore.routes';
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import conversationRoutes from './routes/conversation.routes';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { register } from './config/metrics';
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app: Application = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, health probes)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        allowedOrigins.includes("*") ||
        normalizedOrigin.endsWith(".vercel.app") ||
        normalizedOrigin.endsWith("yugendhra.me") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url === "/health" ||
        req.url === "/api/health" ||
        req.url === "/metrics",
    },
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

// Track Prometheus HTTP metrics (throughput, latency, errors)
app.use(metricsMiddleware);

// Tier 1: Global rate limiter (skips health check, test mode bypass)
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  res.status(200).send("Welcome to Sotrix");
});

app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Sotrix Backend is running smoothly',
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api', commentRoutes);
app.use('/api', likeRoutes);
app.use('/api', uploadRoutes);
app.use('/api', notificationRoutes);
app.use('/api/conversations', conversationRoutes);

// Register centralized error handling middleware after all routes
app.use(errorHandler);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;

// End of file

