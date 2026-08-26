-- Destructive rollback for the evidence ledger and expanded mastery projection.
-- Export learning_evidence before running. Legacy mastery columns and rows remain intact.

BEGIN;

DROP TABLE IF EXISTS "learning_evidence";

DROP INDEX IF EXISTS "assessment_responses_assessment_id_question_id_key";
ALTER TABLE "assessment_responses"
  DROP COLUMN IF EXISTS "question_id",
  DROP COLUMN IF EXISTS "verification_method",
  DROP COLUMN IF EXISTS "metadata";

ALTER TABLE "learner_skill_mastery"
  DROP COLUMN IF EXISTS "mastery_probability",
  DROP COLUMN IF EXISTS "uncertainty",
  DROP COLUMN IF EXISTS "confidence_calibration",
  DROP COLUMN IF EXISTS "independent_success_rate",
  DROP COLUMN IF EXISTS "assisted_success_rate",
  DROP COLUMN IF EXISTS "retention_score",
  DROP COLUMN IF EXISTS "transfer_score",
  DROP COLUMN IF EXISTS "fluency_score",
  DROP COLUMN IF EXISTS "evidence_count",
  DROP COLUMN IF EXISTS "independent_attempts",
  DROP COLUMN IF EXISTS "assisted_attempts",
  DROP COLUMN IF EXISTS "retention_attempts",
  DROP COLUMN IF EXISTS "transfer_attempts",
  DROP COLUMN IF EXISTS "last_evidence_at",
  DROP COLUMN IF EXISTS "mastery_model_version",
  DROP COLUMN IF EXISTS "mastery_reasons";

DROP TYPE IF EXISTS "AssistanceLevel";
DROP TYPE IF EXISTS "LearningEvidenceOutcome";
DROP TYPE IF EXISTS "LearningEvidenceType";

COMMIT;
