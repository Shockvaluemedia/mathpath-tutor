-- Additive transfer metadata and conservative mathematical-thinking projections.
-- Apply after 20260825_parameterized_problems.sql.

BEGIN;

ALTER TABLE "problem_templates"
  ADD COLUMN IF NOT EXISTS "competency_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "transfer_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "problem_instances"
  ADD COLUMN IF NOT EXISTS "transfer_type" TEXT,
  ADD COLUMN IF NOT EXISTS "competency_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "thinking_competencies" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "thinking_competencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "thinking_competencies_code_key" ON "thinking_competencies"("code");

CREATE TABLE IF NOT EXISTS "learner_thinking_competencies" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "competency_id" TEXT NOT NULL,
  "probability" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
  "uncertainty" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "evidence_count" INTEGER NOT NULL DEFAULT 0,
  "successful_evidence" INTEGER NOT NULL DEFAULT 0,
  "context_count" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'INSUFFICIENT_EVIDENCE',
  "reason_codes" JSONB NOT NULL DEFAULT '[]',
  "model_version" TEXT NOT NULL DEFAULT 'thinking-v1',
  "last_evidence_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learner_thinking_competencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learner_thinking_competencies_probability_valid" CHECK ("probability" BETWEEN 0 AND 1),
  CONSTRAINT "learner_thinking_competencies_uncertainty_valid" CHECK ("uncertainty" BETWEEN 0 AND 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "learner_thinking_competencies_learner_id_competency_id_key" ON "learner_thinking_competencies"("learner_id", "competency_id");
CREATE INDEX IF NOT EXISTS "learner_thinking_competencies_learner_id_status_probability_idx" ON "learner_thinking_competencies"("learner_id", "status", "probability");

CREATE TABLE IF NOT EXISTS "thinking_competency_evidence" (
  "id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "competency_id" TEXT NOT NULL,
  "skill_id" TEXT,
  "outcome" "LearningEvidenceOutcome" NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "context_type" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "thinking_competency_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thinking_competency_evidence_weight_valid" CHECK ("weight" BETWEEN 0.2 AND 1.5)
);
CREATE UNIQUE INDEX IF NOT EXISTS "thinking_competency_evidence_idempotency_key_key" ON "thinking_competency_evidence"("idempotency_key");
CREATE INDEX IF NOT EXISTS "thinking_competency_evidence_learner_id_competency_id_occurred_at_idx" ON "thinking_competency_evidence"("learner_id", "competency_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "thinking_competency_evidence_source_type_source_id_idx" ON "thinking_competency_evidence"("source_type", "source_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_thinking_competencies_learner_id_fkey') THEN
    ALTER TABLE "learner_thinking_competencies" ADD CONSTRAINT "learner_thinking_competencies_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_thinking_competencies_competency_id_fkey') THEN
    ALTER TABLE "learner_thinking_competencies" ADD CONSTRAINT "learner_thinking_competencies_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "thinking_competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thinking_competency_evidence_learner_id_fkey') THEN
    ALTER TABLE "thinking_competency_evidence" ADD CONSTRAINT "thinking_competency_evidence_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thinking_competency_evidence_competency_id_fkey') THEN
    ALTER TABLE "thinking_competency_evidence" ADD CONSTRAINT "thinking_competency_evidence_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "thinking_competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thinking_competency_evidence_skill_id_fkey') THEN
    ALTER TABLE "thinking_competency_evidence" ADD CONSTRAINT "thinking_competency_evidence_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "learning_skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
