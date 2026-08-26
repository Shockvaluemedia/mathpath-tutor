# ADR-001: Evidence-Driven Learner Intelligence Foundation

- Status: Accepted
- Date: 2026-08-24

## Context

The current MVP asks an LLM to generate and evaluate diagnostic content, stores prerequisites as unvalidated strings, and updates mastery directly inside route handlers. That is insufficient for explainable diagnosis, durable mastery, misconception resolution, or safe iteration.

## Decision

1. Deterministic math services are authoritative for answer validity and known misconception signatures. Generative AI may explain, contextualize, and propose instructional language after deterministic results are available.
2. Learning-state changes originate from append-only evidence and are projected into compatibility fields used by existing UI.
3. `LearningSkill` remains the skill node. `SkillDependency` becomes the authoritative graph edge, while the existing string array remains temporarily for compatibility.
4. Misconceptions are probabilistic hypotheses. They require supporting evidence, can compete with other hypotheses, and resolve only after sufficient contradictory evidence.
5. Domain services remain independent of Next.js routes and Prisma where practical. Persistence adapters translate records into pure service inputs.
6. Major automated decisions return reason codes and evidence references suitable for parent reports and operator inspection.

## Consequences

- The system can traverse prerequisites, reject invalid graphs, and explain remediation choices.
- A wrong answer does not automatically become a misconception, and a correct answer does not automatically become mastery.
- Existing product surfaces remain functional during staged migration.
- There is temporary duplication between legacy prerequisite arrays and relational edges; seed and backfill validation must keep them consistent until legacy readers are removed.
- Additional records increase storage modestly but provide the auditability required for minors, pilot evaluation, and future model changes.
