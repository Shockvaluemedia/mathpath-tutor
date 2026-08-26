-- Additive deterministic mathematics problem templates and generated instances.

BEGIN;

CREATE TABLE IF NOT EXISTS "problem_templates" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "template_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "target_skill_id" TEXT NOT NULL,
  "prerequisite_skill_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "difficulty_min" INTEGER NOT NULL DEFAULT 1,
  "difficulty_max" INTEGER NOT NULL DEFAULT 5,
  "representation_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "misconception_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "generator_version" TEXT NOT NULL DEFAULT 'math-problems-v1',
  "constraints" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "problem_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "problem_templates_difficulty_valid" CHECK ("difficulty_min" BETWEEN 1 AND 5 AND "difficulty_max" BETWEEN "difficulty_min" AND 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS "problem_templates_code_key" ON "problem_templates"("code");
CREATE INDEX IF NOT EXISTS "problem_templates_target_skill_id_is_active_idx" ON "problem_templates"("target_skill_id", "is_active");

CREATE TABLE IF NOT EXISTS "problem_constraints" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "problem_constraints_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "problem_constraints_template_id_key_key" ON "problem_constraints"("template_id", "key");

CREATE TABLE IF NOT EXISTS "problem_instances" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "learner_id" TEXT,
  "seed" TEXT NOT NULL,
  "target_skill_id" TEXT NOT NULL,
  "prerequisite_skill_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "difficulty" INTEGER NOT NULL,
  "prompt" TEXT NOT NULL,
  "correct_answer" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "answer_type" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "distractors" JSONB NOT NULL DEFAULT '[]',
  "representation_type" TEXT NOT NULL,
  "context_type" TEXT,
  "required_operation_count" INTEGER NOT NULL DEFAULT 1,
  "validation" JSONB NOT NULL DEFAULT '{}',
  "generator_version" TEXT NOT NULL DEFAULT 'math-problems-v1',
  "served_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "problem_instances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "problem_instances_difficulty_valid" CHECK ("difficulty" BETWEEN 1 AND 5),
  CONSTRAINT "problem_instances_operation_count_valid" CHECK ("required_operation_count" >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "problem_instances_template_id_seed_learner_id_key" ON "problem_instances"("template_id", "seed", "learner_id");
CREATE INDEX IF NOT EXISTS "problem_instances_learner_id_target_skill_id_created_at_idx" ON "problem_instances"("learner_id", "target_skill_id", "created_at");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_templates_target_skill_id_fkey') THEN
    ALTER TABLE "problem_templates" ADD CONSTRAINT "problem_templates_target_skill_id_fkey"
      FOREIGN KEY ("target_skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_constraints_template_id_fkey') THEN
    ALTER TABLE "problem_constraints" ADD CONSTRAINT "problem_constraints_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "problem_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_instances_template_id_fkey') THEN
    ALTER TABLE "problem_instances" ADD CONSTRAINT "problem_instances_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "problem_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_instances_learner_id_fkey') THEN
    ALTER TABLE "problem_instances" ADD CONSTRAINT "problem_instances_learner_id_fkey"
      FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_instances_target_skill_id_fkey') THEN
    ALTER TABLE "problem_instances" ADD CONSTRAINT "problem_instances_target_skill_id_fkey"
      FOREIGN KEY ("target_skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
