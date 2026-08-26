# ADR-007: Deterministic Parameterized Math Problems

- Status: Accepted
- Date: 2026-08-25

## Context

Diagnostic and lesson generation relied primarily on an AI model, while review used a finite in-memory bank. This limited coverage, increased cost, made exact regeneration difficult, and required trusting generated answer keys after only shape validation.

## Decision

1. Mathematics problem generation starts from a seeded, deterministic structure. The first catalog covers integer addition and subtraction, multiplication, exact division, common-denominator fraction addition, decimal addition, and one-step linear equations.
2. Templates carry target and prerequisite skills, difficulty bounds, number and sign constraints, fraction or decimal rules, unknown position, operation count, representation, real-world context options, and misconception codes.
3. Correct answers are computed from parameters. A separate structural validator recomputes each answer and rejects answer mismatches, equivalent distractors, duplicate distractors, empty prompts, or invalid operation counts.
4. Generated distractors may encode known misconceptions such as fraction-component addition, sign reversal, decimal place-value shift, or inverse-operation reversal.
5. `ProblemTemplate`, `ProblemConstraint`, and `ProblemInstance` persist the template contract, seed, parameters, answer key, validation result, representation, and learner-scoped serving record. Public projections omit answers and parameters.
6. Production review questions are persisted, learner-scoped, and single-use. The answer key is returned only after server verification. Demo questions regenerate from their public seed and do not persist evidence.
7. Adaptive diagnostics use a supported deterministic template before invoking the AI fallback. Generation mode is retained in assessment metadata for later cost and quality analysis.
8. Unsupported skills fail closed at the deterministic layer. Existing curated or AI-backed flows remain explicit fallbacks rather than receiving invented answers.

## Consequences

- Supported practice and diagnostics are reproducible, inexpensive, and testable across large seed sets.
- The same structure can later be rendered into alternate representations or natural-language contexts without changing its validated answer.
- Template coverage is intentionally finite. New families require an independent structural solution rule and many-seed invariant tests.
- Deployments must apply `20260825_parameterized_problems.sql` before enabling persisted production instances. No migration runs automatically.
