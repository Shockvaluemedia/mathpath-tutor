# Manual Migration Baseline

This repository predates checked-in Prisma migration history and currently documents `prisma db push` for setup. Files in this directory are additive, reviewable SQL for existing pilot databases; they are not automatically applied by Prisma.

Before applying a file:

1. Confirm the target account, region, database, and environment.
2. Snapshot the database and restore that snapshot into a disposable clone.
3. Run the migration against the clone, then run `npx prisma validate`, `npx prisma generate`, seed validation, and application smoke tests.
4. Inspect row counts and foreign-key failures before applying to the pilot database.
5. Record the file checksum and application timestamp in the deployment handoff.

Never apply manual migration SQL to production from an agent session without explicit owner approval.

## Current Order

Apply these files in order to an existing pilot database:

1. `20260824_learning_intelligence_foundation.sql`
2. `20260824_evidence_mastery.sql`
3. `20260825_learner_cognitive_model.sql`
4. `20260825_skill_review_schedules.sql`
5. `20260825_parameterized_problems.sql`
6. `20260825_transfer_competencies.sql`
7. `20260825_daily_learning_paths.sql`
8. `20260825_systematic_interventions.sql`
9. `20260825_learning_evaluation_observability.sql`

Rollbacks are destructive and run in reverse order. Both `_rollback.sql` and `.rollback.sql` filenames are paired rollback artifacts; the naming difference is historical and does not change execution order. The evidence rollback deletes the ledger and its projection fields but preserves the original mastery columns. Export every affected table before using a rollback file.

The Milestone 4 tables are rebuildable projections. Its rollback removes cognitive patterns and strategy aggregates but does not alter the learning evidence ledger.

The later rollbacks remove review history, generated problem answer keys, transfer evidence, daily paths, intervention decisions/outcomes, experiment assignments, or AI usage history. Treat those records as product evidence: export them and confirm the recovery point before rollback.

## Rehearsal Evidence

On 2026-08-25, the complete forward and reverse chains were rehearsed against PostgreSQL 16 in disposable local databases restored from the pre-change schema at commit `df9d496`.

- All nine forward migrations applied in order and preserved representative legacy learner, skill, mastery, assessment, tutoring, and intervention rows.
- The current Prisma seed and relational CRUD smoke checks passed against the migrated schema.
- `prisma migrate diff` reported an empty migration between the forward database and the current Prisma schema.
- All nine rollback files applied in reverse order, preserved the legacy rows, and produced an empty diff against the pre-change Prisma schema.
- No shared, pilot, or AWS database was accessed or modified during the rehearsal.
