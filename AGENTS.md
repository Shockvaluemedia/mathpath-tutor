<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design Compliance

Before making UI changes, read `DESIGN.md` and follow this app's documented archetype, token direction, forbidden patterns, prompt recipe, and QA checklist.

For UI work:

- Keep component behavior consistent with the repo's existing patterns.
- Use the app's documented visual direction instead of generic SaaS defaults.
- Prefer existing design tokens or create semantic tokens rather than hardcoding one-off styles.
- Include screenshots or a clear visual verification note when opening UI pull requests.
- Do not introduce patterns listed under `Avoid` in `DESIGN.md`.
