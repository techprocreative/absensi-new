import { createServer } from "http";
import dotenv from "dotenv";
import logger from "./utils/logger";
import { setupVite, serveStatic, log } from "./vite";
import { createApp } from "./app";

dotenv.config();

const app = createApp();

(async () => {
  const server = createServer(app);

  // only setup vite in development and after
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
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info(`🚀 FaceAttend API Server started`);
      logger.info(`📍 Server: http://0.0.0.0:${port}`);
      logger.info(`📚 API Docs: http://localhost:${port}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${port}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      log(`serving on port ${port}`);
    },
  );
})();
