import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPilotOperatorAction,
  PilotFunnelStep,
} from "./pilot";

function funnel(
  overrides: Partial<Record<PilotFunnelStep, boolean>> = {}
): Record<PilotFunnelStep, boolean> {
  return {
    invited: true,
    diagnosticStarted: true,
    diagnosticCompleted: true,
    paid: false,
    firstLesson: false,
    threeSessions: false,
    reportViewed: false,
    feedbackReceived: false,
    ...overrides,
  };
}

test("a completed diagnostic routes the operator to the paid Sprint offer", () => {
  const action = buildPilotOperatorAction({
    familyName: "Rivera Family",
    studentName: "Maya",
    currentFocus: "Fractions",
    sessionsCompleted: 0,
    funnel: funnel(),
  });

  assert.equal(action.stage, "payment");
  assert.match(action.message, /\$49/);
});

test("a paid family advances to the first lesson action", () => {
  const action = buildPilotOperatorAction({
    familyName: "Rivera Family",
    studentName: "Maya",
    currentFocus: "Fractions",
    sessionsCompleted: 0,
    funnel: funnel({ paid: true }),
  });

  assert.equal(action.stage, "first_lesson");
});
