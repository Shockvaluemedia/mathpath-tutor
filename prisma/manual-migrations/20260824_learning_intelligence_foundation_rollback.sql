-- Destructive rollback for the additive learner-intelligence foundation.
-- This deletes graph and misconception records but leaves legacy prerequisite arrays intact.
-- Run only after exporting the four tables and confirming the application no longer reads them.

BEGIN;

DROP TABLE IF EXISTS "learner_misconception_evidence";
DROP TABLE IF EXISTS "learner_misconceptions";
DROP TABLE IF EXISTS "misconceptions";
DROP TABLE IF EXISTS "skill_dependencies";

DROP TYPE IF EXISTS "MisconceptionEvidenceDirection";
DROP TYPE IF EXISTS "MisconceptionStatus";
DROP TYPE IF EXISTS "SkillDependencyType";

COMMIT;
