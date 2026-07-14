import assert from "node:assert/strict";
import test from "node:test";
import { generateToken } from "./auth";

test("production authentication fails closed when JWT_SECRET is missing", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = mutableEnv.NODE_ENV;
  const previousDemoMode = mutableEnv.NEXT_PUBLIC_DEMO_MODE;
  const previousJwtSecret = mutableEnv.JWT_SECRET;

  try {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.NEXT_PUBLIC_DEMO_MODE = "false";
    delete mutableEnv.JWT_SECRET;

    assert.throws(
      () =>
        generateToken({
          userId: "guardian-1",
          email: "guardian-1@example.test",
          role: "PARENT",
        }),
      /JWT_SECRET is required/
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;

    if (previousDemoMode === undefined) delete mutableEnv.NEXT_PUBLIC_DEMO_MODE;
    else mutableEnv.NEXT_PUBLIC_DEMO_MODE = previousDemoMode;

    if (previousJwtSecret === undefined) delete mutableEnv.JWT_SECRET;
    else mutableEnv.JWT_SECRET = previousJwtSecret;
  }
});
