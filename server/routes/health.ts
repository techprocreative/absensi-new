import { Express, Request, Response } from "express";
import { storage } from "../storage";

export function registerHealthRoutes(app: Express) {
  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Basic health check
   *     description: Returns the API health status
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 uptime:
   *                   type: number
   *                   description: Uptime in seconds
   */
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  /**
   * @swagger
   * /health/ready:
   *   get:
   *     tags: [Health]
   *     summary: Readiness check
   *     description: Checks if the service is ready to accept requests (database connection, etc.)
   *     responses:
   *       200:
   *         description: Service is ready
   *       503:
   *         description: Service is not ready
   */
  app.get("/health/ready", async (req: Request, res: Response) => {
    try {
      // Test database connection by attempting a simple query
      await storage.getAllEmployees();

      res.json({
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
          storage: "ok",
        },
      });
    } catch (error) {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: "error",
          storage: "error",
        },
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * @swagger
   * /health/live:
   *   get:
   *     tags: [Health]
   *     summary: Liveness check
   *     description: Checks if the service is alive
   *     responses:
   *       200:
   *         description: Service is alive
   */
  app.get("/health/live", (req: Request, res: Response) => {
    res.json({
      status: "alive",
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
    });
  });
}
