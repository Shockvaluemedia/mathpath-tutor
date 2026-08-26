DROP TABLE IF EXISTS "learning_experiment_assignments";
DROP TABLE IF EXISTS "ai_usage_events";
ALTER TABLE "sprint_enrollments" DROP COLUMN IF EXISTS "learning_path_variant";
