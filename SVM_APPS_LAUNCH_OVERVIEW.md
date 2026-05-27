# SVM Apps Launch Overview

**Prepared:** May 27, 2026  
**Purpose:** Quick overview of SVM apps and product areas that are ready for launch, plus the apps and capabilities coming soon.

## Ready to Launch

### MathPath Tutor

MathPath Tutor is an adaptive AI math tutoring app for grade-school through high-school students. It helps students take a diagnostic assessment, identify skill gaps, receive personalized daily lessons, and work with an AI tutor that adapts to age, confidence, and frustration signals.

**Ready capabilities:**

- Parent signup and login
- Student onboarding
- Adaptive diagnostic assessment
- Skill profile generation
- Personalized daily lessons
- AI tutor chat
- Parent dashboard
- Student management
- Lesson review and history
- Achievements and gamification

### Parent Progress Reports

The reporting experience gives parents a clear view of student progress, mastery, confidence, and recent learning activity.

**Ready capabilities:**

- Parent dashboard
- Weekly progress report generation
- Student progress summaries
- Recent activity review
- Student-level progress APIs

### Admin Operations Console

The admin console supports internal SVM operations for managing students, reviewing analytics, and maintaining the learning skill map.

**Ready capabilities:**

- Admin dashboard
- Student oversight
- Analytics views
- Skill map management
- Skill create, update, and delete routes

### Billing and Subscription Flow

The billing path supports early paid conversion for families moving from demo or trial usage into a subscription.

**Ready capabilities:**

- Plan selection page
- Stripe checkout
- Billing success page
- Customer billing portal
- Stripe webhook handling

### Deployment Foundation

The app includes the core pieces needed to stage and deploy the product.

**Ready capabilities:**

- Docker support
- AWS deployment documentation
- ECS task definition
- Health check route
- Environment-based production configuration

## Coming Soon

### Adaptive Learning OS

SVM is expanding MathPath from a math-only tutor into a broader adaptive learning system that can support multiple domains, richer learner profiles, and personalized interventions.

**Coming capabilities:**

- Multi-domain learning support
- Learner profiles beyond math
- Personalized intervention plans
- Social-emotional learning signals
- Flexible learning modules

### Expanded AI Learning Engine

The next AI layer will make lessons, assessments, and tutoring more responsive to each learner.

**Coming capabilities:**

- Richer mistake analysis
- Stronger prerequisite detection
- Adaptive remediation paths
- Confidence recovery support
- More nuanced learner memory

### Notifications and Engagement

Notifications will help families stay consistent without making the app feel noisy.

**Coming capabilities:**

- Parent email updates
- Weekly report delivery
- Lesson reminders
- Progress milestone alerts
- Missed-practice nudges

### Student Independence Mode

Student login is the foundation for a more independent student experience.

**Coming capabilities:**

- Student-first login flow
- Age-appropriate navigation
- Student-owned progress views
- Independent lesson continuation
- Parent-controlled permissions

### Richer Parent Insights

Parent reports will become more actionable and easier to use over time.

**Coming capabilities:**

- Mastery and confidence trends
- Plain-language skill gap explanations
- Recommended parent actions
- Monthly learning summaries
- Exportable reports

### Classroom and Group Support

The platform can grow beyond individual families into groups, pods, tutoring centers, and classrooms.

**Coming capabilities:**

- Cohort management
- Group progress dashboards
- Educator and tutor accounts
- Assignment-style learning plans
- Cohort-level analytics

## Suggested Launch Path

1. Internal SVM staging review
2. Private pilot with selected families
3. Paid beta with billing enabled
4. Broader public launch after QA, reporting, and operational feedback are stable

## Launch Readiness Notes

Before public launch, SVM should confirm pricing, production environment variables, Stripe webhook setup, email configuration, privacy language, database migration readiness, and end-to-end QA across signup, onboarding, diagnostic, learning, tutor, dashboard, billing, and admin flows.
