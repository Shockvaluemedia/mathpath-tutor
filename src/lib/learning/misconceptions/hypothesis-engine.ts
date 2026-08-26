import type {
  ActiveMisconceptionHypothesis,
  DiagnosticFollowUp,
  LearnerMisconceptionState,
  MisconceptionEvidenceInput,
  MisconceptionEvidenceUpdate,
  SelectedDiagnosticFollowUp,
} from "./types";

const MIN_PROBABILITY = 0.01;
const MAX_PROBABILITY = 0.99;

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return MIN_PROBABILITY;
  return Math.min(MAX_PROBABILITY, Math.max(MIN_PROBABILITY, value));
}

function statusForEvidence(
  previousStatus: LearnerMisconceptionState["status"],
  probability: number,
  contradictingEvidenceCount: number,
  direction: MisconceptionEvidenceInput["direction"]
): LearnerMisconceptionState["status"] {
  if (contradictingEvidenceCount >= 3 && probability < 0.2) return "RESOLVED";
  if (
    direction === "CONTRADICTS" &&
    (previousStatus === "CONFIRMED" || previousStatus === "RESOLVING")
  ) {
    return "RESOLVING";
  }
  if (probability >= 0.75) return "CONFIRMED";
  if (probability >= 0.5) return "LIKELY";
  return "SUSPECTED";
}

export function applyMisconceptionEvidence(
  current: LearnerMisconceptionState,
  evidence: MisconceptionEvidenceInput
): MisconceptionEvidenceUpdate {
  const prior = clampProbability(current.probability);
  const weight = Math.min(3, Math.max(0.1, evidence.weight ?? 1));
  const likelihoodRatio = evidence.direction === "SUPPORTS"
    ? Math.pow(3, weight)
    : Math.pow(0.3, weight);
  const priorOdds = prior / (1 - prior);
  const posterior = clampProbability(
    (priorOdds * likelihoodRatio) / (1 + priorOdds * likelihoodRatio)
  );
  const contradictingEvidenceCount = current.contradictingEvidenceCount +
    (evidence.direction === "CONTRADICTS" ? 1 : 0);
  const status = statusForEvidence(
    current.status,
    posterior,
    contradictingEvidenceCount,
    evidence.direction
  );

  return {
    probability: posterior,
    probabilityDelta: posterior - prior,
    status,
    evidenceCount: current.evidenceCount + 1,
    contradictingEvidenceCount,
    resolved: status === "RESOLVED",
    reasonCode: evidence.direction === "SUPPORTS"
      ? "SIGNATURE_EVIDENCE_SUPPORTED_HYPOTHESIS"
      : status === "RESOLVED"
        ? "SUFFICIENT_CONTRADICTORY_EVIDENCE"
        : "CONTRADICTORY_EVIDENCE_REDUCED_HYPOTHESIS",
  };
}

export function selectDiscriminatingFollowUp(
  hypotheses: ActiveMisconceptionHypothesis[],
  questions: DiagnosticFollowUp[]
): SelectedDiagnosticFollowUp | null {
  const active = hypotheses.filter(
    (hypothesis) =>
      hypothesis.status !== "RESOLVED" &&
      hypothesis.probability >= 0.1
  );
  if (active.length === 0) return null;

  const scored = questions.map((question) => {
    const targeted = active.filter((hypothesis) =>
      question.hypothesisCodes.includes(hypothesis.code)
    );
    const uncertainty = targeted.reduce(
      (sum, hypothesis) =>
        sum + hypothesis.probability * (1 - hypothesis.probability),
      0
    );
    const competingBonus = targeted.length > 1 ? 0.25 : 0;
    const coverage = targeted.length / active.length;
    return { question, score: uncertainty + competingBonus + coverage * 0.1 };
  });

  const selected = scored
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.question.id.localeCompare(right.question.id)
    )[0];

  return selected
    ? {
        question: selected.question,
        informationScore: selected.score,
        reasonCode: "DISTINGUISH_COMPETING_MISCONCEPTIONS",
      }
    : null;
}
