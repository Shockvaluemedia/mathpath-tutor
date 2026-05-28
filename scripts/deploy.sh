#!/bin/bash
# Deploy MathPath Tutor to AWS
# Run: bash scripts/deploy.sh

set -e

REGION="us-east-1"
ACCOUNT_ID="958972795537"
ECR_REPO="mathpath-tutor"
IMAGE_TAG="${1:-latest}"

echo "🚀 Deploying MathPath Tutor to AWS"
echo "   Region: $REGION"
echo "   Account: $ACCOUNT_ID"
echo "   Image tag: $IMAGE_TAG"
echo ""

# Step 1: Deploy infrastructure (if not already done)
echo "═══════════════════════════════════════════════════"
echo "Step 1: Infrastructure (CDK)"
echo "═══════════════════════════════════════════════════"
echo ""
echo "To deploy infrastructure for the first time:"
echo "  cd infra && npx cdk deploy --require-approval never"
echo ""
echo "Skip this step if infrastructure is already deployed."
echo ""
read -p "Deploy infrastructure now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd infra
  npx cdk deploy --require-approval never
  cd ..
  echo "✓ Infrastructure deployed"
  echo ""
fi

# Step 2: Build Docker image
echo "═══════════════════════════════════════════════════"
echo "Step 2: Build Docker image"
echo "═══════════════════════════════════════════════════"
docker build -t $ECR_REPO:$IMAGE_TAG .
echo "✓ Image built"
echo ""

# Step 3: Push to ECR
echo "═══════════════════════════════════════════════════"
echo "Step 3: Push to ECR"
echo "═══════════════════════════════════════════════════"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker tag $ECR_REPO:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
echo "✓ Image pushed to ECR"
echo ""

# Step 4: Update ECS service
echo "═══════════════════════════════════════════════════"
echo "Step 4: Update ECS service"
echo "═══════════════════════════════════════════════════"
aws ecs update-service \
  --cluster mathpath-cluster \
  --service mathpath-tutor-service \
  --force-new-deployment \
  --region $REGION
echo "✓ ECS service updated — deploying new image"
echo ""

# Step 5: Wait for deployment
echo "═══════════════════════════════════════════════════"
echo "Step 5: Waiting for deployment..."
echo "═══════════════════════════════════════════════════"
aws ecs wait services-stable \
  --cluster mathpath-cluster \
  --services mathpath-tutor-service \
  --region $REGION
echo "✓ Deployment complete!"
echo ""

# Get the URL
ALB_DNS=$(aws elbv2 describe-load-balancers --region $REGION --query "LoadBalancers[?contains(LoadBalancerName, 'MathP')].DNSName" --output text)
echo "═══════════════════════════════════════════════════"
echo "✅ MathPath Tutor is live!"
echo ""
echo "   URL: http://$ALB_DNS"
echo ""
echo "   Next steps:"
echo "   1. Run database migration: DATABASE_URL=<from secrets> npx prisma db push"
echo "   2. Seed data: DATABASE_URL=<from secrets> npm run db:seed"
echo "   3. Point your domain to the ALB"
echo "═══════════════════════════════════════════════════"
