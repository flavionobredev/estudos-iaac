import * as cdk from "aws-cdk-lib";
import * as ApiGateway from "aws-cdk-lib/aws-apigateway";
import * as IAM from "aws-cdk-lib/aws-iam";
import * as Lambda from "aws-cdk-lib/aws-lambda";
import * as CloudWatchLogs from "aws-cdk-lib/aws-logs";
import * as Sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";

type SendMailProps = cdk.NestedStackProps & { sendMailQueue: Sqs.Queue };

export class SendMail extends cdk.NestedStack {
  constructor(scope: Construct, props: SendMailProps) {
    super(scope, "cdk-send-mail-nested-stack", props);

    const sendMailLambda = new Lambda.Function(this, "cdk-send-mail-lambda", {
      functionName: "cdk--send-mail-lambda",
      runtime: Lambda.Runtime.NODEJS_18_X,
      handler: "sendEmail.send",
      code: Lambda.Code.fromAsset(join(__dirname, "lambda", "send-to-user"), {
        bundling: {
          image: Lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            "bash",
            "-c",
            [
              "export npm_config_cache=/tmp/npm-cache",
              "export FOLDER=$(uuidgen) && mkdir /tmp/$FOLDER && cp -r ./* /tmp/$FOLDER && cd /tmp/$FOLDER",
              "rm -rf node_modules dist package-lock.json",
              "npm install",
              "npm run build",
              "cp -r dist/* /asset-output",
              "npm prune --production",
              "cp -r node_modules /asset-output",
              "cp -r package.json /asset-output",
            ].join(" && "),
          ],
        },
      }),
      logRetention: CloudWatchLogs.RetentionDays.FIVE_DAYS,
      tracing: Lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        QUEUE_URL: props.sendMailQueue.queueUrl,
      },
    });

    const sesRole = new IAM.PolicyStatement({
      effect: IAM.Effect.ALLOW,
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"],
    });

    sendMailLambda.addToRolePolicy(sesRole);

    props.sendMailQueue.grantConsumeMessages(sendMailLambda);
    sendMailLambda.addEventSourceMapping("cdk-send-mail-event-source-mapping", {
      eventSourceArn: props.sendMailQueue.queueArn,
      batchSize: 10,
    });
  }
}

type SendToQueueProps = cdk.NestedStackProps & { sendMailQueue: Sqs.Queue };

export class SendToQueue extends cdk.NestedStack {
  constructor(scope: Construct, props: SendToQueueProps) {
    super(scope, "cdk-send-to-queue-nested-stack", props);

    const integrationRole = new IAM.Role(this, "integration-role", {
      assumedBy: new IAM.ServicePrincipal("apigateway.amazonaws.com"),
    });

    props.sendMailQueue.grantSendMessages(integrationRole);

    const sendToQueueApiGtw = new ApiGateway.AwsIntegration({
      service: "sqs",
      path: `${this.account}/${props.sendMailQueue.queueName}`,
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: integrationRole,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          "application/json": "Action=SendMessage&MessageBody=$input.body",
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
          {
            statusCode: "400",
          },
          {
            statusCode: "500",
          },
        ],
      },
    });

    const apiGtw = new ApiGateway.RestApi(this, "cdk-send-to-queue-api-gtw", {
      restApiName: "cdk--send-to-queue-api-gtw",
      deployOptions: {
        tracingEnabled: true,
      },
      deploy: true,
    });

    apiGtw.root.addMethod("POST", sendToQueueApiGtw, {
      methodResponses: [
        {
          statusCode: "400",
        },
        {
          statusCode: "200",
        },
        {
          statusCode: "500",
        },
      ],
    });
  }
}

export class AwsCdkSendMailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sendMailQueue = new Sqs.Queue(this, "cdk-send-mail-queue", {
      queueName: "cdk--send-mail-queue",
      visibilityTimeout: cdk.Duration.seconds(30),
      receiveMessageWaitTime: cdk.Duration.seconds(2),
      retentionPeriod: cdk.Duration.days(1),
    });

    new SendMail(this, {
      sendMailQueue: sendMailQueue,
    });

    new SendToQueue(this, {
      sendMailQueue: sendMailQueue,
    });
  }
}
