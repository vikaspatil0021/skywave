import fs from "fs";
import path from "path";
import { z } from "zod";

import { exec } from "child_process";

import {
   runCommand,
   sendObjectsToS3,
   sqsClient,
   sqs_delete_message_command,
   sqs_receive_message_command
} from "./util.js";

import { generateLogProducer, kafkaProducer } from "./kafka.js";



const schema = z.object({
   domain: z.string(),
   deployment_id: z.string(),
   repo_url: z.string().url().includes("github.com", { message: "Invalid GitHub URL" })
});


async function init() {

      let process1Success = false as boolean;
      let process2Success = false as boolean;

      // recieve messages
      const { Messages } = await sqsClient.send(sqs_receive_message_command);
      if (!Messages) {
         exec('sudo shutdown -h now')
         return;
      }

      const msg = JSON.parse(Messages[0].Body as string);
      const result = schema.safeParse(msg);

      if (result.error) {
         console.log(result.error);
         await sqsClient.send(sqs_delete_message_command(Messages[0].ReceiptHandle as string))
         
         exec('sudo shutdown -h now')
         return;
      }

      const { repo_url, domain, deployment_id } = result?.data;

      //connect kafka and using closure to pass and deployment_id
      await kafkaProducer.connect()
      const logProducer = generateLogProducer(deployment_id);


      //process 1 : clone => install => build
      await runCommand('docker', ['run', '--name', 'build-container', '-e', `GITHUB_URL=${repo_url}`, 'build-server'], logProducer)
         .then(async (code: number) => {
            process1Success = true;
            await logProducer(`Process 1 closed with SuccessCode:${code}`)
            await logProducer(' ')
         })
         .catch(async(code: number) => await logProducer(`Process 1 closed with ErrorCode:${code}`))

      if (process1Success) {
         //process 2 : copy build folder
         await runCommand('docker', ['cp', 'build-container:/home/app/output/build', 'build'], logProducer)
            .then(async (code: number) => {
               process2Success = true
               await logProducer(`Build copied successfully.`)
               await logProducer(`Process 2 closed with SuccessCode:${code}`)
               await logProducer(' ')
            })
            .catch(async(code: number) => await logProducer(`Process 2 closed with ErrorCode:${code}`))
      }

      //process 3 upload build 
      if (process1Success && process2Success) {
         await sendObjectsToS3(domain, logProducer)
            .then(async(code: number) => {
               await logProducer(' ')
               await logProducer(`Build uploaded successfully.`)
               await logProducer(`Process 3 closed with SuccessCode: ${code}`)
               await logProducer(' ')
            })
            .catch(async(code: number) => await logProducer(`Process 3 closed with ErrorCode:${code}`))
         fs.rmSync(path.join(process.cwd(), "build"), { recursive: true, force: true })
      }

      //process 4 delete build-container
      await runCommand('docker', ['rm', 'build-container'], logProducer)
         .then(async(code: number) => await logProducer(`Process 4 closed with SuccessCode: ${code}`))
         .catch(async(code: number) => await logProducer(`Process 4 closed with ErrorCode:${code}`))


      //delete the message from the queue
      await sqsClient.send(sqs_delete_message_command(Messages[0].ReceiptHandle as string))

      await kafkaProducer.disconnect()

      exec('sudo shutdown -h now')

}


init()
