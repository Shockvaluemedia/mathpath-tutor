export type SprintEvidencePhase = "baseline" | "endline";

export interface AssessmentEvidenceResponse {
  skillId: string;
  isCorrect: boolean;
  confidenceRating: number;
  skill: {
    name: string;
    slug?: string;
    domain?: {
      name: string;
    } | null;
    domainId?: string;
  };
}

export interface SprintSkillMeasurement {
  skillId: string;
  name: string;
  domain: string;
  correctCount: number;
  questionCount: number;
  score: number;
  confidence: number | null;
}

export interface StoredSprintSnapshot {
  phase: string;
  skillId: string;
  skillName: string;
  domain: string;
  correctCount: number;
  questionCount: number;
  score: number;
  confidence: number | null;
}

export function isSprintEvidencePhase(value: unknown): value is SprintEvidencePhase {
  return value === "baseline" || value === "endline";
}

export function buildSkillMeasurements(
  responses: AssessmentEvidenceResponse[]
): SprintSkillMeasurement[] {
  const grouped = new Map<
    string,
    {
      skillId: string;
      name: string;
      domain: string;
      correctCount: number;
      questionCount: number;
      confidenceTotal: number;
      confidenceCount: number;
    }
  >();

  for (const response of responses) {
    const stableSkillId = response.skill.slug ?? response.skillId;
    const current = grouped.get(stableSkillId) ?? {
      skillId: stableSkillId,
      name: response.skill.name,
      domain: response.skill.domain?.name ?? response.skill.domainId ?? "Math",
      correctCount: 0,
      questionCount: 0,
      confidenceTotal: 0,
      confidenceCount: 0,
    };

    current.questionCount += 1;
    current.correctCount += response.isCorrect ? 1 : 0;
    if (Number.isFinite(response.confidenceRating)) {
      current.confidenceTotal += response.confidenceRating;
      current.confidenceCount += 1;
    }
    grouped.set(stableSkillId, current);
  }

  return Array.from(grouped.values())
    .map((measurement) => ({
      skillId: measurement.skillId,
      name: measurement.name,
      domain: measurement.domain,
      correctCount: measurement.correctCount,
      questionCount: measurement.questionCount,
      score: Math.round((measurement.correctCount / measurement.questionCount) * 100),
      confidence: measurement.confidenceCount > 0
        ? Math.round((measurement.confidenceTotal / measurement.confidenceCount) * 10) / 10
        : null,
    }))
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
}

export function splitStoredSnapshots(snapshots: StoredSprintSnapshot[]) {
  const toMeasurement = (snapshot: StoredSprintSnapshot): SprintSkillMeasurement => ({
    skillId: snapshot.skillId,
    name: snapshot.skillName,
    domain: snapshot.domain,
    correctCount: snapshot.correctCount,
    questionCount: snapshot.questionCount,
    score: snapshot.score,
    confidence: snapshot.confidence,
  });

  return {
    baseline: snapshots
      .filter((snapshot) => snapshot.phase === "baseline")
      .map(toMeasurement),
    endline: snapshots
      .filter((snapshot) => snapshot.phase === "endline")
      .map(toMeasurement),
  };
}

export function averageMeasurementConfidence(measurements: SprintSkillMeasurement[]) {
  const values = measurements
    .map((measurement) => measurement.confidence)
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
