import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDemoSprintReport,
  buildSprintReport,
} from "./sprint";

const progress = {
  student: {
    id: "learner-1",
    name: "Alex",
    grade: 5,
    confidenceLevel: 5,
  },
  stats: {
    lessonsCompletedThisWeek: 3,
    totalLessons: 3,
    timeSpentMinutes: 24,
    avgConfidence: 6,
    confidenceTrend: "stable" as const,
    tutorSessionsThisWeek: 0,
  },
  skills: {
    mastered: [],
    developing: [],
    weak: [
      {
        skillId: "fractions",
        name: "Fractions",
        domain: "Number Sense",
        score: 45,
      },
    ],
  },
  latestReport: null,
};

const baseline = [
  {
    skillId: "fractions",
    name: "Fractions",
    domain: "Number Sense",
    correctCount: 1,
    questionCount: 4,
    score: 25,
    confidence: 4,
  },
];

test("production reports never synthesize a baseline from current mastery", () => {
  const report = buildSprintReport(progress);

  assert.equal(report.evidenceStatus, "not_started");
  assert.equal(report.skillDeltas[0].baseline, null);
  assert.equal(report.skillDeltas[0].current, null);
  assert.equal(report.confidenceStart, null);
  assert.equal(report.confidenceCurrent, null);
  assert.match(report.parentSummary, /Complete the diagnostic/);
});

test("baseline-only reports keep progress pending", () => {
  const report = buildSprintReport(progress, { baseline });

  assert.equal(report.evidenceStatus, "baseline_only");
  assert.equal(report.skillDeltas[0].baseline, 25);
  assert.equal(report.skillDeltas[0].current, null);
  assert.equal(report.skillDeltas[0].delta, null);
  assert.equal(report.confidenceStart, 4);
  assert.equal(report.confidenceCurrent, null);
  assert.match(report.parentSummary, /endline check/);
});

test("matching baseline and endline snapshots produce measured deltas", () => {
  const report = buildSprintReport(progress, {
    baseline,
    endline: [
      {
        ...baseline[0],
        correctCount: 3,
        score: 75,
        confidence: 7,
      },
    ],
    events: ["sprint_report_viewed"],
  });

  assert.equal(report.evidenceStatus, "measured");
  assert.equal(report.skillDeltas[0].baseline, 25);
  assert.equal(report.skillDeltas[0].current, 75);
  assert.equal(report.skillDeltas[0].delta, 50);
  assert.equal(report.confidenceStart, 4);
  assert.equal(report.confidenceCurrent, 7);
  assert.match(report.parentSummary, /\+50 percentage points/);
});

test("demo reports are unmistakably labeled and internally complete", () => {
  const report = buildDemoSprintReport(progress, { completeSprint: true });

  assert.equal(report.evidenceStatus, "demo");
  assert.equal(report.evidenceLabel, "Demo data");
  assert.match(report.parentSummary, /Demo data only/);
  assert.doesNotMatch(report.nextSteps.join(" "), /Complete the diagnostic/);
  assert.equal(report.sessionsCompleted, 10);
  assert.equal(report.sessions.every((session) => session.status === "complete"), true);
  assert.equal(typeof report.skillDeltas[0].baseline, "number");
  assert.equal(typeof report.skillDeltas[0].current, "number");
});
