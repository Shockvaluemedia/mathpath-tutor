BEGIN;
CREATE TABLE IF NOT EXISTS "daily_learning_paths" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "date_key" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "inputs" JSONB NOT NULL,
  "model_version" TEXT NOT NULL DEFAULT 'daily-path-v1',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_learning_paths_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_learning_paths_learner_id_date_key_key" ON "daily_learning_paths"("learner_id", "date_key");
CREATE INDEX IF NOT EXISTS "daily_learning_paths_learner_id_created_at_idx" ON "daily_learning_paths"("learner_id", "created_at");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_learning_paths_learner_id_fkey') THEN
    ALTER TABLE "daily_learning_paths" ADD CONSTRAINT "daily_learning_paths_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;
