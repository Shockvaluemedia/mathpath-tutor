DROP TABLE IF EXISTS "intervention_outcomes";
DROP TABLE IF EXISTS "intervention_decisions";
DROP INDEX IF EXISTS "interventions_learner_id_status_type_idx";
ALTER TABLE "tutoring_sessions" DROP COLUMN IF EXISTS "termination_reason", DROP COLUMN IF EXISTS "ended_at";

-- PostgreSQL enum values cannot be removed safely in-place. HUMAN_TUTOR_ESCALATION remains unused after rollback.
