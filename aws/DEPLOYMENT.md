# AWS Deployment Guide

## Architecture

### Low-Cost Testing Architecture

The default CDK deployment mode is now optimized for testing:

```
EC2 t3.micro
    └── Docker container running MathPath Tutor
        └── Demo mode enabled
```

This mode intentionally does **not** create ECS, an Application Load Balancer, or RDS. It is meant for early click-through testing where you want a public AWS URL without paying for always-on production infrastructure.

Deploy the testing stack:

```bash
npx cdk deploy --app "npx tsx infra/app.ts"
```

Important: if the same `MathPathTutor` stack was previously deployed in production-style mode, deploying testing mode will remove the production-style resources from that stack, including ECS, the load balancer, and RDS. Export or snapshot any database data you care about before switching modes.

Useful testing-mode overrides:

```bash
npx cdk deploy --app "npx tsx infra/app.ts" \
  -c deploymentMode=testing \
  -c testInstanceType=t3.micro \
  -c aiModel=us.anthropic.claude-haiku-4-5-20251001-v1:0 \
  -c aiMaxTokens=1200
```

The testing stack outputs `TestInstanceUrl`. Use that URL for testers.

To stop all testing compute costs when nobody is using it:

```bash
aws ec2 stop-instances --instance-ids <TEST_INSTANCE_ID>
```

To remove the test stack entirely:

```bash
npx cdk destroy --app "npx tsx infra/app.ts"
```

### Production-Style Architecture

Use this only when you need production-like infrastructure:

```bash
npx cdk deploy --app "npx tsx infra/app.ts" -c deploymentMode=production
```

```
CloudFront (CDN)
    ↓
Application Load Balancer
    ↓
ECS Fargate (Next.js container)
    ↓
├── RDS PostgreSQL (data)
├── Amazon Bedrock (AI - Claude)
├── Secrets Manager (credentials)
└── CloudWatch (logs/monitoring)
```

## Prerequisites

1. AWS Account with Bedrock model access enabled (Claude Sonnet)
2. AWS CLI configured locally
3. Docker installed
4. GitHub repository connected

## Infrastructure Setup

### 1. Database (RDS PostgreSQL)

```bash
aws rds create-db-instance \
  --db-instance-identifier mathpath-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username mathpath \
  --master-user-password <SECURE_PASSWORD> \
  --allocated-storage 20 \
  --vpc-security-group-ids <SG_ID> \
  --db-name mathpath_tutor \
  --publicly-accessible false
```

### 2. ECR Repository

```bash
aws ecr create-repository --repository-name mathpath-tutor
```

### 3. Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name mathpath/database-url \
  --secret-string "postgresql://mathpath:<PASSWORD>@<RDS_ENDPOINT>:5432/mathpath_tutor"

# JWT Secret
aws secretsmanager create-secret \
  --name mathpath/jwt-secret \
  --secret-string "<RANDOM_SECRET>"
```

### 4. IAM Roles

**Task Execution Role** (pulls images, reads secrets):
- AmazonECSTaskExecutionRolePolicy
- SecretsManager read access for mathpath/* secrets

**Task Role** (app runtime permissions):
- Bedrock InvokeModel access
- CloudWatch Logs write access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": ["arn:aws:bedrock:us-east-1::foundation-model/*"]
    }
  ]
}
```

### 5. ECS Cluster + Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name mathpath-cluster

# Create service (after task definition is registered)
aws ecs create-service \
  --cluster mathpath-cluster \
  --service-name mathpath-tutor-service \
  --task-definition mathpath-tutor \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_IDS>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TG_ARN>,containerName=mathpath-tutor,containerPort=3000"
```

### 6. Database Migration

After RDS is running:

```bash
# From local machine or a bastion host
DATABASE_URL="postgresql://mathpath:<PASSWORD>@<RDS_ENDPOINT>:5432/mathpath_tutor" \
  npx prisma db push

# Seed initial data
DATABASE_URL="postgresql://mathpath:<PASSWORD>@<RDS_ENDPOINT>:5432/mathpath_tutor" \
  npm run db:seed
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) handles:

1. **Test** — Type check + build on every push/PR
2. **Deploy** — Build Docker image → push to ECR → update ECS service (main branch only)

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub OIDC authentication |

### Setting up GitHub OIDC with AWS

```bash
# Create OIDC provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com

# Create role with trust policy for your repo
# See: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
```

## Local Development with Docker

```bash
# Start PostgreSQL + app
docker-compose up

# Or just the database (for local Next.js dev)
docker-compose up db
npm run dev
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Secrets Manager | PostgreSQL connection string |
| `JWT_SECRET` | Secrets Manager | JWT signing key |
| `AI_PROVIDER` | Task Definition | "bedrock" |
| `AI_MODEL` | Task Definition | Bedrock model ID |
| `AWS_REGION` | Task Definition | AWS region |
| `NEXT_PUBLIC_DEMO_MODE` | Task Definition | "false" in production |
| `NEXT_PUBLIC_APP_URL` | Task Definition | Public URL |

## Scaling

- **Horizontal**: ECS auto-scaling based on CPU/memory
- **Database**: RDS read replicas for read-heavy queries
- **AI**: Bedrock handles scaling automatically
- **CDN**: CloudFront for static assets and caching

## Monitoring

- CloudWatch Logs for application logs
- CloudWatch Metrics for ECS task health
- RDS Performance Insights for database
- Health check endpoint: `GET /api/health`

## Cost Estimate (small scale)

### Low-cost testing mode

| Service | Monthly Cost |
|---------|-------------|
| EC2 t3.micro test host | ~$0-8, depending on free-tier eligibility |
| EBS storage | ~$1-3 |
| Bedrock | Usually near $0 in demo mode |
| ALB/ECS/RDS | $0 |
| **Total** | **~$1-15/mo** |

### Production-style mode

| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate (1 task, 0.5 vCPU) | ~$18-25 |
| RDS PostgreSQL (db.t3.micro) | ~$15 |
| Bedrock (Claude, moderate usage) | ~$20-50 |
| ALB | ~$20 |
| CloudFront | ~$5 |
| **Total** | **~$60-115/mo** |
