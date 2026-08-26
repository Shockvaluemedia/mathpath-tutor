-- Additive evidence-ledger and mastery-projection migration for existing pilot databases.
-- Apply only after the foundation migration and after validating against a restored snapshot.

BEGIN;

DO $$ BEGIN
  CREATE TYPE "LearningEvidenceType" AS ENUM ('EXPOSURE', 'ASSESSMENT', 'PRACTICE', 'RETENTION', 'TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LearningEvidenceOutcome" AS ENUM ('CORRECT', 'INCORRECT', 'PARTIAL', 'UNGRADED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssistanceLevel" AS ENUM ('NONE', 'INDEPENDENT', 'HINTED', 'GUIDED', 'WORKED_EXAMPLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "learner_skill_mastery"
  ADD COLUMN IF NOT EXISTS "mastery_probability" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS "uncertainty" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "confidence_calibration" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "independent_success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "assisted_success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "retention_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "transfer_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fluency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "evidence_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "independent_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "assisted_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "retention_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "transfer_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_evidence_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mastery_model_version" TEXT NOT NULL DEFAULT 'evidence-v1',
  ADD COLUMN IF NOT EXISTS "mastery_reasons" JSONB NOT NULL DEFAULT '[]';

UPDATE "learner_skill_mastery"
SET
  "mastery_probability" = GREATEST(0.01, LEAST(0.99, COALESCE("mastery_score", 0) / 100.0)),
  "uncertainty" = 1,
  "last_evidence_at" = "last_practiced",
  "mastery_model_version" = 'legacy-v0',
  "mastery_reasons" = '["LEGACY_SCORE_WITHOUT_LEDGER_EVIDENCE"]'::jsonb
WHERE "evidence_count" = 0;

ALTER TABLE "assessment_responses"
  ADD COLUMN IF NOT EXISTS "question_id" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_method" TEXT NOT NULL DEFAULT 'LEGACY_CLIENT',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "assessment_responses_assessment_id_question_id_key"
  ON "assessment_responses"("assessment_id", "question_id");

CREATE TABLE IF NOT EXISTS "learning_evidence" (
  "id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "evidence_type" "LearningEvidenceType" NOT NULL,
  "outcome" "LearningEvidenceOutcome" NOT NULL,
  "assistance_level" "AssistanceLevel" NOT NULL DEFAULT 'NONE',
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "learner_answer" TEXT,
  "correct_answer" TEXT,
  "hints_used" INTEGER NOT NULL DEFAULT 0,
  "response_time_ms" INTEGER,
  "expected_response_time_ms" INTEGER,
  "confidence_rating" DOUBLE PRECISION,
  "difficulty" DOUBLE PRECISION,
  "delay_days" DOUBLE PRECISION,
  "representation" TEXT,
  "instructional_strategy" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_evidence_nonnegative_hints" CHECK ("hints_used" >= 0),
  CONSTRAINT "learning_evidence_valid_confidence" CHECK ("confidence_rating" IS NULL OR "confidence_rating" BETWEEN 1 AND 10),
  CONSTRAINT "learning_evidence_valid_difficulty" CHECK ("difficulty" IS NULL OR "difficulty" BETWEEN 1 AND 5),
  CONSTRAINT "learning_evidence_nonnegative_delay" CHECK ("delay_days" IS NULL OR "delay_days" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_evidence_idempotency_key_key"
  ON "learning_evidence"("idempotency_key");
CREATE INDEX IF NOT EXISTS "learning_evidence_learner_id_skill_id_occurred_at_idx"
  ON "learning_evidence"("learner_id", "skill_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "learning_evidence_skill_id_evidence_type_outcome_idx"
  ON "learning_evidence"("skill_id", "evidence_type", "outcome");
CREATE INDEX IF NOT EXISTS "learning_evidence_source_type_source_id_idx"
  ON "learning_evidence"("source_type", "source_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_evidence_learner_id_fkey') THEN
    ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_learner_id_fkey"
      FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_evidence_skill_id_fkey') THEN
    ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_skill_id_fkey"
      FOREIGN KEY ("skill_id") REFERENCES "learning_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
