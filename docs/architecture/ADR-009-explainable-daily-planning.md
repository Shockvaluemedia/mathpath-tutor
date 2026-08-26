# ADR-009: Explainable Daily Planning and Learner Intelligence

## Status

Accepted

## Context

Learners need a bounded daily workload, while parents need a truthful explanation of what the system is teaching, what is blocking progress, and what a human can do next. A generic lesson queue or generated narrative cannot provide that accountability.

## Decision

- Build daily paths deterministically from mastery, graph prerequisites, review schedules, misconceptions, transfer evidence, confidence, frustration, pace, and recent workload.
- Persist the chosen path and its reason codes, learner explanation, adult explanation, and estimated duration.
- Cap the session using learner pace, confidence, frustration, and recent failure signals.
- Derive learner intelligence from stored evidence and the current path. Unsupported trends explicitly report that more evidence is needed.
- Keep demo intelligence clearly labeled as sample data while preserving the production response shape.
- Enforce learner authorization at the API boundary; planning services only receive an authorized learner ID.

## Consequences

Daily plans are reproducible and inspectable, and parent-facing claims remain tied to recorded evidence. The planner may initially produce conservative or sparse paths for new learners; this is preferable to invented precision. Intervention decisions remain a separate milestone so that escalation thresholds and outcomes can be audited independently.
