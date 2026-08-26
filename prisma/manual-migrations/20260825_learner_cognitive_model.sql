-- Additive, rebuildable learner cognitive-model projections.
-- Apply only after 20260824_evidence_mastery.sql and validation against a restored snapshot.

BEGIN;

ALTER TABLE "learner_profiles"
  ADD COLUMN IF NOT EXISTS "cognitive_summary" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "cognitive_model_version" TEXT NOT NULL DEFAULT 'uninitialized',
  ADD COLUMN IF NOT EXISTS "cognitive_model_updated_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "learner_patterns" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "pattern_type" TEXT NOT NULL,
  "scope_key" TEXT NOT NULL DEFAULT 'global',
  "statement" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "model_version" TEXT NOT NULL DEFAULT 'cognitive-v1',
  "first_observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learner_patterns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learner_patterns_valid_confidence" CHECK ("confidence" BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS "learner_patterns_learner_id_pattern_type_scope_key_key"
  ON "learner_patterns"("learner_id", "pattern_type", "scope_key");
CREATE INDEX IF NOT EXISTS "learner_patterns_learner_id_status_confidence_idx"
  ON "learner_patterns"("learner_id", "status", "confidence");

CREATE TABLE IF NOT EXISTS "instructional_strategy_performance" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "skill_id" TEXT,
  "strategy" TEXT NOT NULL,
  "scope_key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "successful_attempts" INTEGER NOT NULL DEFAULT 0,
  "average_outcome_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "average_mastery_gain" DOUBLE PRECISION,
  "average_confidence_gain" DOUBLE PRECISION,
  "average_time_to_success_ms" INTEGER,
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "model_version" TEXT NOT NULL DEFAULT 'cognitive-v1',
  "first_used_at" TIMESTAMP(3) NOT NULL,
  "last_used_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instructional_strategy_performance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "instructional_strategy_nonnegative_attempts" CHECK ("attempts" >= 0 AND "successful_attempts" >= 0),
  CONSTRAINT "instructional_strategy_valid_outcome" CHECK ("average_outcome_score" BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS "instructional_strategy_performance_learner_strategy_scope_key_key"
  ON "instructional_strategy_performance"("learner_id", "strategy", "scope_key");
CREATE INDEX IF NOT EXISTS "instructional_strategy_performance_learner_outcome_idx"
  ON "instructional_strategy_performance"("learner_id", "average_outcome_score");
CREATE INDEX IF NOT EXISTS "instructional_strategy_performance_skill_strategy_idx"
  ON "instructional_strategy_performance"("skill_id", "strategy");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_patterns_learner_id_fkey') THEN
    ALTER TABLE "learner_patterns" ADD CONSTRAINT "learner_patterns_learner_id_fkey"
      FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instructional_strategy_performance_learner_id_fkey') THEN
    ALTER TABLE "instructional_strategy_performance" ADD CONSTRAINT "instructional_strategy_performance_learner_id_fkey"
      FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instructional_strategy_performance_skill_id_fkey') THEN
    ALTER TABLE "instructional_strategy_performance" ADD CONSTRAINT "instructional_strategy_performance_skill_id_fkey"
      FOREIGN KEY ("skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
