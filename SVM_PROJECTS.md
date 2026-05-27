# SVM Project Launch Brief

This document tracks the SVM projects that are closest to launch and the projects that are planned next. It is written as a working status document for internal planning, stakeholder updates, and launch readiness conversations.

## Projects About to Launch

### MathPath Tutor Core App

**Status:** Launch-ready candidate

MathPath Tutor is an adaptive AI math tutoring platform for grade-school through high-school students. The product diagnoses a student's current math level, identifies skill gaps, creates personalized learning paths, and supports students with an AI tutor that adapts to age, confidence, and frustration signals.

**Launch scope:**

- Parent signup and login
- Student onboarding and profile setup
- Adaptive diagnostic assessment
- Skill profile generation
- Personalized daily lessons
- AI tutor chat
- Parent dashboard
- Student management
- Lesson history and review
- Achievement and gamification surfaces

**Primary audience:** Parents and students who need a structured math growth path instead of one-off homework help.

**Launch goal:** Prove that students can move from diagnosis to daily practice to measurable mastery in one guided flow.

### Parent Progress and Reporting

**Status:** Launch-ready candidate

Parent reporting gives families a clear view of student progress, confidence, mastery, and learning momentum. The current product includes dashboard views and weekly report generation paths.

**Launch scope:**

- Parent dashboard
- Student progress summaries
- Weekly parent report generation
- Review page for recent learning activity
- Student-level progress APIs

**Primary audience:** Parents who want visibility into whether tutoring is working.

**Launch goal:** Make progress easy to understand without requiring parents to interpret raw scores or lesson logs.

### Admin Operations Console

**Status:** Launch-ready candidate

The admin console supports internal oversight of students, analytics, and the skill map that powers the adaptive learning experience.

**Launch scope:**

- Admin landing area
- Admin analytics
- Admin student management
- Skill map management
- Skill create, update, and delete API routes

**Primary audience:** SVM operators and internal product/admin users.

**Launch goal:** Give the team enough operational control to support early users and improve the learning system after launch.

### Billing and Subscription Flow

**Status:** Launch-ready candidate

The billing flow supports paid plan selection, checkout, billing portal access, and webhook handling.

**Launch scope:**

- Billing plans page
- Checkout API route
- Billing success page
- Customer portal API route
- Stripe webhook route

**Primary audience:** Parents converting from trial or demo usage to a paid plan.

**Launch goal:** Enable a clean paid conversion path for early customers.

### AWS Deployment Path

**Status:** Launch-ready candidate

The app includes AWS-oriented deployment materials and containerization support.

**Launch scope:**

- Dockerfile
- Docker Compose file
- AWS deployment guide
- ECS task definition
- Health check API route
- Environment-variable based production setup

**Primary audience:** Internal engineering and deployment operators.

**Launch goal:** Provide a repeatable deployment path for production or staged launch environments.

## Projects Coming Soon

### Expanded AI Learning Engine

**Status:** Coming soon

The next stage is to deepen the adaptive engine so the product can generate richer interventions, more nuanced learner profiles, and broader module types.

**Planned scope:**

- More intervention strategies for stuck or frustrated students
- Stronger learner-profile memory across sessions
- Expanded module generation beyond daily lessons
- Better assessment analysis and mistake classification
- More personalized remediation paths

**Success signal:** Students receive increasingly accurate lessons and interventions as the system learns more about them.

### Notification and Engagement System

**Status:** Coming soon

Notification routes exist and can become a broader engagement system for reminders, progress updates, and parent nudges.

**Planned scope:**

- Parent email notifications
- Weekly report delivery
- Lesson reminders
- Progress milestone alerts
- Missed-practice nudges

**Success signal:** Families return consistently without the product feeling noisy or generic.

### Student Independence Mode

**Status:** Coming soon

Student login exists as a foundation for a more independent student experience.

**Planned scope:**

- Student-first login and session flow
- Age-appropriate navigation
- Independent lesson continuation
- Student-owned progress and achievement views
- Parent-controlled permissions

**Success signal:** Students can safely continue learning without needing a parent to drive every session.

### Richer Parent Insights

**Status:** Coming soon

The current reporting foundation can grow into a more actionable parent insight system.

**Planned scope:**

- Trend lines for mastery and confidence
- Skill-gap explanations in plain language
- Recommended parent support actions
- Month-over-month learning summaries
- Exportable reports

**Success signal:** Parents understand what is improving, what is blocked, and what to do next.

### Classroom or Group Support

**Status:** Coming soon

The current student-management model can expand toward small groups, classrooms, pods, or tutoring centers.

**Planned scope:**

- Multi-student cohorts
- Group progress dashboards
- Educator or tutor accounts
- Assignment-style lesson planning
- Cohort-level analytics

**Success signal:** The product can support more than one-family-at-a-time usage without losing personalization.

### Production Hardening

**Status:** Coming soon

Before a larger public launch, the product should go through additional reliability, privacy, observability, and QA hardening.

**Planned scope:**

- End-to-end QA coverage for core learning flows
- Production monitoring and alerting
- Security review for auth, billing, and student data
- Data privacy review
- Load testing for AI and lesson generation routes
- Backup and recovery checks for PostgreSQL

**Success signal:** The system can support real families, payments, and student learning data with confidence.

## Launch Readiness Checklist

- Confirm launch pricing and plan names.
- Finalize production environment variables.
- Verify Stripe webhook configuration.
- Verify database migrations and seed data.
- Run full QA across signup, onboarding, diagnostic, learning, tutor, dashboard, billing, and admin flows.
- Confirm email sending configuration.
- Review student data privacy language.
- Prepare support and escalation process for early users.
- Capture baseline analytics before launch.

## Suggested Launch Order

1. Internal staging launch for SVM team review.
2. Private pilot with selected families.
3. Paid beta with billing enabled.
4. Broader public launch after QA, reporting, and operational feedback are stable.
