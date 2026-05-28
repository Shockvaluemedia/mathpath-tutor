import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class MathPathStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── VPC ───────────────────────────────────────────────
    const vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    // ─── Security Groups ───────────────────────────────────
    const dbSg = new ec2.SecurityGroup(this, "DbSg", {
      vpc,
      description: "MathPath RDS security group",
      allowAllOutbound: true,
    });

    const appSg = new ec2.SecurityGroup(this, "AppSg", {
      vpc,
      description: "MathPath ECS security group",
      allowAllOutbound: true,
    });

    dbSg.addIngressRule(appSg, ec2.Port.tcp(5432), "Allow ECS to RDS");

    // ─── RDS PostgreSQL ────────────────────────────────────
    const dbCredentials = new secretsmanager.Secret(this, "DbCredentials", {
      secretName: "mathpath/db-credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "mathpath" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSg],
      databaseName: "mathpath_tutor",
      credentials: rds.Credentials.fromSecret(dbCredentials),
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change for production
      publiclyAccessible: true, // For initial setup; restrict later
    });

    // ─── JWT Secret ────────────────────────────────────────
    const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
      secretName: "mathpath/jwt-secret",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 64,
      },
    });

    // ─── ECR Repository ────────────────────────────────────
    const repository = new ecr.Repository(this, "AppRepo", {
      repositoryName: "mathpath-tutor",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    // ─── ECS Cluster ───────────────────────────────────────
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: "mathpath-cluster",
    });

    // ─── Task Role (Bedrock access) ────────────────────────
    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: "mathpath-task-role",
    });

    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      resources: ["*"],
    }));

    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"],
    }));

    // ─── Fargate Service with ALB ──────────────────────────
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "AppService", {
      cluster,
      serviceName: "mathpath-tutor-service",
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      taskImageOptions: {
        // Use placeholder image initially; CI/CD will update
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        containerPort: 3000,
        taskRole,
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
          AI_PROVIDER: "bedrock",
          AI_MODEL: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
          AWS_REGION: "us-east-1",
          NEXT_PUBLIC_DEMO_MODE: "false",
          NEXT_PUBLIC_APP_URL: "http://placeholder.com", // Update after deploy
          DB_HOST: database.instanceEndpoint.hostname,
          DB_PORT: "5432",
          DB_NAME: "mathpath_tutor",
        },
        secrets: {
          DB_SECRET: ecs.Secret.fromSecretsManager(dbCredentials),
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "mathpath",
          logGroup: new logs.LogGroup(this, "AppLogs", {
            logGroupName: "/ecs/mathpath-tutor",
            retention: logs.RetentionDays.TWO_WEEKS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        }),
      },
      publicLoadBalancer: true,
      assignPublicIp: true,
    });

    // Health check
    fargateService.targetGroup.configureHealthCheck({
      path: "/api/health",
      healthyHttpCodes: "200",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Auto-scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70,
    });

    // Allow ECS to access RDS
    database.connections.allowFrom(fargateService.service, ec2.Port.tcp(5432));

    // ─── Outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: "Application URL",
    });

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: database.instanceEndpoint.hostname,
      description: "RDS endpoint",
    });

    new cdk.CfnOutput(this, "EcrRepository", {
      value: repository.repositoryUri,
      description: "ECR repository URI",
    });

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: dbCredentials.secretArn,
      description: "Database credentials secret ARN",
    });
  }
}
