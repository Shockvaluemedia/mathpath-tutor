import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { generateToken } from "./auth";
import { authenticateRequest } from "./auth-middleware";

const token = generateToken({
  userId: "guardian-1",
  email: "guardian-1@example.test",
  role: "PARENT",
});

test("bearer authentication works for state-changing requests", () => {
  const request = new NextRequest("http://localhost/api/learners", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });

  const auth = authenticateRequest(request);
  assert.equal(auth.ok, true);
  if (auth.ok) assert.equal(auth.user.userId, "guardian-1");
});

test("session cookies authenticate read-only requests", () => {
  const request = new NextRequest("http://localhost/api/pilot/summary", {
    method: "GET",
    headers: { cookie: `mathpath_token=${token}` },
  });

  const auth = authenticateRequest(request);
  assert.equal(auth.ok, true);
});

test("session cookies alone cannot authenticate state-changing requests", () => {
  const request = new NextRequest("http://localhost/api/learners", {
    method: "POST",
    headers: { cookie: `mathpath_token=${token}` },
  });

  const auth = authenticateRequest(request);
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.response.status, 401);
});
