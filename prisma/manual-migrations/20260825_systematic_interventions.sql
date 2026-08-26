ALTER TYPE "InterventionType" ADD VALUE IF NOT EXISTS 'HUMAN_TUTOR_ESCALATION';

ALTER TABLE "tutoring_sessions"
  ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "termination_reason" TEXT;

CREATE TABLE IF NOT EXISTS "intervention_decisions" (
  "id" TEXT NOT NULL,
  "evaluation_key" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "intervention_id" TEXT,
  "type" "InterventionType" NOT NULL,
  "status" TEXT NOT NULL,
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "thresholds" JSONB NOT NULL DEFAULT '{}',
  "reason" TEXT NOT NULL,
  "reason_codes" JSONB NOT NULL DEFAULT '[]',
  "actions" JSONB NOT NULL DEFAULT '[]',
  "system_confidence" DOUBLE PRECISION NOT NULL,
  "model_version" TEXT NOT NULL DEFAULT 'intervention-v1',
  "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intervention_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intervention_decisions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "intervention_decisions_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "intervention_decisions_evaluation_key_key" ON "intervention_decisions"("evaluation_key");
CREATE INDEX IF NOT EXISTS "intervention_decisions_learner_id_type_evaluated_at_idx" ON "intervention_decisions"("learner_id", "type", "evaluated_at");
CREATE INDEX IF NOT EXISTS "intervention_decisions_status_evaluated_at_idx" ON "intervention_decisions"("status", "evaluated_at");

CREATE TABLE IF NOT EXISTS "intervention_outcomes" (
  "id" TEXT NOT NULL,
  "intervention_id" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "baseline_value" DOUBLE PRECISION,
  "current_value" DOUBLE PRECISION,
  "target_value" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intervention_outcomes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intervention_outcomes_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "intervention_outcomes_intervention_id_metric_measured_at_idx" ON "intervention_outcomes"("intervention_id", "metric", "measured_at");
CREATE INDEX IF NOT EXISTS "interventions_learner_id_status_type_idx" ON "interventions"("learner_id", "status", "type");
