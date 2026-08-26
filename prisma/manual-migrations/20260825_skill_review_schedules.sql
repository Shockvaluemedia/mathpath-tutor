-- Additive, rebuildable mathematics retention schedules.
-- Apply only after 20260824_evidence_mastery.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS "skill_review_schedules" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "next_review_at" TIMESTAMP(3) NOT NULL,
  "interval_days" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 1.6,
  "retrieval_count" INTEGER NOT NULL DEFAULT 0,
  "successful_retrievals" INTEGER NOT NULL DEFAULT 0,
  "consecutive_successes" INTEGER NOT NULL DEFAULT 0,
  "retention_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "last_review_at" TIMESTAMP(3),
  "last_outcome" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "reason_codes" JSONB NOT NULL DEFAULT '[]',
  "schedule_version" TEXT NOT NULL DEFAULT 'math-retention-v1',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skill_review_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skill_review_schedules_interval_positive" CHECK ("interval_days" >= 1),
  CONSTRAINT "skill_review_schedules_ease_valid" CHECK ("ease_factor" BETWEEN 1 AND 3),
  CONSTRAINT "skill_review_schedules_confidence_valid" CHECK ("retention_confidence" BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS "skill_review_schedules_learner_id_skill_id_key"
  ON "skill_review_schedules"("learner_id", "skill_id");
CREATE INDEX IF NOT EXISTS "skill_review_schedules_learner_id_status_next_review_at_idx"
  ON "skill_review_schedules"("learner_id", "status", "next_review_at");
CREATE INDEX IF NOT EXISTS "skill_review_schedules_skill_id_next_review_at_idx"
  ON "skill_review_schedules"("skill_id", "next_review_at");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_review_schedules_learner_id_fkey') THEN
    ALTER TABLE "skill_review_schedules" ADD CONSTRAINT "skill_review_schedules_learner_id_fkey"
      FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_review_schedules_skill_id_fkey') THEN
    ALTER TABLE "skill_review_schedules" ADD CONSTRAINT "skill_review_schedules_skill_id_fkey"
      FOREIGN KEY ("skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
