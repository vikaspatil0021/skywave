import mime from "mime-types";

import dotenv from "dotenv";
dotenv.config();

// -----------aws sqs and s3 client handlers--------------

import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const awsConfig = {
   region: 'ap-south-1',
   credentials: {
      accessKeyId: process.env.AWS_ID as string,
      secretAccessKey: process.env.AWS_KEY as string
   }
}

export const sqsClient = new SQSClient(awsConfig);
export const s3Client = new S3Client(awsConfig)

export const sqs_receive_message_command = new ReceiveMessageCommand({
   QueueUrl: process.env.SQS_URL as string,
   MaxNumberOfMessages: 1,
   WaitTimeSeconds: 10
})

export const sqs_delete_message_command = (receiptHandle: string) => new DeleteMessageCommand({
   QueueUrl: process.env.SQS_URL as string,
   ReceiptHandle: receiptHandle
})

const s3_putObject_command = (objectData: PutObjectCommandInput) => new PutObjectCommand(objectData)

//------runCommand function handler----------

import { spawn } from "child_process";

export function runCommand(command: string, args: string[]): Promise<number> {
   return new Promise((resolve, reject) => {

      const cmd = spawn(command, args);

      cmd.stdout.on('data', (data: Buffer) => {
         console.log(data.toString());
      });

      cmd.stderr.on('data', (data: Buffer) => {
         console.error(data.toString());
      });

      cmd.on('close', (code: number) => {
         (code === 0) ? resolve(code) : reject(code)
      });

   })
}




//------------sending object to s3---------------

import fs from "fs";
import path from "path";
import chalk from "chalk";

const buildDirPath = path.join(process.cwd(), "build");


export async function sendObjectsToS3(projectId: string): Promise<number> {
   return new Promise(async (resolve, reject) => {
      try {
         console.log(chalk.green("\nUploading build...\n"))
         const files_and_folders = fs.readdirSync(buildDirPath, { recursive: true }) as string[];

         const files = files_and_folders.filter((file: string) => {    //return only files
            const filePath = path.join(buildDirPath, file as string);
            const fileStat = fs.lstatSync(filePath);

            return !fileStat.isDirectory()
         }) as string[]

         const uploadPromises = files.map(async (file: string) => {
            try {
               const filePath = path.join(buildDirPath, file as string);

               const res = await s3Client.send(s3_putObject_command({
                  Bucket: 'vercel-bucket-service',
                  Key: `__ouput/${projectId}/${file}`,
                  Body: fs.createReadStream(filePath),
                  ContentType: mime.lookup(filePath) as string
               }));

               console.log(res.$metadata.httpStatusCode, `${file} uploaded`)
            } catch (error: any) {
               console.error(`Error uploading file: ${file}`, error.message);
            }
         })

         await Promise.all(uploadPromises);
         resolve(0)
      } catch (error: any) {
         console.error(error?.message)
         reject(1)
      }
   })
} 
