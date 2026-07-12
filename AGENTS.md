# Agent Instructions

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design Compliance

Before making UI changes, read `DESIGN.md` and follow this app's documented archetype, token direction, forbidden patterns, prompt recipe, and QA checklist.

For UI work:

- Keep component behavior consistent with the repo's existing patterns.
- Use the app's documented visual direction instead of generic SaaS defaults.
- Prefer existing design tokens or create semantic tokens rather than hardcoding one-off styles.
- Include screenshots or a clear visual verification note when opening UI pull requests.
- Do not introduce patterns listed under `Avoid` in `DESIGN.md`.

## Repository Context

MathPath Tutor pilot app. Preserve the deploy-skip guardrail, pilot operator action queue behavior, and explicit AWS credential posture. Deployment scripts are approval-only.

AGENTS.md is the shared source of truth for Codex, Claude, Fable, and any other agent working in this repository. Keep CLAUDE.md as a short pointer or wrapper, not a second copy of the rules.

## Branching and PR Naming

- Start from the current default branch unless the owner explicitly asks to continue an existing branch.
- Use short branch names like `agent/<short-intent>`, `fix/<area>-<bug>`, or `docs/<area>-<intent>`.
- For this handoff setup, use PR title `agent-workflow: align codex and claude handoff`.
- Keep PRs narrow enough that Codex can review the diff, run the checks, and merge without reconstructing unrelated context.
- Do not mix app code, dependency, workflow, env, infrastructure, or secret changes into process-only PRs.

## Commit Discipline

- Make small focused commits that describe the real change.
- Preserve unrelated user or agent work, including dirty files and untracked notes.
- Do not run broad refactors, formatting sweeps, package updates, migrations, or generated-file churn without explicit owner approval.
- During trust-sprint, stabilization, launch-readiness, pilot-readiness, or audit-followup work, do not add new product features unless the owner explicitly changes the scope.

## Verification Before Push

- Inspect `git status --short` and `git diff --stat` before staging.
- Run the smallest checks that prove the touched surface:
- `npm run lint`
- `npm run build`
- `npm run deploy:test` only with explicit deployment approval
- document when no focused test script exists for a touched surface
- For documentation/process-only changes, run `git diff --check` and confirm the diff is limited to `AGENTS.md`, `CLAUDE.md`, and/or `.github/pull_request_template.md`.
- If a check is skipped, state the exact reason in the PR under "Verification run"; docs-only PRs may skip app checks when no app behavior changed.

## PR Handoff Format

Every PR description should include:

- Intent
- Files changed
- Verification run
- Known risks
- External config needed
- What Codex should review closely

Claude/Fable should leave Codex review notes in "What Codex should review closely", including assumptions, skipped checks, live-system facts, and any files that deserve extra attention.

## Audit and Vulnerability Handling

- Treat audit findings as claims until reproduced or tied to concrete code, config, or runtime evidence.
- Keep security fixes scoped to the validated issue. Do not batch unrelated hardening into the same PR.
- For each vulnerability, document impact, evidence, fix, and verification. If the fix depends on external configuration, say so explicitly.
- Never paste secrets, tokens, private keys, customer data, or production credentials into issues, PRs, logs, docs, or agent notes.

## Secrets, Deployments, and External Truth

- Do not change production deployment behavior, GitHub Actions deploy workflows, Vercel/AWS settings, DNS, IAM, environment variables, or secret wiring without explicit owner approval.
- When deployment or runtime truth matters, name the exact target checked: AWS profile/account/region, stack, GitHub environment, Vercel project/environment, domain, workflow run, or smoke command.
- Separate "verified live" from "not checked" in handoff notes.
- Prefer reversible, low-risk operational changes and call out anything that could affect cost, availability, auth, or data retention.
