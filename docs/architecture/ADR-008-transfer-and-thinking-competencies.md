# ADR-008: Transfer and Mathematical Thinking Competencies

- Status: Accepted
- Date: 2026-08-25

## Context

Routine success does not show that a learner can use mathematics in a changed context, and curriculum mastery alone does not describe higher-order habits such as modeling, decomposition, error checking, or representation switching. These signals are valuable but easy to overclaim from a single interaction.

## Decision

1. Transfer remains a distinct `LearningEvidence` category and affects mastery differently from routine practice.
2. The transfer engine supports different representation, word problem, unfamiliar numbers, mixed skill, real-world modeling, error analysis, reverse problem, and teach-back modes.
3. Deterministic transfer tasks use persisted, learner-scoped problem instances and server-owned scoring. Teach-back requires a rubric and remains ungraded until evaluated.
4. The thinking catalog includes pattern recognition, estimation, abstraction, decomposition, modeling, strategy selection, reasoning, proof/explanation, error checking, transfer, and representation switching.
5. `ThinkingCompetencyEvidence` is append-only and idempotent. `LearnerThinkingCompetency` is a rebuildable probability, uncertainty, evidence-count, context-count, and status projection.
6. One or two observations never produce a competency conclusion. `DEVELOPING` requires at least six graded observations across two contexts; `ESTABLISHED` requires at least ten across three contexts, a high probability, and low uncertainty.
7. Tutor teach-back interactions are retained as ungraded reasoning observations. They are auditable but do not change a competency probability without subsequent evaluation.
8. Demo mode exposes transfer and competency contracts while clearly reporting that no evidence was persisted.

## Consequences

- Reports can distinguish what a learner practiced, retained, transferred, and demonstrated as a broader reasoning habit.
- Competency labels remain cautious, revisable, and grounded in context diversity rather than isolated success.
- Rubric-based explanation evaluation is deferred to the milestone 12 evaluation harness; until then, teach-back cannot become scored evidence.
- Deployments must apply `20260825_transfer_competencies.sql` after the parameterized-problem migration. No live migration is performed automatically.
