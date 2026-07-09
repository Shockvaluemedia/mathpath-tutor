# MathPath Tutor

An adaptive AI math tutoring platform that supports students from grade school through high school. MathPath diagnoses each student's math level, identifies skill gaps, adapts instruction by age and grade band, and provides personalized tutoring that builds mastery and confidence.

## What This Is

MathPath Tutor is not a homework answer app or a worksheet generator. It's an adaptive math growth system that:

1. **Assesses** where a student actually is
2. **Identifies** weaknesses and root causes
3. **Teaches** in an age-appropriate way
4. **Creates** a daily growth path
5. **Tracks** mastery, confidence, and progress

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API routes (serverless-ready)
- **Database:** PostgreSQL via Prisma ORM
- **AI:** OpenAI API (GPT-4o) — compatible with Amazon Bedrock
- **Auth:** JWT-based authentication

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Start in demo mode (no database or API key needed!)
npm run dev
```

The app starts in **demo mode** by default (`NEXT_PUBLIC_DEMO_MODE=true` in `.env`). This gives you:
- Pre-built demo students (Alex, grade 5 and Maya, grade 7)
- Working diagnostic assessments with real questions
- Lesson generation with full content
- AI tutor chat with frustration detection
- Parent dashboard with progress data
- No database or OpenAI key required

### Production Setup

To connect real infrastructure:

```bash
# Edit .env — set NEXT_PUBLIC_DEMO_MODE=false and add real credentials
cp .env.example .env

# Push schema to database
npm run db:push

# Seed initial data (skills, admin user)
npm run db:seed

# Start
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `OPENAI_API_KEY` | OpenAI API key |
| `AI_MODEL` | AI model to use (default: gpt-4o) |
| `NEXT_PUBLIC_APP_URL` | App URL for client-side |

## Architecture

### Grade Bands

The app adapts teaching style by developmental stage:

| Band | Grades | Focus |
|------|--------|-------|
| Early Elementary | K–2 | Visual, encouraging, short lessons |
| Elementary | 3–5 | Guided reasoning, confidence building |
| Middle School | 6–8 | Confidence recovery, filling gaps |
| High School | 9–12 | Strategic, efficient, SAT/ACT ready |

### Core Pages

| Page | Path | Description |
|------|------|-------------|
| Landing | `/` | Marketing page for parents |
| Signup | `/signup` | Parent account creation |
| Login | `/login` | Authentication |
| Onboarding | `/onboarding` | Student profile setup |
| Diagnostic | `/diagnostic` | Adaptive assessment |
| Skill Profile | `/skill-profile` | Assessment results |
| Daily Learning | `/learn` | Personalized daily lessons |
| AI Tutor | `/tutor` | Interactive chat tutor |
| Parent Dashboard | `/dashboard` | Progress overview |
| Students | `/students` | Manage students |
| Admin Skills | `/admin/skills` | Skill map management |

### AI Functions

| Function | Purpose |
|----------|---------|
| `generateDiagnostic` | Creates adaptive assessment questions |
| `evaluateResponse` | Analyzes student answers for mistake types |
| `generateSkillProfile` | Builds comprehensive skill analysis |
| `generateDailyLesson` | Creates personalized daily lessons |
| `tutorChat` | Interactive tutoring with behavior rules |
| `generateParentReport` | Weekly progress summaries |

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create parent account |
| `/api/auth/login` | POST | Authenticate user |
| `/api/students` | GET/POST | List/create students |
| `/api/diagnostic/generate` | POST | Generate assessment questions |
| `/api/diagnostic/submit` | POST | Submit answers |
| `/api/diagnostic/complete` | POST | Finalize assessment |
| `/api/lessons/generate` | POST | Generate daily lesson |
| `/api/tutor/chat` | POST | Chat with AI tutor |
| `/api/reports/weekly` | POST | Generate parent report |

### Database Schema

The database includes tables for: users, students, skills, assessments, assessment_responses, student_skill_mastery, lessons, tutor_sessions, and parent_reports.

Run `npx prisma studio` to explore the schema visually.

## MVP Flow

1. Parent creates account → `/signup`
2. Parent adds student → `/onboarding`
3. Student completes onboarding (name, age, grade, preferences)
4. Student takes adaptive diagnostic → `/diagnostic`
5. App generates skill profile → `/skill-profile`
6. App creates first daily lesson → `/learn`
7. Student works with AI tutor → `/tutor`
8. Parent sees dashboard and weekly summary → `/dashboard`

## Market Impact MVP: Math Recovery Sprint

The pilot-ready MVP path is the **2-Week Math Recovery Sprint**:

1. Public sprint entry point → `/sprint`
2. Parent/student completes the diagnostic → `/diagnostic`
3. Student starts the first daily lesson → `/learn`
4. Tutor supports stuck moments → `/tutor`
5. Parent reviews the proof report → `/sprint/report`

The sprint report tracks the key pilot activation signals locally during testing:
diagnostic started, diagnostic completed, first lesson started, lesson completed, and sprint report viewed.
The report API is available at `/api/sprint/report?studentId=...` and returns demo data when `NEXT_PUBLIC_DEMO_MODE=true`.

The operator pilot control room is available at `/admin/pilot`. It tracks family invite status,
diagnostic completion, first lesson, three-session activation, report views, parent feedback,
and exports pilot evidence from `/api/pilot/summary?format=csv`.
Use `docs/pilot-tester-script.md` for the first 3-5 tester families.

## Tutor Behavior

The AI tutor follows strict pedagogical rules:

**Must do:**
- Teach, not just answer
- Ask guiding questions before solving
- Diagnose confusion and explain the "why"
- Adapt language and examples to grade band
- Detect frustration and slow down
- Build confidence without being childish

**Must not:**
- Give answers immediately
- Overload the student
- Move forward before mastery
- Use language too advanced for younger students

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run migrations
npm run lint         # Run linter
```

## Deployment

The app has two AWS deployment modes:

| Mode | Command | Infrastructure | Use For |
|------|---------|----------------|---------|
| Low-cost testing | `npm run deploy:test` | One small EC2 instance, Docker, demo mode, no ALB/ECS/RDS | Early tester access |
| Production-style | `npm run deploy:prod` | ECS Fargate, ALB, RDS PostgreSQL, Secrets Manager | Real production traffic |

Testing mode is the default CDK mode and keeps monthly AWS spend low while the app is still being validated. It runs with `NEXT_PUBLIC_DEMO_MODE=true`, uses the cheaper Bedrock Haiku model, and caps AI responses with `AI_MAX_TOKENS`.

GitHub Actions always runs install, Prisma generation, typecheck, and build for pull requests and `main`. On `main` pushes, the deploy job checks for `AWS_ROLE_ARN` first. If the secret is absent, the workflow records an "AWS deploy skipped" summary and succeeds in build-only/demo mode. Add `AWS_ROLE_ARN` to repository secrets to enable the ECR/ECS deployment path.

To stop testing costs when nobody is using the app:

```bash
npm run destroy:test
```

For details, see `aws/DEPLOYMENT.md`.

## License

Private — All rights reserved.
