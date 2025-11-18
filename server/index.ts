import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  helmetMiddleware, 
  corsMiddleware, 
  generalRateLimiter,
} from "./middleware/security";
import { errorHandler } from "./middleware/errorHandler";
import { 
  requestIdMiddleware, 
  requestLoggerMiddleware,
  sanitizeRequestBody 
} from "./middleware/requestLogger";
import { setupSwagger } from "./docs/swagger";
import { registerHealthRoutes } from "./routes/health";
import logger from "./utils/logger";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Request ID and logging
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Compression
app.use(compression());

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Body parsing
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(sanitizeRequestBody);

// Rate limiting
app.use("/api", generalRateLimiter);

// API Documentation
setupSwagger(app);

// Health check endpoints (before API routes)
registerHealthRoutes(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`🚀 FaceAttend API Server started`);
    logger.info(`📍 Server: http://0.0.0.0:${port}`);
    logger.info(`📚 API Docs: http://localhost:${port}/api-docs`);
    logger.info(`🏥 Health Check: http://localhost:${port}/health`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    log(`serving on port ${port}`);
  });
})();
