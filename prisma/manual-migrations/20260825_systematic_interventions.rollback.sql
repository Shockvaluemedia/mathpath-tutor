BEGIN;

DROP TABLE IF EXISTS "intervention_outcomes";
DROP TABLE IF EXISTS "intervention_decisions";
DROP INDEX IF EXISTS "interventions_learner_id_status_type_idx";
ALTER TABLE "tutoring_sessions" DROP COLUMN IF EXISTS "termination_reason", DROP COLUMN IF EXISTS "ended_at";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "interventions"
    WHERE "type"::TEXT = 'HUMAN_TUTOR_ESCALATION'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: export or remap HUMAN_TUTOR_ESCALATION interventions before removing the enum value';
  END IF;
END $$;

CREATE TYPE "InterventionType_rollback" AS ENUM (
  'TUTORING',
  'REMEDIATION',
  'CONFIDENCE_RECOVERY',
  'RESTORATIVE_COACHING',
  'MENTORING',
  'PARENT_ENGAGEMENT',
  'WORKFORCE_PATHWAY'
);
ALTER TABLE "interventions"
  ALTER COLUMN "type" TYPE "InterventionType_rollback"
  USING ("type"::TEXT::"InterventionType_rollback");
ALTER TYPE "InterventionType" RENAME TO "InterventionType_migrated";
ALTER TYPE "InterventionType_rollback" RENAME TO "InterventionType";
DROP TYPE "InterventionType_migrated";

COMMIT;
