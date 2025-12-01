import { createApp } from "../server/app";

const app = createApp();

/**
 * Vercel serverless function entry point.
 * This catch-all function handles all routes under /api/* and forwards them
 * to the Express app, which already mounts its own /api/... routes.
 */
export default function handler(req: any, res: any) {
  return app(req, res);
}