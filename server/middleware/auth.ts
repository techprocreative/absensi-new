import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: "admin" | "hrd" | "employee" | "salesman";
    employeeId?: string;
  };
}

export interface JWTPayload {
  id: string;
  username: string;
  role: "admin" | "hrd" | "employee" | "salesman";
  employeeId?: string;
}

export function generateToken(payload: JWTPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token autentikasi tidak ditemukan" });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token sudah kadaluarsa" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Token tidak valid" });
    }
    return res.status(401).json({ error: "Autentikasi gagal" });
  }
}

export function requireRole(...roles: Array<"admin" | "hrd" | "employee" | "salesman">) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Autentikasi diperlukan" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Akses ditolak. Anda tidak memiliki izin untuk mengakses resource ini." 
      });
    }

    next();
  };
}
