BEGIN;
DROP TABLE IF EXISTS "thinking_competency_evidence";
DROP TABLE IF EXISTS "learner_thinking_competencies";
DROP TABLE IF EXISTS "thinking_competencies";
ALTER TABLE "problem_instances" DROP COLUMN IF EXISTS "competency_codes", DROP COLUMN IF EXISTS "transfer_type";
ALTER TABLE "problem_templates" DROP COLUMN IF EXISTS "transfer_types", DROP COLUMN IF EXISTS "competency_codes";
COMMIT;
