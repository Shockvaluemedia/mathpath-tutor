BEGIN;

DROP TABLE IF EXISTS "learning_experiment_assignments";
DROP TABLE IF EXISTS "ai_usage_events";
ALTER TABLE IF EXISTS "sprint_enrollments" DROP COLUMN IF EXISTS "learning_path_variant";

DO $$
BEGIN
  IF obj_description(to_regclass('public.sprint_skill_snapshots'), 'pg_class') = 'created-by:20260825_learning_evaluation_observability' THEN
    DROP TABLE "sprint_skill_snapshots";
  END IF;

  IF obj_description(to_regclass('public.sprint_events'), 'pg_class') = 'created-by:20260825_learning_evaluation_observability' THEN
    DROP TABLE "sprint_events";
  END IF;

  IF obj_description(to_regclass('public.sprint_enrollments'), 'pg_class') = 'created-by:20260825_learning_evaluation_observability' THEN
    DROP TABLE "sprint_enrollments";
  END IF;
END $$;

COMMIT;
