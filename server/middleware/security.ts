import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export const generalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  message: { error: "Terlalu banyak request, silakan coba lagi nanti" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000", 10),
  max: parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 
    (process.env.NODE_ENV === "development" ? "100" : "5"), 
    10
  ),
  message: { error: "Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => process.env.NODE_ENV === "development" && process.env.DISABLE_RATE_LIMIT === "true",
});

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Data tidak valid",
      details: err.errors,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      error: "Autentikasi gagal",
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan pada server";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
