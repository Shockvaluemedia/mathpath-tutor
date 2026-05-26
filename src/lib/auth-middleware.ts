import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromHeader, TokenPayload } from "./auth";

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export function withAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    return handler(request, payload);
  };
}

export function withRole(roles: string[]) {
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
