import { Construct } from "constructs";
import { App, TerraformStack} from "cdktf";
import * as google from "@cdktf/provider-google";

import * as fs from 'fs';
import { TerraformOutput } from "cdktf/lib/terraform-output";
import * as archiver from 'archiver';


const IGNORED_DIRS = ["node_modules","CDKTF"]

type FunctionConfig = {
    name: string,
    pathToFunc: string,
    entryPoint: string,
  };

  function zipDirectory(dirPath: string, outputPath: string, callback: (err?: Error) => void): void {
    
    const output = fs.createWriteStream(outputPath);
  
    
    const archive = archiver('zip', { zlib: { level: 9 } });
  
    
    output.on('error', (err: Error) => {
      callback(err);
    });
  
    
    archive.on('close', () => {
      console.log(`Successfully created zip file at ${outputPath}`);
      callback();
    });
  
    // Pipe the archive to the output stream.
    archive.pipe(output);
  
    // Add all files in the directory to the archive.
    archive.directory(dirPath, false);
  

    archive.finalize();
  }

  function findDirectories(path: string): { path: string; files: string[] }[] {
    const directories: { path: string; files: string[] }[] = [];
    fs.readdirSync(path, { withFileTypes: true }).forEach((dirent) => {
      if (dirent.isDirectory()) {
        if (!IGNORED_DIRS.includes(dirent.name)) {
          const dirPath = `${path}/${dirent.name}`;
          const files = fs.readdirSync(dirPath);
  
          if (files.includes('function.js') && files.includes('package.json')) {
            directories.push({ path: dirPath, files });
          } else {
            directories.push(...findDirectories(dirPath));
          }
        }
      }
    });
  
    return directories;
  }


class CloudFunctionStack extends TerraformStack {
    constructor(scope: Construct, id: string, config?: FunctionConfig) {
    
        super(scope, id);
        const timestamp = Math.floor(Date.now() / 1000);


        new google.provider.GoogleProvider(this, "google", {
          project: "cdk-testing",
          region: "eu-west1",
        });

        new google.projectService.ProjectService(this, "storage-api", {
          project: "cdk-testing",
          service: "storage-api.googleapis.com",
        });

        const googleStorageBucketBucket = new google.storageBucket.StorageBucket(
          this,
          "bucket",
          {
            location: "EU",
            name: "eh-cloud-deployments-2",
          }
        );


        var filename = `${config?.name}_${timestamp}.zip`;
        var zippath = `./cdktf.out/stacks/stack-fn-${config?.name}/${filename}`;
        zipDirectory(config?.pathToFunc || "",zippath, (err?: Error) => {
          if (err) {
            console.error(`Error creating zip file: ${err}`);
          } else {
            console.log('Zip file created successfully.');
          }
        });

        const googleStorageBucketObjectFunction =
        new google.storageBucketObject.StorageBucketObject(this, "function", {
          bucket: googleStorageBucketBucket.name,
          name: `${config?.name}_${timestamp}.zip`,
          source: "${path.root}/"+filename,
        });

        const createdFunction = new google.cloudfunctionsFunction.CloudfunctionsFunction(this, `fn-${config?.name}`, {
          availableMemoryMb: 128,
          description: "Test Terraform Function",
          entryPoint: config?.entryPoint,
          name: config?.name || "Invalid_Function_Name_1",
          runtime: "nodejs10",
          region: "europe-west1",
          sourceArchiveBucket: googleStorageBucketBucket.name,
          sourceArchiveObject: googleStorageBucketObjectFunction.name,
          triggerHttp: true,
        });

        new google.cloudfunctionsFunctionIamMember.CloudfunctionsFunctionIamMember(this, `invoker_iam_${config?.name}`,   {
          member: "allUsers",
          project: createdFunction.project,
          region: createdFunction.region,
          role: "roles/cloudfunctions.invoker",
          cloudFunction: createdFunction.name,
        }
        );
        
        new TerraformOutput(this,`fn-${config?.name}-url`,{value:createdFunction.httpsTriggerUrl})

    }
    }   

const app = new App();
var directories = findDirectories("./src");
directories.forEach((directory) => {
  const name = directory.path.split("/").pop();
  new CloudFunctionStack(app, `stack-fn-${name}`,{name:`${name}`,pathToFunc:directory.path,entryPoint:"handler"});
});

app.synth();
