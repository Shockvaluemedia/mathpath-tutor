# ADR-002: Evidence Ledger and Probabilistic Mastery

- Status: Accepted
- Date: 2026-08-24

## Context

The MVP updated mastery with route-local score increments and could mark a skill `MASTERED` after one strong lesson. Diagnostic and lesson routes also accepted browser-supplied correctness. Those behaviors cannot distinguish assisted performance from independent knowledge, support delayed verification, or explain why a learner state changed.

## Decision

1. `LearningEvidence` is the append-only source of learner performance observations. Each record has a stable idempotency key, source reference, evidence category, outcome, assistance level, latency, confidence, difficulty, strategy, and timestamp.
2. `LearnerSkillMastery` remains the compatibility projection for existing product surfaces. A centralized deterministic service recomputes it from all ledger evidence after each accepted batch.
3. Mastery is probabilistic and conservative. `MASTERED` requires a configured probability threshold, low uncertainty, repeated independent success, acceptable independent success rate, successful retention evidence, successful transfer evidence, and no material active misconception penalty.
4. Exposure, assessment, routine practice, delayed retention, and transfer are separate evidence categories. Ungraded legacy observations remain auditable but cannot change the mastery probability.
5. Lesson and diagnostic correctness is calculated on the server against an answer key stored with the server-owned learning module or assessment. Diagnostic answer keys are removed from API responses. Generative AI may interpret a mistake, but it cannot override deterministic correctness.
6. New assessment responses use a stable server question ID. Retries reuse the existing response and ledger key instead of creating additional evidence.
7. Existing mastery rows are labeled `legacy-v0` during migration. They are not converted into fabricated ledger evidence; the projection moves to `evidence-v1` only when real evidence is recorded.

## Consequences

- One correct answer or repeated hinted answers cannot create mastery.
- Failed retention or transfer evidence can reduce a previously strong estimate.
- Every projected mastery value has evidence counts, model version, uncertainty, and reason codes suitable for inspection.
- Existing readers of `masteryScore`, `confidenceScore`, `status`, `attempts`, and `lastPracticed` continue to work while newer surfaces migrate to richer fields.
- The ledger adds modest storage and recomputation cost. Pilot volume is small, and correctness and auditability are more valuable than premature aggregation.
- The checked-in SQL migration is additive and reversible, but it is not applied automatically or to a live environment without owner approval.
