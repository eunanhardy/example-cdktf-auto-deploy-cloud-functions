# Deploying Cloud functions with Terraform CDK
I built this example to test how easy it is to create automated deployments of cloud functions with Terraform CDK. I also wanted to test out the new Terraform CDK provider for GCP.
Creating a new directory in the src folder will create a new cloud function. The directory name will be used as the name of the cloud function. The directory should contain a function.js file and a package.json file. The function will be named fn-${DIR_NAME} and have public http invoke permissions enabled.

## Prerequisites
- [Terraform](https://www.terraform.io/downloads.html)
- [Terraform CDK CLI](https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-install)
- GCP Account, NOTE: creating resources in google cloud may incur charges
- Resources Created
  - Clound Function
  - Storage Bucket
  - IAM Role
  - API Access(storage, cloudfunctions)

## Running the script
```bash
cdk deploy
```
