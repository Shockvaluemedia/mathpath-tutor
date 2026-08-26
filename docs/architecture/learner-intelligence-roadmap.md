# Learner Intelligence Implementation Map

## Product Boundary

MathPath is evolving from an adaptive lesson MVP into a learner-intelligence system that can explain and improve the loop:

`diagnose -> model -> teach -> observe -> adapt -> verify -> retain -> transfer -> report`

Math remains the proving ground. Domain-neutral evidence, planning, retention, and reporting services should stay reusable, while answer validation, problem generation, and misconception signatures remain in math-specific modules.

## Delivery Status

- Milestone 1 complete: relational skill graph, graph traversal, deterministic misconception signatures, and probabilistic misconception evidence.
- Milestone 2 complete: append-only learning evidence, server-owned scoring, idempotent assessment responses, and centralized probabilistic mastery projections.
- Milestone 3 complete: information-seeking diagnostic selection, graph-aware traversal, auditable decisions, retry-safe serving, and configurable stopping rules.
- Milestone 4 complete: versioned cognitive patterns, strategy performance, stale-pattern resolution, authorized state access, and demo parity.
- Milestones 5-6 complete: bounded tutor tools, deterministic action selection, formal strategies, evidence-backed strategy switching, privacy-bounded prompts, and demo parity.
- Milestone 7 complete: persisted math-aware review schedules, adaptive intervals, trusted review scoring, retention evidence, and demo parity.
- Milestone 8 complete: seeded problem templates, validated instances, targeted distractors, persisted answer keys, template-first diagnostics, and generated reviews.
- Milestone 9 complete: eight transfer modes, distinct transfer evidence, competency catalog and projections, trusted scoring, and cautious tutor observations.
- Milestone 10 complete: persisted explainable daily paths and evidence-backed learner/parent intelligence views.
- Milestone 11 complete: thresholded interventions, outcome tracking, human escalation, age-respectful delivery, and minimized AI context.
- Milestone 12 complete: deterministic evaluation scenarios, learning KPIs, opt-in adaptive comparison, prompt-free AI usage and cost attribution, and operator intelligence.

## Repository Ground Truth

### Existing capabilities to preserve

- Multi-role JWT authentication and server-side learner authorization.
- Guardian, learner, staff-assignment, organization, and administrator access boundaries.
- Learner profiles with confidence, pace, preferences, frustration threshold, and retention descriptors.
- Subject domains, learning skills, legacy prerequisite slug arrays, and learner mastery rows.
- Assessment responses with correctness, latency, hints, confidence, mistake type, and emotional state.
- Learning modules, tutor sessions, interventions, emotional logs, and progress reports.
- Demo learners, sprint baseline/endline evidence, parent-facing reports, and pilot operator tooling.
- OpenAI-compatible AI gateway with Amazon Bedrock support.

### Reusable pieces

- `LearningSkill` is the graph node and remains domain-owned.
- `LearnerSkillMastery` is the compatibility projection for current product surfaces.
- `AssessmentResponse` is a useful evidence source but is not yet a complete evidence ledger.
- `LearnerProfile`, `TutoringSession`, `Intervention`, and `ProgressReport` can be extended rather than replaced.
- `requireRequestLearnerAccess` is the required authorization boundary for learner-scoped APIs.
- Sprint snapshots are immutable outcome evidence and should remain separate from adaptive-state updates.

### Missing pieces

- Relational prerequisite integrity and graph traversal.
- Deterministic answer validation and parameterized math problems.
- First-class, competing misconception hypotheses.
- Central evidence ledger and probabilistic mastery computation.
- Information-seeking diagnostic selection and configurable stopping rules.
- Skill review schedules.
- Tutor tool orchestration, explainable daily planning, transfer, and competency evidence.
- No unresolved architecture gap remains in the twelve-milestone learner-intelligence scope. Production calibration still requires real pilot evidence and configured provider pricing.

## Schema Evolution

### Milestone 1

- `SkillDependency`: typed, weighted directed edges with minimum readiness thresholds.
- `Misconception`: canonical skill-scoped misconception definitions and deterministic signatures.
- `LearnerMisconception`: probabilistic learner hypotheses with lifecycle status.
- `LearnerMisconceptionEvidence`: append-only supporting or contradicting observations.

The existing `LearningSkill.prerequisites` field remains during migration. Seed code writes both representations so existing admin and lesson flows continue to work.

### Milestone 2

- Extend `LearnerSkillMastery` with mastery probability, uncertainty, independent/assisted rates, fluency, retention, transfer, and last evidence timestamp.
- Add an append-only `LearningEvidence` ledger linked to learner, skill, source, assistance, latency, confidence, and representation.
- Keep `masteryScore`, `confidenceScore`, and `status` as derived compatibility projections until all readers migrate.
- Keep diagnostic answer keys in server-owned assessment metadata and persist a stable question ID on each response.
- Preserve legacy responses as explicitly ungraded evidence when no server answer key exists.

Implemented in `src/lib/learning/mastery`, `src/lib/learning/evidence`, `src/lib/learning/diagnostics/question-bank.ts`, and the lesson and diagnostic API routes. The reversible SQL is `prisma/manual-migrations/20260824_evidence_mastery.sql`.

### Milestone 4

- `LearnerPattern` stores scoped, confidence-bearing conclusions with source statistics and active/resolved lifecycle state.
- `InstructionalStrategyPerformance` stores verified per-learner, per-skill strategy outcomes while leaving unsupported gain metrics null.
- `LearnerProfile.cognitiveSummary` provides a versioned, compact projection header.
- `src/lib/learning/learner-model` deterministically rebuilds the projection from the evidence ledger, mastery, misconceptions, and tutor-frustration history.
- `GET /api/learners/:id/cognitive-model` is the authorized read boundary for future orchestration and intelligence surfaces.

The reversible SQL is `prisma/manual-migrations/20260825_learner_cognitive_model.sql`.

### Later milestones

- Instructional strategy performance and learner patterns.
- Skill review schedules.
- Problem templates and instances.
- Thinking competencies and competency evidence.
- Explainable path decisions, intervention decisions, and evaluation aggregates.

## Proposed Services

```text
src/lib/learning/
  graph/              dependency traversal and readiness
  misconceptions/     hypothesis state and evidence updates
  mastery/            centralized probabilistic mastery
  diagnostics/        next-best-question selection and stopping
  learner-model/      persistent evidence-derived patterns
  retention/          math-aware retrieval scheduling
  planning/           explainable daily path construction
  interventions/      threshold and outcome rules
src/lib/math/
  misconceptions/     deterministic math signatures
  problem-generators/ validated parameterized templates
  validators/         deterministic answer equivalence
src/lib/tutor/
  orchestration/      action selection
  tools/              bounded learner and content operations
  strategies/         instructional modes and transitions
  evaluation/         deterministic scenarios and LLM rubrics
```

## Migration Risks

- There is no checked-in Prisma migration history; deployments currently rely on schema push. The first production migration must baseline the deployed database before applying additive SQL.
- Legacy prerequisite values are slugs, while relational edges use database IDs. Backfill must resolve slugs within the same domain and fail on missing, ambiguous, self-referential, or cyclic edges.
- Current route handlers can mark a skill mastered from one lesson. Milestone 2 must replace that behavior without changing sprint evidence semantics.
- Some production routes still use compatibility aliases from `src/lib/db.ts`; new services must use the typed `prisma` client.
- Demo mode bypasses persistence. Every milestone needs deterministic demo fixtures that expose the same decision shape without implying real learner evidence.
- Learner-state services must receive an already-authorized learner ID or enforce `requireRequestLearnerAccess` at their API boundary.

## Milestone Order

1. Skill graph and misconception architecture. **Complete.**
2. Evidence ledger and probabilistic mastery. **Complete.**
3. Adaptive diagnostic traversal and stopping. **Complete.**
4. Persistent learner cognitive model. **Complete.**
5. Tutor tool orchestration. **Complete.**
6. Instructional strategies and strategy effectiveness. **Complete.**
7. Retention and spaced retrieval. **Complete.**
8. Parameterized practice and deterministic validation. **Complete.**
9. Transfer and thinking competencies. **Complete.**
10. Learner and parent intelligence views. **Complete.**
11. Intervention intelligence and human escalation. **Complete.**
12. Evaluation harness and pilot analytics. **Complete.**

Each milestone must preserve demo mode and authorization boundaries, add focused tests, and pass Prisma validation, test, lint, and production build checks before integration.
