import * as cdk from "aws-cdk-lib";
import { MathPathStack } from "./stack";

const app = new cdk.App();

new MathPathStack(app, "MathPathTutor", {
  env: {
    account: "958972795537",
    region: "us-east-1",
  },
});
