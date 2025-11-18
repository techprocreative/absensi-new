import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger, { logError } from "../utils/logger";

export interface StandardError {
  error: {
    code: string;
    message: string;
    details?: any[];
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export function createStandardError(
  req: Request,
  statusCode: number,
  code: string,
  message: string,
  details?: any[]
): StandardError {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId: req.headers["x-request-id"] as string,
    },
  };
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  logError(err, req.path);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((error) => ({
      field: error.path.join("."),
      message: error.message,
      code: error.code,
    }));

    return res.status(400).json(
      createStandardError(req, 400, "VALIDATION_ERROR", "Data tidak valid", details)
    );
  }

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      createStandardError(req, err.statusCode, err.code, err.message, err.details)
    );
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json(
      createStandardError(req, 401, "INVALID_TOKEN", "Token tidak valid")
    );
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json(
      createStandardError(req, 401, "TOKEN_EXPIRED", "Token sudah kadaluarsa")
    );
  }

  // Handle common HTTP errors
  if (err.status || err.statusCode) {
    const statusCode = err.status || err.statusCode;
    const code = `HTTP_${statusCode}`;
    const message = err.message || "Terjadi kesalahan";

    return res.status(statusCode).json(
      createStandardError(req, statusCode, code, message)
    );
  }

  // Default 500 error
  const statusCode = 500;
  const code = "INTERNAL_SERVER_ERROR";
  const message =
    process.env.NODE_ENV === "production"
      ? "Terjadi kesalahan pada server"
      : err.message || "Internal server error";

  // Include stack trace in development
  const error = createStandardError(req, statusCode, code, message);
  if (process.env.NODE_ENV === "development" && err.stack) {
    (error.error as any).stack = err.stack;
  }

  return res.status(statusCode).json(error);
}

// Helper to throw standard errors
export function throwError(
  statusCode: number,
  code: string,
  message: string,
  details?: any[]
): never {
  throw new AppError(statusCode, code, message, details);
}
