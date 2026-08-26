ALTER TABLE "sprint_enrollments" ADD COLUMN IF NOT EXISTS "learning_path_variant" TEXT NOT NULL DEFAULT 'ADAPTIVE';

CREATE TABLE IF NOT EXISTS "ai_usage_events" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "learner_id" TEXT,
  "session_id" TEXT,
  "operation_type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "generation_mode" TEXT NOT NULL DEFAULT 'AI',
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "cost_micros" INTEGER,
  "pricing_configured" BOOLEAN NOT NULL DEFAULT false,
  "latency_ms" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "error_code" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_usage_events_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_usage_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tutoring_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_events_request_id_key" ON "ai_usage_events"("request_id");
CREATE INDEX IF NOT EXISTS "ai_usage_events_learner_id_occurred_at_idx" ON "ai_usage_events"("learner_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_operation_type_provider_occurred_at_idx" ON "ai_usage_events"("operation_type", "provider", "occurred_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_generation_mode_occurred_at_idx" ON "ai_usage_events"("generation_mode", "occurred_at");

CREATE TABLE IF NOT EXISTS "learning_experiment_assignments" (
  "id" TEXT NOT NULL,
  "learner_id" TEXT NOT NULL,
  "experiment_key" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_experiment_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_experiment_assignments_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "learning_experiment_assignments_learner_id_experiment_key_key" ON "learning_experiment_assignments"("learner_id", "experiment_key");
CREATE INDEX IF NOT EXISTS "learning_experiment_assignments_experiment_key_variant_idx" ON "learning_experiment_assignments"("experiment_key", "variant");
