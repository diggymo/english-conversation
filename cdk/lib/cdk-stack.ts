import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3_deployment from "aws-cdk-lib/aws-s3-deployment";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


     const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin:
          // S3 バケットへの OAC によるアクセス制御を設定
          cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            websiteBucket
          ),
      },
    });

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });

    new s3_deployment.BucketDeployment(this, 'WebsiteDeploy', {
      sources: [
        s3_deployment.Source.data(
          '/index.html',
          '<html><body><h1>Hello, CDK!</h1></body></html>'
        ),
        s3_deployment.Source.data('/favicon.ico', ''),
        s3_deployment.Source.asset("../dist"),
      ],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });
  }
}
