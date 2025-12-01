import winston from "winston";
import path from "path";

const logDir = "logs";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0 && meta.stack) {
      msg += `\n${meta.stack}`;
    } else if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "faceattend-api" },
  transports: [
    // Console transport (always enabled in development)
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production" ? logFormat : consoleFormat,
    }),
  ],
});

// Add file transports only in production or if explicitly enabled.
// Skip file logging on serverless platforms like Vercel (VERCEL env is set).
if (
  (process.env.NODE_ENV === "production" ||
    process.env.ENABLE_FILE_LOGGING === "true") &&
  !process.env.VERCEL
) {
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Helper functions for common logging patterns
export const logRequest = (method: string, path: string, statusCode: number, duration: number, meta?: any) => {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  logger.log(level, `${method} ${path} ${statusCode} - ${duration}ms`, meta);
};

export const logError = (error: Error, context?: string) => {
  logger.error(`${context ? `[${context}] ` : ""}${error.message}`, {
    stack: error.stack,
    name: error.name,
  });
};

export const logSecurityEvent = (event: string, details: any) => {
  logger.warn(`SECURITY: ${event}`, details);
};

export const logPerformance = (operation: string, duration: number, threshold: number = 1000) => {
  if (duration > threshold) {
    logger.warn(`SLOW OPERATION: ${operation} took ${duration}ms`, { operation, duration, threshold });
  } else {
    logger.debug(`${operation} completed in ${duration}ms`, { operation, duration });
  }
};

export default logger;
