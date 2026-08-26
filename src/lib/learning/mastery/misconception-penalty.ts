export interface MasteryMisconceptionSignal {
  probability: number;
  severity: number;
  status: "LIKELY" | "CONFIRMED" | "RESOLVING";
}

const STATUS_WEIGHT: Record<MasteryMisconceptionSignal["status"], number> = {
  LIKELY: 0.75,
  CONFIRMED: 1,
  RESOLVING: 0.5,
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateMisconceptionPenalty(
  signals: MasteryMisconceptionSignal[]
): number {
  const penalty = signals.reduce((sum, signal) => {
    const probability = clamp(signal.probability, 0, 1);
    const severity = clamp(signal.severity, 1, 5) / 5;
    return sum + probability * severity * STATUS_WEIGHT[signal.status] * 0.12;
  }, 0);

  return Math.round(clamp(penalty, 0, 0.25) * 10_000) / 10_000;
}
