import { Stack, StackProps } from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as nodejslambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";

export class AwsWebStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC for RDS
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });

    // Create a security group for the database
    const postgresSecurityGroup = new ec2.SecurityGroup(
      this,
      "alto-app-db-sg",
      {
        vpc,
        allowAllOutbound: true,
      }
    );

    // Allow inbound traffic on port 5432 (PostgreSQL) from the VPC CIDR range
    postgresSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432)
    );

    // Create a secret for the database credentials
    const postgresDbSecret = new secretsmanager.Secret(
      this,
      "alto-app-db-secret",
      {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: "postgres",
          }),
          generateStringKey: "password",
          excludePunctuation: true,
          includeSpace: false,
        },
      }
    );

    // RDS Instance
    const dbInstance = new rds.DatabaseInstance(this, "alto-app-pq-db", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      securityGroups: [postgresSecurityGroup],
      credentials: rds.Credentials.fromSecret(postgresDbSecret),
      publiclyAccessible: true,
    });

    // const lambdaSecurityGroup = new ec2.SecurityGroup(
    //   this,
    //   "alto-app-function-sg",
    //   {
    //     vpc,
    //   }
    // );

    // Lambda Function
    const lambdaFunction = new nodejslambda.NodejsFunction(
      this,
      "alto-app-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, "../lambda/src/index.ts"), // Lambda code in a folder named 'lambda'
        environment: {
          DB_SECRET_ARN: postgresDbSecret.secretArn,
        },
        bundling: {
          externalModules: ["pg"],
          nodeModules: ["pg"],
        },
        vpc,
      }
    );

    dbInstance.connections.allowFrom(lambdaFunction, ec2.Port.tcp(5432));
    postgresDbSecret.grantRead(lambdaFunction);

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [postgresDbSecret.secretArn],
      })
    );

    const userPool = new cognito.UserPool(this, "alto-app-users", {
      userPoolName: "Alto App Users",
      signInAliases: {
        email: true,
      },
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userPool.addClient("alto-app-client", {
      userPoolClientName: "alto-app-client",
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "alto-app-authorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, "alto-app-api", {
      handler: lambdaFunction,
      proxy: false,
      defaultMethodOptions: {},
    });

    const todosResource = api.root.addResource("todos", {
      defaultCorsPreflightOptions: {
        statusCode: 200,
        allowOrigins: ["*"],
        allowMethods: [
          "DELETE",
          "GET",
          "HEAD",
          "OPTIONS",
          "PATCH",
          "POST",
          "PUT",
        ],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    todosResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(lambdaFunction),
      {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer,
      }
    );

    todosResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(lambdaFunction),
      {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer,
      }
    );
  }
}
