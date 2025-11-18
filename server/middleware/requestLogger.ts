import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { logRequest, logSecurityEvent } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.headers["x-request-id"] as string || randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  req.startTime = Date.now();

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - (req.startTime || 0);
    const { method, path, ip } = req;
    const { statusCode } = res;

    // Log security events
    if (statusCode === 401) {
      logSecurityEvent("Unauthorized access attempt", {
        method,
        path,
        ip,
        userAgent: req.headers["user-agent"],
        requestId: req.requestId,
      });
    } else if (statusCode === 429) {
      logSecurityEvent("Rate limit exceeded", {
        method,
        path,
        ip,
        requestId: req.requestId,
      });
    }

    // Log request
    logRequest(method, path, statusCode, duration, {
      requestId: req.requestId,
      ip,
      userAgent: req.headers["user-agent"],
    });
  });

  next();
}

export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction) {
  // Remove sensitive fields from logging
  if (req.body) {
    const sanitized = { ...req.body };
    if (sanitized.password) sanitized.password = "***";
    if (sanitized.token) sanitized.token = "***";
    req.body._sanitized = sanitized;
  }
  next();
}
