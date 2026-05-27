#!/bin/bash
# Local development setup script
# Run: bash scripts/setup-local.sh

set -e

echo "🚀 Setting up Adaptive Learning OS for local development"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required. Install from https://docker.com"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }

echo "✓ Prerequisites met"
echo ""

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
docker compose up db -d
echo "   Waiting for database to be ready..."
sleep 3

# Check if DB is ready
until docker compose exec db pg_isready -U mathpath 2>/dev/null; do
  echo "   Still waiting..."
  sleep 2
done
echo "✓ PostgreSQL is running"
echo ""

# Update .env for production mode
echo "⚙️  Configuring environment..."
sed -i.bak 's/NEXT_PUBLIC_DEMO_MODE="true"/NEXT_PUBLIC_DEMO_MODE="false"/' .env
echo "✓ Demo mode disabled"
echo ""

# Push schema to database
echo "🗄️  Pushing schema to database..."
npx prisma db push
echo "✓ Schema applied"
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✓ Client generated"
echo ""

# Seed data
echo "🌱 Seeding database..."
npm run db:seed
echo "✓ Database seeded"
echo ""

echo "═══════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "To start the app:"
echo "  npm run dev"
echo ""
echo "To test AI (requires AWS credentials or OpenAI key):"
echo "  npx tsx scripts/test-bedrock.ts"
echo ""
echo "Database:"
echo "  URL: postgresql://mathpath:mathpath_dev@localhost:5432/mathpath_tutor"
echo "  Studio: npx prisma studio"
echo ""
echo "To switch back to demo mode:"
echo "  Set NEXT_PUBLIC_DEMO_MODE=\"true\" in .env"
echo "═══════════════════════════════════════════════════"
