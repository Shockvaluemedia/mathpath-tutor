# ADR-006: Math-Aware Retention Scheduling

- Status: Accepted
- Date: 2026-08-25

## Context

The existing review page estimated dates from mastery and `lastPracticed` on each request. It did not persist a schedule, adapt after retrieval, verify answers on the server, or produce retention evidence. Its interval rule was a simplified flashcard algorithm that did not account for assistance, fluency, misconceptions, or a skill's role as a prerequisite.

## Decision

1. `SkillReviewSchedule` is a rebuildable per-learner, per-skill projection with next review time, interval, ease, retrieval counts, consecutive success, retention confidence, outcome, status, reason codes, and model version.
2. Every learned skill receives a schedule. Untouched skills do not.
3. Independent accurate retrieval expands the interval. Slow but correct retrieval expands it modestly. Hinted or guided success does not count as durable independent retention. Failed retrieval resets the interval and lowers retention confidence.
4. Meaningfully delayed success strengthens retention confidence more than immediate success.
5. Active misconceptions and prerequisite importance shorten or cap intervals because forgetting those skills blocks connected mathematics.
6. Schedules rebuild deterministically from the evidence ledger after newly inserted evidence, making idempotent retries harmless. A backfill command rebuilds existing learners after migration.
7. Review APIs never send answer keys before submission. The server applies deterministic math equivalence, records `RETENTION` evidence, recomputes mastery, and returns feedback only after verification.
8. Demo mode exposes the same answer-free question and submission contract but clearly reports that evidence was not persisted.

## Consequences

- The daily planner can select truly due retrieval work rather than infer it from a last-practiced timestamp.
- Mastery can gain or lose support from delayed retrieval through the existing centralized evidence engine.
- The initial curated review bank has limited skill coverage. Milestone 8 replaces that constraint with validated parameterized problem templates and instances.
- Deployments must apply `20260825_skill_review_schedules.sql` and then may run `npm run db:rebuild-review-schedules`. No live migration is performed by application startup.
