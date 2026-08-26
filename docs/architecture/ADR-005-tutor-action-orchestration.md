# ADR-005: Tutor Action Orchestration

- Status: Accepted
- Date: 2026-08-25

## Context

The tutor previously sent learner identity, onboarding preferences, and a broad lesson context directly to the language model and allowed the model to choose the teaching approach. That made instructional behavior difficult to test, explain, or preserve during an AI-provider failure.

## Decision

1. A bounded learner-state service reads only the target skill, lowest unresolved prerequisite, active misconception hypotheses, evidence-derived patterns, proven strategy outcomes, recent evidence summaries, active interventions, and session frustration.
2. A deterministic selector chooses the next tutor action and formal instructional strategy before generation. Every decision includes reason codes, target identifiers, and response constraints.
3. The formal catalog includes Socratic questioning, concrete and visual examples, worked examples, analogy, error analysis, teach-back, guided and independent practice, challenge, review, and confidence recovery.
4. Worked examples are pedagogically valid when explicitly requested or selected, but must use a parallel example and may not reveal the answer to an active graded item.
5. Frustration triggers smaller steps and confidence recovery. It is never used for scoring, punishment, or learner judgment.
6. The language model phrases the selected action; it does not select a different learning path. Prompts exclude learner names, account identity, raw answers, and answer keys.
7. Demo mode and AI fallbacks run the same action selector and return the same versioned metadata contract.

## Consequences

- Tutor decisions are testable without an AI provider and remain auditable in session-message metadata.
- Strategy switching can use verified per-learner outcomes while sparse evidence falls back to Socratic guidance.
- New tutor actions and strategies require a catalog definition, deterministic selection rule, and focused tests.
- Response quality still depends on the configured model; milestone 12 will add scenario evaluation and quality telemetry.
