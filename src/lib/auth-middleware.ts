import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromHeader, TokenPayload } from "./auth";
import { authorizeLearnerAccess, LearnerOwnership } from "./authorization";
import { UserRole } from "./types";

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export type RequestAuthResult =
  | { ok: true; user: TokenPayload }
  | { ok: false; response: NextResponse };

export type RequestLearnerAccessResult =
  | { ok: true; user: TokenPayload; learner: LearnerOwnership }
  | { ok: false; response: NextResponse };

export function authenticateRequest(request: NextRequest): RequestAuthResult {
  const headerToken = getTokenFromHeader(request.headers.get("authorization"));
  const cookieToken = ["GET", "HEAD"].includes(request.method)
    ? request.cookies.get("mathpath_token")?.value
    : null;
  const token = headerToken || cookieToken || null;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, user: payload };
}

export function requireRequestRole(
  request: NextRequest,
  roles: UserRole[]
): RequestAuthResult {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth;

  if (!roles.includes(auth.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}

export async function requireRequestLearnerAccess(
  request: NextRequest,
  learnerId: string
): Promise<RequestLearnerAccessResult> {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth;

  const access = await authorizeLearnerAccess(auth.user, learnerId);
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: access.error },
        { status: access.status }
      ),
    };
  }

  return { ok: true, user: auth.user, learner: access.learner };
}

export function withAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const auth = authenticateRequest(request);
    if (!auth.ok) return auth.response;
    return handler(request, auth.user);
  };
}

export function withRole(roles: UserRole[]) {
  return (
    handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
  ) => {
    return withAuth(async (request, user) => {
      if (!roles.includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return handler(request, user);
    });
  };
}
