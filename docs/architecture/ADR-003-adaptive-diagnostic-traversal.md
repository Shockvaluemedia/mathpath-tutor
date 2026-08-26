# ADR-003: Graph-Aware Adaptive Diagnostic Traversal

- Status: Accepted
- Date: 2026-08-24

## Context

The diagnostic previously generated broad five-question batches, adjusted difficulty from aggregate correctness, and stopped after a browser-owned target of 15 questions. That flow could not identify prerequisite blockers, target uncertainty, discriminate active misconception hypotheses, or explain why another question was needed.

## Decision

1. A deterministic server-side engine selects the next evidence target from current mastery probability, uncertainty, grade range, curriculum difficulty, required prerequisite edges, active misconception probability, and verified question history.
2. Selection uses an information-gain proxy that favors uncertain, grade-aligned, under-sampled skills near the mastery boundary. A failed response traverses to the lowest unresolved required prerequisite. Repeated independent success probes a required dependent or extension. Other cases move laterally to confirm or broaden evidence.
3. The engine selects a canonical skill and target difficulty before AI generation. AI supplies wording and an answer key for only that target; it does not choose the learner path. Server scoring remains authoritative.
4. The server evaluates configurable stopping rules after every verified response. The initial policy requires minimum evidence, skill coverage, acceptable mean uncertainty, and no high-priority unresolved misconception. Maximum question count and duration are safety stops, not the default completion rule.
5. The browser displays estimated evidence progress and completes only after the server returns `shouldStop`. The completion endpoint rejects early finalization for adaptive assessments.
6. Each ranked decision, movement direction, reason code, state summary, and model version is retained in assessment metadata. This avoids a required schema migration during pilot testing while keeping decisions inspectable.
7. A generated question is stored with all display fields and its answer key. An unanswered question is re-served after refresh or retry instead of generating another item and incurring another AI call.

## Consequences

- Diagnostics can move down, up, or laterally through the relational skill graph and can stop before an arbitrary fixed count when evidence is sufficient.
- Refreshes and transient request failures do not create duplicate AI generation cost for an already-issued question.
- One generation call is currently made per newly selected question. Later parameterized problem templates can replace most AI calls without changing the selector contract.
- Metadata decision history is capped to the latest 50 decisions. A dedicated append-only decision table can be introduced when pilot analytics require cross-assessment querying.
