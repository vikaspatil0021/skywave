import chalk from "chalk";
import path from "path";
import fs from "fs";
import { z } from "zod";

import {
   runCommand,
   sendObjectsToS3,
   sqsClient,
   sqs_delete_message_command,
   sqs_receive_message_command
} from "./util.js";


const schema = z.object({
   project_id: z.string(),
   git_url: z.string().url().includes("github.com", { message: "Invalid GitHub URL" })
});


async function init() {

   while (1) {
      let process1Success = false as boolean;
      let process2Success = false as boolean;

      // recieve messages = {id:'abc123',url:'https://github.com/vikaspatil0021/exmapleRepo'}
      const { Messages } = await sqsClient.send(sqs_receive_message_command);
      if (!Messages) {
         continue;
      }

      const msg = JSON.parse(Messages[0].Body as string);
      const result = schema.safeParse(msg);

      if (result.error) {
         console.log(result.error);
         await sqsClient.send(sqs_delete_message_command(Messages[0].ReceiptHandle as string))

         continue
      }

      const { git_url, project_id } = result?.data;

      //process 1 : clone => install => build
      await runCommand('docker', ['run', '--name', 'build-container', '-e', `GITHUB_URL=${git_url}`, 'build-server'])
         .then((code:number) => {
            process1Success = true;
            console.log(chalk.blue("Process 1 closed with SuccessCode:", code))
         })
         .catch((code:number) => console.log(chalk.blue("Process 1 closed with ErrorCode:", code)))

      if (process1Success) {
         //process 2 : copy build folder
         await runCommand('docker', ['cp', 'build-container:/home/app/output/build', 'build'])
            .then((code:number) => {
               process2Success = true
               console.log(chalk.green("\nBuild copied successfully."))
               console.log(chalk.blue("\nProcess 2 closed with SuccessCode:", code))
            })
            .catch((code:number) => console.log(chalk.blue("Process 2 closed with ErrorCode:", code)))
      }

      //process 3 upload build 
      if (process1Success && process2Success) {
         await sendObjectsToS3(project_id)
            .then((code:number) => {
               console.log(chalk.green("\nBuild uploaded successfully."))
               console.log(chalk.blue("\nProcess 3 closed with SuccessCode:", code))
            })
            .catch((code:number) => console.log(chalk.blue("Process 3 closed with ErrorCode:", code)))
         fs.rmSync(path.join(process.cwd(), "build"), { recursive: true, force: true })
      }

      //process 4 delete build-container
      await runCommand('docker', ['rm', 'build-container'])
         .then((code:number) => console.log(chalk.blue("Process 4 closed with SuccessCode:", code)))
         .catch((code:number) => console.log(chalk.blue("Process 4 closed with ErrorCode:", code)))


      //delete the message from the queue
      await sqsClient.send(sqs_delete_message_command(Messages[0].ReceiptHandle as string))
   }
}


init()
