# SVM MVP App Synopsis and Readiness

**Prepared:** May 27, 2026  
**Account reviewed:** Shockvaluemedia GitHub  
**Scope:** Apps with enough product definition and implementation evidence to be considered MVP or beyond. Generic shells, empty wrappers, and repos without clear product-specific MVP evidence are excluded.

## Readiness Scale

- **Production-ready:** App appears positioned for live usage or public launch.
- **Beta-ready:** MVP is substantial and can support controlled pilots or internal/customer beta.
- **MVP-ready:** Core product flow exists, but launch hardening, QA, or integration work remains.
- **MVP exists, blocked:** Product flow exists, but current code/work state has known blockers before launch.

## MVP or Better Apps

### SVM AI Growth Engine

**Synopsis:** AI-powered business growth platform for Shock Value Media. It includes AI readiness assessment, ROI calculator, AI business boardroom, lead scoring, analytics, CRM/contact management, and resource generation.

**Readiness:** Production-ready  
**Why:** README states the platform is live at `shockvaluemedia.com`, marks status as operational, and documents active A/B testing, performance, analytics, deployment, validation, and boardroom integration.

**Next readiness step:** Keep monitoring performance, funnel analytics, and production validation after any release.

### DirectFanz Project

**Synopsis:** Direct-to-fan platform connecting independent artists with superfans through subscriptions, exclusive content, artist dashboards, fan discovery, Stripe Connect payments, community features, and content access.

**Readiness:** Production-ready candidate  
**Why:** README says the platform is 95% production-ready and the repo contains extensive production, launch, deployment, testing, security, monitoring, Stripe, S3, Redis, and NextAuth materials.

**Next readiness step:** Final production smoke test across artist onboarding, fan subscription, content access, payouts, and auth.

### Culture Diagnostic 2.0

**Synopsis:** Multi-tenant culture diagnostic platform for organizations to run surveys, score 33 KPIs, analyze culture health and risk, generate reports, compare runs, and guide next-step planning.

**Readiness:** Beta-ready  
**Why:** Product-specific README documents tenant isolation, survey delivery, scoring, dashboards, role-aware access, PDF/CSV export, and e2e/test/deployment materials.

**Next readiness step:** Run tenant-level QA across survey setup, response collection, scoring, role-specific dashboards, and report export.

### Justice Informed Diagnostic

**Synopsis:** Secure, multi-tenant culture diagnostic app designed to reproduce Justice Informed's Culture Diagnostic workflow without Qualtrics. It supports survey building, encrypted response storage, proprietary scoring, dashboards, and client-facing report outputs.

**Readiness:** MVP-ready  
**Why:** README documents the full product mission and core workflow, and the repo includes frontend/backend, deployment, demo, security, monitoring, and client workflow materials.

**Next readiness step:** Decide whether this remains separate or is superseded by Culture Diagnostic 2.0.

### SVM Operator Core

**Synopsis:** AI-powered operations platform for service businesses. It spans lead capture, client conversion, project delivery, time tracking, billing, conversations, dashboards, admin import, health checks, and AI insights.

**Readiness:** Beta-ready  
**Why:** README documents a full frontend/API/worker architecture, product areas, local login, AWS CDK infrastructure, tests, e2e scripts, and multi-tenant isolation.

**Next readiness step:** Validate the full lead-to-client-to-project-to-invoice journey with seeded data.

### Afterschool Platform

**Synopsis:** Multi-tenant youth program management platform for schools, nonprofits, and afterschool providers. It supports activity publishing, family registration, payments, attendance, permission slips, volunteers, reporting, and organization management.

**Readiness:** Beta-ready  
**Why:** README documents a complete SaaS architecture with Next.js, Prisma, shared packages, Redis, monitoring, local infra, AWS deployment direction, and test scripts.

**Next readiness step:** Pilot with one provider and test registration, payment, attendance, and reporting loops end to end.

### Queen Ash Wellness Platform

**Synopsis:** Wellness assessment and program delivery platform for Queen Ash Enterprise. It includes multi-domain wellness assessments, scoring, personalized recommendations, program delivery, ecommerce, admin CMS, lead management, analytics, scheduling, email automation, and payments.

**Readiness:** Beta-ready  
**Why:** README documents a complete feature set, Next.js/Prisma/PostgreSQL stack, Stripe, SendGrid, S3, admin console, deployment files, Docker options, and production validation scripts.

**Next readiness step:** Confirm production environment, test checkout/email flows, and run privacy review for wellness data.

### Ash Flow Connect

**Synopsis:** Queen Ash wellness app variant focused on AI wellness coaching, assessments, classes, ecommerce, community, progress tracking, appointments, nutrition planning, and PWA support.

**Readiness:** Beta-ready  
**Why:** README reports 16 pages, 12 AI edge functions, 33 tests, PWA support, Supabase backend, Playwright testing, monitoring, and CI/CD materials.

**Next readiness step:** Clarify whether this is the active Queen Ash app or should be merged into the Queen Ash Wellness Platform roadmap.

### OptionPilot OS

**Synopsis:** AI-powered options trading education and discipline platform. It supports trader education, planning, journaling, risk awareness, simulated boardroom review, watchlists, market regime labeling, and decision practice.

**Readiness:** MVP-ready  
**Why:** README documents core modules, Next.js app structure, PostgreSQL-compatible schema, AI provider abstraction, and clear education-only positioning. Auth is noted as architecture-ready rather than finished.

**Next readiness step:** Complete auth, legal disclaimers, and data persistence before any broader user launch.

### Funding Intelligence OS

**Synopsis:** SaaS MVP for nonprofits, consultants, and community organizations to discover grant opportunities, track applications, upload files, and manage a funding pipeline.

**Readiness:** MVP-ready  
**Why:** README explicitly calls it a production-ready AWS free-tier-friendly SaaS MVP, with frontend/backend monorepo, Cognito, API Gateway, Lambda, DynamoDB, S3, CloudWatch, and deploy instructions.

**Next readiness step:** Validate the grant discovery, pipeline, file upload, and auth flow in a real AWS staging account.

### Rent Insight Engine / ERGO

**Synopsis:** Housing and human services operations platform for homelessness and emergency-services organizations. It combines housing inventory, case management, waitlists, service plans, referrals, crisis response, floor plan/site management, and a client portal.

**Readiness:** MVP-ready  
**Why:** README documents a detailed product vision and deep module list with client intake, assessments, referrals, placement workflows, document management, and multi-facility support.

**Next readiness step:** Confirm which modules are actually implemented versus specified, then pilot one service workflow.

### Strategic Counsel AI

**Synopsis:** AI executive boardroom where users present strategic decisions and receive deliberation from six executive perspectives: vision, execution, operations, brand, revenue, and purpose.

**Readiness:** MVP-ready  
**Why:** README documents a clear product concept, React/Vite frontend, AWS Lambda/API Gateway/WebSocket backend, Supabase/PostgreSQL, Bedrock AI, Cognito, SES, Stripe, CloudFront, monitoring, and subscription tiers.

**Next readiness step:** Validate subscription gating, AI response quality, and counsel-session persistence.

### Direct Fan Platform

**Synopsis:** Earlier direct-to-fan music platform for independent artists and superfans, including artist dashboards, fan subscriptions, Stripe Connect, comments, notifications, S3 storage, Redis, and NextAuth.

**Readiness:** MVP-ready, likely superseded  
**Why:** README documents a complete stack and product flow, but the newer DirectFanz Project appears more production-ready and more heavily documented.

**Next readiness step:** Treat as legacy/reference unless it contains code not yet migrated into DirectFanz Project.

### MathPath Tutor

**Synopsis:** Adaptive AI math tutoring platform for grade-school through high-school students. It diagnoses student level, identifies skill gaps, generates daily lessons, provides AI tutor chat, and gives parents progress visibility.

**Readiness:** MVP exists, blocked  
**Why:** README documents a complete MVP flow and demo mode, but the current local work is mid-pivot from `Student/Lesson` to broader `Learner/Module` architecture and currently fails Prisma validation and TypeScript checks.

**Next readiness step:** Stabilize the schema/types/routes before launch, then run QA across signup, onboarding, diagnostic, lesson, tutor, dashboard, billing, and admin flows.

## Excluded From This MVP Readiness List

These repos were not included because they appear to be pre-MVP, generic shells, wrappers, duplicates, or insufficiently documented as product-ready apps:

- repo-snuggler
- entity-guard-ai
- founder-command-center
- sonic-launchpad-pro
- command-center
- good-goods-go
- heartway-pathway
- dealflow-pilot-92
- SVM-Performance
- smart-exec-hub
- movement-speaker-forge
- dealcraft-hq
- curate-digest-ai
- proof-of-truth-hub
- route-stride-ops

## Priority Launch Order

1. SVM AI Growth Engine
2. DirectFanz Project
3. Culture Diagnostic 2.0
4. SVM Operator Core
5. Afterschool Platform
6. Queen Ash Wellness Platform / Ash Flow Connect, after choosing the canonical app
7. OptionPilot OS
8. Funding Intelligence OS
9. Strategic Counsel AI
10. Rent Insight Engine / ERGO
11. MathPath Tutor, after stabilization
