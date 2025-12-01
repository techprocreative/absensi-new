import express from "express";
import compression from "compression";
import {
  helmetMiddleware,
  corsMiddleware,
  generalRateLimiter,
} from "./middleware/security";
import { errorHandler } from "./middleware/errorHandler";
import {
  requestIdMiddleware,
  requestLoggerMiddleware,
  sanitizeRequestBody,
} from "./middleware/requestLogger";
import { setupSwagger } from "./docs/swagger";
import { registerHealthRoutes } from "./routes/health";
import { registerRoutes } from "./routes";
import { logRequest } from "./utils/logger";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function createApp() {
  const app = express();

  // Request ID and logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Security middleware
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // Compression
  app.use(compression());

  // Body parsing
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(sanitizeRequestBody);

  // Rate limiting
  app.use("/api", generalRateLimiter);

  // API Documentation
  setupSwagger(app);

  // Health check endpoints (before API routes)
  registerHealthRoutes(app);

  // API request logging
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json.bind(res);
    res.json = ((bodyJson: any, ...args: any[]) => {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson, ...args);
    }) as any;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        const meta = capturedJsonResponse
          ? { response: capturedJsonResponse }
          : undefined;
        logRequest(req.method, path, res.statusCode, duration, meta);
      }
    });

    next();
  });

  // Register API routes
  registerRoutes(app);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}