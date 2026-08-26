-- Additive migration for deployments that predate checked-in Prisma migrations.
-- Apply only after taking a database snapshot and running this file against a clone.

BEGIN;

DO $$ BEGIN
  CREATE TYPE "SkillDependencyType" AS ENUM ('REQUIRED', 'SUPPORTING', 'PARALLEL', 'EXTENSION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MisconceptionStatus" AS ENUM ('SUSPECTED', 'LIKELY', 'CONFIRMED', 'RESOLVING', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MisconceptionEvidenceDirection" AS ENUM ('SUPPORTS', 'CONTRADICTS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "skill_dependencies" (
  "id" TEXT NOT NULL,
  "prerequisite_skill_id" TEXT NOT NULL,
  "dependent_skill_id" TEXT NOT NULL,
  "dependency_type" "SkillDependencyType" NOT NULL DEFAULT 'REQUIRED',
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "minimum_mastery_required" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "skill_dependencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skill_dependencies_distinct_skills" CHECK ("prerequisite_skill_id" <> "dependent_skill_id"),
  CONSTRAINT "skill_dependencies_positive_weight" CHECK ("weight" > 0),
  CONSTRAINT "skill_dependencies_valid_threshold" CHECK ("minimum_mastery_required" BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS "misconceptions" (
  "id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "signature" JSONB NOT NULL DEFAULT '{}',
  "severity" INTEGER NOT NULL DEFAULT 1,
  "remediation_strategy" JSONB NOT NULL DEFAULT '{}',
  "diagnostic_strategy" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "misconceptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "misconceptions_valid_severity" CHECK ("severity" BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS "learner_misconceptions" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "misconception_id" TEXT NOT NULL,
  "probability" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  "status" "MisconceptionStatus" NOT NULL DEFAULT 'SUSPECTED',
  "evidence_count" INTEGER NOT NULL DEFAULT 0,
  "contradicting_evidence_count" INTEGER NOT NULL DEFAULT 0,
  "first_observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "learner_misconceptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learner_misconceptions_valid_probability" CHECK ("probability" BETWEEN 0 AND 1),
  CONSTRAINT "learner_misconceptions_nonnegative_counts" CHECK ("evidence_count" >= 0 AND "contradicting_evidence_count" >= 0)
);

CREATE TABLE IF NOT EXISTS "learner_misconception_evidence" (
  "id" TEXT NOT NULL,
  "learner_misconception_id" TEXT NOT NULL,
  "direction" "MisconceptionEvidenceDirection" NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "observed_answer" TEXT,
  "expected_answer" TEXT,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learner_misconception_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learner_misconception_evidence_positive_weight" CHECK ("weight" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "skill_dependencies_prerequisite_skill_id_dependent_skill_id_key"
  ON "skill_dependencies"("prerequisite_skill_id", "dependent_skill_id");
CREATE INDEX IF NOT EXISTS "skill_dependencies_dependent_skill_id_dependency_type_idx"
  ON "skill_dependencies"("dependent_skill_id", "dependency_type");
CREATE INDEX IF NOT EXISTS "skill_dependencies_prerequisite_skill_id_idx"
  ON "skill_dependencies"("prerequisite_skill_id");
CREATE UNIQUE INDEX IF NOT EXISTS "misconceptions_code_key" ON "misconceptions"("code");
CREATE INDEX IF NOT EXISTS "misconceptions_skill_id_is_active_idx" ON "misconceptions"("skill_id", "is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "learner_misconceptions_learner_id_misconception_id_key"
  ON "learner_misconceptions"("learner_id", "misconception_id");
CREATE INDEX IF NOT EXISTS "learner_misconceptions_learner_id_status_probability_idx"
  ON "learner_misconceptions"("learner_id", "status", "probability");
CREATE INDEX IF NOT EXISTS "learner_misconception_evidence_learner_misconception_id_obs_idx"
  ON "learner_misconception_evidence"("learner_misconception_id", "observed_at");
CREATE INDEX IF NOT EXISTS "learner_misconception_evidence_source_type_source_id_idx"
  ON "learner_misconception_evidence"("source_type", "source_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_dependencies_prerequisite_skill_id_fkey') THEN
    ALTER TABLE "skill_dependencies" ADD CONSTRAINT "skill_dependencies_prerequisite_skill_id_fkey"
      FOREIGN KEY ("prerequisite_skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_dependencies_dependent_skill_id_fkey') THEN
    ALTER TABLE "skill_dependencies" ADD CONSTRAINT "skill_dependencies_dependent_skill_id_fkey"
      FOREIGN KEY ("dependent_skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'misconceptions_skill_id_fkey') THEN
    ALTER TABLE "misconceptions" ADD CONSTRAINT "misconceptions_skill_id_fkey"
      FOREIGN KEY ("skill_id") REFERENCES "learning_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_misconceptions_learner_id_fkey') THEN
    ALTER TABLE "learner_misconceptions" ADD CONSTRAINT "learner_misconceptions_learner_id_fkey"
      FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_misconceptions_misconception_id_fkey') THEN
    ALTER TABLE "learner_misconceptions" ADD CONSTRAINT "learner_misconceptions_misconception_id_fkey"
      FOREIGN KEY ("misconception_id") REFERENCES "misconceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_misconception_evidence_learner_misconception_id_fkey') THEN
    ALTER TABLE "learner_misconception_evidence" ADD CONSTRAINT "learner_misconception_evidence_learner_misconception_id_fkey"
      FOREIGN KEY ("learner_misconception_id") REFERENCES "learner_misconceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM "learning_skills" AS dependent
    CROSS JOIN LATERAL unnest(dependent."prerequisites") AS prerequisite_slug
    LEFT JOIN "learning_skills" AS prerequisite
      ON prerequisite."domain_id" = dependent."domain_id"
      AND prerequisite."slug" = prerequisite_slug
    WHERE prerequisite."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill skill graph: an existing prerequisite slug cannot be resolved in its domain';
  END IF;
END $$;

INSERT INTO "skill_dependencies" (
  "id",
  "prerequisite_skill_id",
  "dependent_skill_id",
  "dependency_type",
  "weight",
  "minimum_mastery_required",
  "metadata",
  "created_at",
  "updated_at"
)
SELECT
  'legacy-' || md5(prerequisite."id" || ':' || dependent."id"),
  prerequisite."id",
  dependent."id",
  'REQUIRED'::"SkillDependencyType",
  0.8,
  0.7,
  jsonb_build_object('source', 'legacy-prerequisites-backfill'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "learning_skills" AS dependent
CROSS JOIN LATERAL unnest(dependent."prerequisites") AS prerequisite_slug
JOIN "learning_skills" AS prerequisite
  ON prerequisite."domain_id" = dependent."domain_id"
  AND prerequisite."slug" = prerequisite_slug
ON CONFLICT ("prerequisite_skill_id", "dependent_skill_id") DO NOTHING;

DO $$ BEGIN
  IF EXISTS (
    WITH RECURSIVE paths(origin_id, current_id, visited, is_cycle) AS (
      SELECT
        "prerequisite_skill_id" AS origin_id,
        "dependent_skill_id" AS current_id,
        ARRAY["prerequisite_skill_id", "dependent_skill_id"] AS visited,
        "prerequisite_skill_id" = "dependent_skill_id" AS is_cycle
      FROM "skill_dependencies"
      UNION ALL
      SELECT
        paths.origin_id,
        edge."dependent_skill_id",
        paths.visited || edge."dependent_skill_id",
        edge."dependent_skill_id" = paths.origin_id
      FROM paths
      JOIN "skill_dependencies" AS edge
        ON edge."prerequisite_skill_id" = paths.current_id
      WHERE
        NOT paths.is_cycle
        AND (
          edge."dependent_skill_id" = paths.origin_id
          OR NOT edge."dependent_skill_id" = ANY(paths.visited)
        )
    )
    SELECT 1 FROM paths WHERE is_cycle
  ) THEN
    RAISE EXCEPTION 'Cannot commit skill graph: circular dependency detected';
  END IF;
END $$;

COMMIT;
