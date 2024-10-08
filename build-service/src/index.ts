import fs from "fs";
import path from "path";
import { z } from "zod";

import { exec } from "child_process";

import {
   runCommand,
   sendObjectsToS3,
} from "./util.js";

import { generateLogProducer, kafkaProducer } from "./kafka.js";



const schema = z.object({
   domain: z.string(),
   deployment_id: z.string(),
   repo_url: z.string().url().includes("github.com", { message: "Invalid GitHub URL" }),
   build_command: z.string().optional(),
   output_dir: z.string().optional()
});

type Deployment_Metadata = {
   repo_url: string,
   domain: string,
   deployment_id: string,
   output_dir?: string,
   build_command?: string,
}

async function init() {

   let process1Success = false as boolean;
   let process2Success = false as boolean;
   let process3Success = false as boolean;

   let result;

   try {
      const metadata = process.env.DEPLOYMENT_METADATA as string

      if (!metadata) {
         throw new Error("no metadata")
      }

      result = schema.safeParse(JSON.parse(metadata));
      if (result.error) {
         throw new Error("Invalid metadata")
      }

   } catch (error) {
      exec('sudo shutdown -h now')
   }

   const { repo_url, domain, deployment_id, build_command, output_dir } = result?.data as Deployment_Metadata;
   
   //connect kafka and using closure to pass and deployment_id
   await kafkaProducer.connect()
   const logProducer = generateLogProducer(deployment_id);

   logProducer("Building", "Status")

   //process 1 : clone => install => build
   await runCommand('docker', ['run', '--name', 'build-container', '-e', `GITHUB_URL=${repo_url}`, '-e', `BUILD_COMMAND=${build_command ?? "npm run build"}`, 'build-server'], logProducer)
      .then(async (code: number) => {
         process1Success = true;
         await logProducer(`Process 1 closed with SuccessCode:${code}`, "Log")
         await logProducer(' ', "Log")
      })
      .catch(async (code: number) => await logProducer(`Process 1 closed with ErrorCode:${code}`, "Log"))

   if (process1Success) {
      //process 2 : copy build folder
      await runCommand('docker', ['cp', `build-container:/home/app/output/${output_dir ?? "build"}`, 'build'], logProducer)
         .then(async (code: number) => {
            process2Success = true
            await logProducer(`Build copied successfully.`, "Log")
            await logProducer(`Process 2 closed with SuccessCode:${code}`, "Log")
            await logProducer(' ', "Log")
         })
         .catch(async (code: number) => await logProducer(`Process 2 closed with ErrorCode:${code}`, "Log"))
   }

   //process 3 upload build 
   if (process1Success && process2Success) {
      await sendObjectsToS3(domain, logProducer)
         .then(async (code: number) => {
            process3Success = true
            await logProducer(' ', "Log")
            await logProducer(`Build uploaded successfully.`, "Log")
            await logProducer(`Process 3 closed with SuccessCode: ${code}`, "Log")
            await logProducer(' ', "Log")
         })
         .catch(async (code: number) => await logProducer(`Process 3 closed with ErrorCode:${code}`, "Log"))
      fs.rmSync(path.join(process.cwd(), "build"), { recursive: true, force: true })
   }

   //process 4 delete build-container
   await runCommand('docker', ['rm', 'build-container'], logProducer)
      .then(async (code: number) => await logProducer(`Process 4 closed with SuccessCode: ${code}`, "Log"))
      .catch(async (code: number) => await logProducer(`Process 4 closed with ErrorCode:${code}`, "Log"))



   if (process1Success && process2Success && process3Success) {
      await logProducer("Ready", "Status")
   } else {
      await logProducer("Error", "Status")
   }

   await kafkaProducer.disconnect()

   exec('sudo shutdown -h now')

}


init().catch(() => {
   exec('sudo shutdown -h now')
})
