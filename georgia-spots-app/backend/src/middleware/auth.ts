import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "ტოკენი არასწორია ან ვადაგასულია" });
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
    } catch {
      // ignore invalid token, treat as anonymous
    }
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) return res.status(401).json({ error: "ავტორიზაცია საჭიროა" });
  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.userId) as any;
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: "მხოლოდ ადმინისტრატორისთვის" });
  }
  next();
}

export { JWT_SECRET };
