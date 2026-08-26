# ADR-010: Systematic Interventions and Minor-Safe Adaptation

## Status

Accepted

## Context

Existing intervention rows and AI recommendations did not provide deterministic trigger thresholds, retry safety, or an inspectable evidence and outcome trail. The product also serves minors, and several legacy AI helpers included names and exact ages despite having sufficient grade and developmental-stage context.

## Decision

- Evaluate confidence recovery, prerequisite remediation, parent engagement, and human tutor escalation with deterministic, versioned rules.
- Persist every evaluation, including non-triggered decisions, with evidence, thresholds, reason codes, actions, system confidence, and an idempotent evaluation key.
- Create at most one active intervention of a given type per evaluation flow and record time-series outcome measurements against explicit targets.
- Run evaluation after accepted diagnostic, lesson, retention, transfer, and tutor evidence.
- Treat emotional signals only as pacing, engagement, confidence-recovery, or human-support inputs. They never alter correctness or punitive scores.
- Derive response length, vocabulary, examples, visual density, scaffolding, session length, challenge, and motivation from developmental stage and current load. Below-grade content changes challenge, not the learner's maturity.
- Send AI providers the minimum instructional context. Names, guardian data, exact ages, learner IDs, and organization data are excluded from prompts.
- Keep reusable intervention and experience policy domain-neutral; prerequisite traversal and mathematical misconception evidence remain in math-owned services.

## Consequences

Interventions can be explained and audited, human escalation has a hard stopping rule, and outcome history can show whether support worked. Additional database writes occur after accepted evidence, but retry-safe keys prevent duplicate decisions. Exact prompt content entered by a learner remains necessary for conversational continuity and must be governed by the product retention policy.
