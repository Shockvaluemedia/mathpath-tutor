-- Removes only Milestone 4 cognitive-model projections. The evidence ledger is untouched.

BEGIN;

DROP TABLE IF EXISTS "instructional_strategy_performance";
DROP TABLE IF EXISTS "learner_patterns";

ALTER TABLE "learner_profiles"
  DROP COLUMN IF EXISTS "cognitive_summary",
  DROP COLUMN IF EXISTS "cognitive_model_version",
  DROP COLUMN IF EXISTS "cognitive_model_updated_at";

COMMIT;
