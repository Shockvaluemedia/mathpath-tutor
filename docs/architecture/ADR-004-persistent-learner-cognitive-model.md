# ADR-004: Persistent Learner Cognitive Model

- Status: Accepted
- Date: 2026-08-25

## Context

The original learner profile mixes onboarding preferences with mutable labels such as preferred style, pace, and retention strength. Those values are useful intake context but are not sufficient evidence of how a learner actually performs. The evidence ledger now contains verified outcomes, assistance, confidence, latency, representation, strategy, retention, and transfer observations that can support cautious, revisable conclusions.

## Decision

1. `LearningEvidence` remains the source of truth. `LearnerPattern`, `InstructionalStrategyPerformance`, and `LearnerProfile.cognitiveSummary` are versioned, rebuildable projections.
2. Cognitive patterns are deterministic and thresholded. The first model supports confidence calibration, hint dependency, relative response pace, post-failure persistence, retention, transfer, successful representations, strategy outcomes, recurring classified errors, recent breakthroughs or regressions, review needs, recurring misconception hypotheses, and session frustration.
3. Every active pattern has a scoped key, human-readable statement, confidence, sample statistics, reason code, and source evidence IDs. Learner answers and answer keys are not copied into pattern evidence.
4. Sparse evidence produces no conclusion. General patterns require at least four verified observations, strategy and representation claims require at least three, and retention, transfer, and recurring-error claims require at least two specialized observations.
5. Patterns are not permanent traits. Recalculation reactivates supported patterns and marks unsupported active patterns `RESOLVED` with a timestamp instead of deleting history.
6. Strategy mastery and confidence gains are nullable. They are calculated only when genuine before-and-after values exist in evidence metadata. Outcome rates and time to successful response remain independently available.
7. Lesson representation is read only from server-stored lesson content. Diagnostic error classifications enter evidence only after server-owned correctness is established.
8. The model refreshes after newly inserted evidence and meaningful tutor-session changes. Idempotent evidence retries do not trigger another rebuild.
9. The authorized learner cognitive-model API exposes the projection for tutor orchestration and later learner/parent intelligence views. A manual backfill command is available after migration for existing pilot evidence.

## Consequences

- Onboarding preferences remain preferences and cannot become claims such as "visual learner."
- The tutor and planner can consume explainable, evidence-backed patterns without parsing raw interaction history.
- Rebuilding currently reads a learner's full pilot-scale ledger. Incremental aggregation can be added when evidence volume justifies it without changing the public model.
- Deployments must apply `20260825_learner_cognitive_model.sql` before code that writes production evidence, then run `npm run db:rebuild-cognitive-models` when an approved backfill window is available.
