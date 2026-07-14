import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "./types";

const DEVELOPMENT_JWT_SECRET = "mathpath-dev-secret-change-in-production";
const USER_ROLES = new Set<UserRole>([
  "LEARNER",
  "PARENT",
  "MENTOR",
  "TEACHER",
  "TUTOR",
  "SCHOOL_ADMIN",
  "ORG_ADMIN",
  "FACILITATOR",
  "ADMIN",
]);

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const productionApp =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

  if (productionApp) {
    throw new Error("JWT_SECRET is required outside demo mode");
  }

  return DEVELOPMENT_JWT_SECRET;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (
      typeof payload === "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      !USER_ROLES.has(payload.role as UserRole)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
