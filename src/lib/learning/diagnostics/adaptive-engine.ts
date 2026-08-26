import { SkillGraph } from "../graph";
import type {
  DiagnosticCandidateScore,
  DiagnosticDirection,
  DiagnosticNextAction,
  DiagnosticResponseHistoryItem,
  DiagnosticSkillCandidate,
  DiagnosticStopDecision,
  DiagnosticStoppingRules,
} from "./types";

export const DEFAULT_DIAGNOSTIC_STOPPING_RULES: DiagnosticStoppingRules = {
  minimumQuestions: 6,
  maximumQuestions: 18,
  maximumDurationMinutes: 20,
  minimumCoveredSkills: 3,
  maximumMeanUncertainty: 0.5,
  maximumHighPriorityMisconception: 0.65,
};

function clamp(value: number, minimum = 0, maximum = 1): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function responsesForSkill(
  history: DiagnosticResponseHistoryItem[],
  skillId: string
): DiagnosticResponseHistoryItem[] {
  return history.filter((response) => response.skillId === skillId);
}

function observedUncertainty(
  candidate: DiagnosticSkillCandidate,
  history: DiagnosticResponseHistoryItem[]
): number {
  const attempts = responsesForSkill(history, candidate.skillId).length;
  const responseUncertainty = attempts === 0 ? 1 : 1 / Math.sqrt(attempts + 1);
  return clamp(Math.min(candidate.uncertainty, responseUncertainty));
}

export function evaluateDiagnosticStopping(input: {
  candidates: DiagnosticSkillCandidate[];
  history: DiagnosticResponseHistoryItem[];
  startedAt?: Date;
  now?: Date;
  rules?: Partial<DiagnosticStoppingRules>;
}): DiagnosticStopDecision {
  const rules = { ...DEFAULT_DIAGNOSTIC_STOPPING_RULES, ...input.rules };
  const now = input.now ?? new Date();
  const questionCount = input.history.length;
  const coveredSkillIds = new Set(input.history.map((response) => response.skillId));
  const coveredCandidates = input.candidates.filter((candidate) =>
    coveredSkillIds.has(candidate.skillId)
  );
  const meanUncertainty = coveredCandidates.length === 0
    ? 1
    : coveredCandidates.reduce(
        (sum, candidate) => sum + observedUncertainty(candidate, input.history),
        0
      ) / coveredCandidates.length;
  const durationMinutes = input.startedAt
    ? Math.max(0, now.getTime() - input.startedAt.getTime()) / 60_000
    : 0;
  const hasHighPriorityMisconception = coveredCandidates.some(
    (candidate) =>
      candidate.misconceptionProbability > rules.maximumHighPriorityMisconception
  );

  let reason: DiagnosticStopDecision["reason"] = null;
  if (questionCount >= rules.maximumQuestions) {
    reason = "MAXIMUM_QUESTIONS_REACHED";
  } else if (questionCount >= rules.minimumQuestions && durationMinutes >= rules.maximumDurationMinutes) {
    reason = "MAXIMUM_DURATION_REACHED";
  } else if (
    questionCount >= rules.minimumQuestions &&
    coveredSkillIds.size >= rules.minimumCoveredSkills &&
    meanUncertainty <= rules.maximumMeanUncertainty &&
    !hasHighPriorityMisconception
  ) {
    reason = "SUFFICIENT_COVERAGE_AND_CERTAINTY";
  }

  const evidenceProgress = questionCount / Math.max(1, rules.minimumQuestions);
  const coverageProgress = coveredSkillIds.size / Math.max(1, rules.minimumCoveredSkills);
  const certaintyProgress = rules.maximumMeanUncertainty / Math.max(meanUncertainty, 0.01);
  const estimatedProgress = reason
    ? 1
    : clamp(Math.min(evidenceProgress, coverageProgress, certaintyProgress), 0, 0.95);

  return {
    shouldStop: reason !== null,
    reason,
    questionCount,
    coveredSkillCount: coveredSkillIds.size,
    meanUncertainty: round(meanUncertainty),
    estimatedProgress: round(estimatedProgress),
  };
}

function recentDirection(
  graph: SkillGraph,
  candidates: DiagnosticSkillCandidate[],
  history: DiagnosticResponseHistoryItem[]
): { direction: DiagnosticDirection; preferredSkillIds: Set<string>; reasonCodes: string[] } {
  const latest = history.at(-1);
  if (!latest) {
    return { direction: "START", preferredSkillIds: new Set(), reasonCodes: ["GRADE_APPROPRIATE_START"] };
  }

  const mastery = candidates.map((candidate) => ({
    skillId: candidate.skillId,
    masteryProbability: candidate.masteryProbability,
  }));
  if (!latest.isCorrect) {
    const remediation = graph.traverseBackwardOnFailure(latest.skillId, mastery);
    if (remediation) {
      return {
        direction: "DOWN",
        preferredSkillIds: new Set([remediation.blockerSkillId]),
        reasonCodes: ["FAILED_RESPONSE", remediation.reason],
      };
    }
  }

  const latestSkillHistory = responsesForSkill(history, latest.skillId);
  const recentSkillResponses = latestSkillHistory.slice(-2);
  const repeatedIndependentSuccess = recentSkillResponses.length === 2 &&
    recentSkillResponses.every((response) => response.isCorrect && (response.hintsUsed ?? 0) === 0);
  if (latest.isCorrect && repeatedIndependentSuccess) {
    const dependents = graph.getDependentSkills(latest.skillId, ["REQUIRED", "EXTENSION"]);
    if (dependents.length > 0) {
      return {
        direction: "UP",
        preferredSkillIds: new Set(dependents.map((skill) => skill.id)),
        reasonCodes: ["REPEATED_INDEPENDENT_SUCCESS", "PROBE_DEPENDENT_SKILL"],
      };
    }
  }

  return {
    direction: "LATERAL",
    preferredSkillIds: new Set(),
    reasonCodes: latest.isCorrect
      ? ["CONFIRM_OR_BROADEN_EVIDENCE"]
      : ["NO_UNRESOLVED_REQUIRED_PREREQUISITE", "LATERAL_GAP_PROBE"],
  };
}

function scoreCandidate(input: {
  candidate: DiagnosticSkillCandidate;
  grade: number;
  history: DiagnosticResponseHistoryItem[];
  preferredSkillIds: Set<string>;
  focusSkillIds?: Set<string>;
}): DiagnosticCandidateScore {
  const { candidate, grade, history, preferredSkillIds, focusSkillIds } = input;
  const skillHistory = responsesForSkill(history, candidate.skillId);
  const attemptedQuestions = new Set(history.map((response) => response.questionId));
  const inGrade = grade >= candidate.gradeMin && grade <= candidate.gradeMax;
  const gradeDistance = inGrade
    ? 0
    : Math.min(Math.abs(grade - candidate.gradeMin), Math.abs(grade - candidate.gradeMax));
  const gradeFit = inGrade ? 1 : Math.max(0, 1 - gradeDistance * 0.35);
  const uncertainty = observedUncertainty(candidate, history);
  const boundaryInformation = 1 - Math.abs(clamp(candidate.masteryProbability) - 0.5) * 2;
  const novelty = 1 / (skillHistory.length + 1);
  const misconceptionValue = clamp(candidate.misconceptionProbability);
  const longitudinalNovelty = 1 / (candidate.evidenceCount + 1);
  const latestSkillResponse = skillHistory.at(-1);
  const confidenceMismatch = latestSkillResponse && (
    (!latestSkillResponse.isCorrect && (latestSkillResponse.confidenceRating ?? 5) >= 7) ||
    (latestSkillResponse.isCorrect && (latestSkillResponse.confidenceRating ?? 5) <= 3)
  ) ? 1 : 0;
  const preferred = preferredSkillIds.has(candidate.skillId);
  const focused = !focusSkillIds || focusSkillIds.size === 0 || focusSkillIds.has(candidate.skillId);
  const score =
    uncertainty * 0.32 +
    boundaryInformation * 0.18 +
    gradeFit * 0.2 +
    novelty * 0.15 +
    misconceptionValue * 0.15 +
    longitudinalNovelty * 0.08 +
    confidenceMismatch * 0.18 +
    (preferred ? 0.45 : 0) +
    (focused ? 0.25 : -0.75);
  const reasonCodes = [
    inGrade ? "GRADE_ALIGNED" : "ADJACENT_GRADE_PROBE",
    uncertainty >= 0.5 ? "HIGH_UNCERTAINTY" : "STATE_CONFIRMATION",
    skillHistory.length === 0 ? "UNTESTED_SKILL" : "REPEAT_EVIDENCE_NEEDED",
  ];
  if (preferred) reasonCodes.push("GRAPH_TRAVERSAL_TARGET");
  if (misconceptionValue >= 0.45) reasonCodes.push("MISCONCEPTION_DISCRIMINATION");
  if (longitudinalNovelty >= 0.5) reasonCodes.push("LIMITED_LONGITUDINAL_EVIDENCE");
  if (confidenceMismatch) reasonCodes.push("CONFIDENCE_CALIBRATION_PROBE");
  if (attemptedQuestions.size >= DEFAULT_DIAGNOSTIC_STOPPING_RULES.minimumQuestions) {
    reasonCodes.push("LATE_DIAGNOSTIC_INFORMATION_GAIN");
  }
  return { skillId: candidate.skillId, score: round(score), reasonCodes };
}

function targetDifficulty(
  candidate: DiagnosticSkillCandidate,
  history: DiagnosticResponseHistoryItem[],
  direction: DiagnosticDirection
): number {
  const recent = responsesForSkill(history, candidate.skillId).at(-1) ?? history.at(-1);
  const masteryTarget = 1 + Math.round(clamp(candidate.masteryProbability) * 4);
  const curriculumTarget = Math.round(clamp(candidate.difficulty / 2, 0.2, 1) * 5);
  let target = Math.round((masteryTarget + curriculumTarget) / 2);
  if (direction === "DOWN" || recent?.isCorrect === false) target -= 1;
  if (direction === "UP" || (recent?.isCorrect && (recent.hintsUsed ?? 0) === 0)) target += 1;
  return Math.min(5, Math.max(1, target));
}

export function selectNextDiagnosticAction(input: {
  graph: SkillGraph;
  candidates: DiagnosticSkillCandidate[];
  history: DiagnosticResponseHistoryItem[];
  grade: number;
  startedAt?: Date;
  now?: Date;
  focusSkillIds?: string[];
  rules?: Partial<DiagnosticStoppingRules>;
}): DiagnosticNextAction {
  const stopDecision = evaluateDiagnosticStopping(input);
  if (stopDecision.shouldStop || input.candidates.length === 0) {
    return {
      action: "STOP",
      direction: input.history.length === 0 ? "START" : "LATERAL",
      reasonCodes: [stopDecision.reason ?? "NO_ELIGIBLE_SKILLS"],
      candidateScores: [],
      stopDecision: stopDecision.shouldStop
        ? stopDecision
        : { ...stopDecision, shouldStop: true, reason: "NO_ELIGIBLE_SKILLS" },
    };
  }

  const movement = recentDirection(input.graph, input.candidates, input.history);
  const focusSkillIds = input.focusSkillIds ? new Set(input.focusSkillIds) : undefined;
  const candidateScores = input.candidates.map((candidate) => scoreCandidate({
    candidate,
    grade: input.grade,
    history: input.history,
    preferredSkillIds: movement.preferredSkillIds,
    focusSkillIds,
  })).sort((left, right) => right.score - left.score || left.skillId.localeCompare(right.skillId));
  const selectedScore = candidateScores[0];
  const selectedSkill = input.candidates.find(
    (candidate) => candidate.skillId === selectedScore.skillId
  )!;

  return {
    action: "ASK",
    selectedSkill,
    targetDifficulty: targetDifficulty(selectedSkill, input.history, movement.direction),
    direction: movement.direction,
    reasonCodes: [...movement.reasonCodes, ...selectedScore.reasonCodes],
    candidateScores: candidateScores.slice(0, 5),
    stopDecision,
  };
}
