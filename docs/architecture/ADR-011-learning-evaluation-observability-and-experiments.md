# ADR-011: Learning Evaluation, AI Cost Observability, and Experiments

## Status

Accepted

## Context

Pilot operators need to distinguish product activity from learning outcomes, understand when automated decisions fire, and attribute AI spend without storing prompts. Adaptive planning also needs a control group before the product can claim that adaptation improves outcomes. Provider pricing is deployment-specific and must not be inferred or represented as zero when it is unknown.

## Decision

- Compute versioned learning, engagement, intervention, and cost metrics from persisted evidence. Every metric carries a definition, numerator, denominator, unit, and evidence status.
- Report missing evidence as `INSUFFICIENT_DATA` and missing token pricing as `PRICING_NOT_CONFIGURED`; never substitute a zero that could be read as a measured result.
- Record AI operation type, provider, model, generation mode, provider-reported tokens, configured cost, latency, success, and bounded metadata. Do not store prompts or completions in usage events.
- Keep deterministic problem generation, scoring, planning, mastery, retention, and intervention decisions separate from AI operations in the operator view.
- Assign the `daily-path-v1` adaptive-versus-linear experiment only when `LEARNING_PATH_EXPERIMENT_ENABLED=true`. Assignment is stable by learner, persisted, and copied onto sprint enrollment.
- Require at least three learners and twelve verified evidence records in each variant before displaying measured cohort outcomes. Otherwise, show that evidence is insufficient and make no superiority claim.
- Expose production aggregates only through an administrator-authorized API. Demo mode returns a clearly labeled synthetic snapshot with the same shape.
- Maintain deterministic regression scenarios for misconception handling, assisted success, delayed retention, frustration recovery, and prerequisite traversal.

## Consequences

Operators can inspect outcome quality, automated decisions, operation mix, and cost efficiency without reading learner conversations. Experiment enrollment remains off by default and cannot silently change existing learners. Cost metrics become available only after the deployment supplies explicit per-million-token rates. The aggregate collector adds read load proportional to the selected pilot period; larger deployments should materialize these aggregates asynchronously.

The additive schema migration is `prisma/manual-migrations/20260825_learning_evaluation_observability.sql`. Its paired rollback removes experiment assignments and AI usage events; it must only be used after confirming those records are no longer required.
