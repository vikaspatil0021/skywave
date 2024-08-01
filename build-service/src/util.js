import mime from "mime-types";

import dotenv from "dotenv";
dotenv.config();

// -----------aws sqs and s3 client handlers--------------

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const awsConfig = {
   region: 'ap-south-1',
   credentials: {
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_KEY
   }
}

export const sqsClient = new SQSClient(awsConfig);
export const s3Client = new S3Client(awsConfig)

export const sqs_receive_message_command = new ReceiveMessageCommand({
   QueueUrl: process.env.SQS_URL,
   MaxNumberOfMessages: 1,
   WaitTimeSeconds: 10
})

export const sqs_delete_message_command = (Messages) => new DeleteMessageCommand({
   QueueUrl: process.env.SQS_URL,
   ReceiptHandle: Messages[0].ReceiptHandle
})

const s3_putObject_command = (objectData) => new PutObjectCommand(objectData)

//------runCommand function handler----------

import { spawn } from "child_process";

export function runCommand(command, args) {
   return new Promise((resolve, reject) => {

      const cmd = spawn(command, args);

      cmd.stdout.on('data', (data) => {
         console.log(data.toString());
      });

      cmd.stderr.on('data', (data) => {
         console.error(data.toString());
      });

      cmd.on('close', (code) => {
         (code === 0) ? resolve(code) : reject(code)
      });

   })
}




//------------sending object to s3---------------

import fs from "fs";
import path from "path";
import chalk from "chalk";

export const __dirname = path.dirname(import.meta.dirname);
const buildDirPath = path.join(__dirname, "build");


export async function sendObjectsToS3(projectId) {
   return new Promise(async (resolve, reject) => {
      try {
         console.log(chalk.green("\nUploading build...\n"))
         const files_and_folders = fs.readdirSync(buildDirPath, { recursive: true });

         const files = files_and_folders.filter(file => {    //return only files
            const filePath = path.join(buildDirPath, file);
            const fileStat = fs.lstatSync(filePath);

            return !fileStat.isDirectory()
         })

         const uploadPromises = files.map(async file => {
            try {
               const filePath = path.join(buildDirPath, file);

               const res = await s3Client.send(s3_putObject_command({
                  Bucket: 'vercel-bucket-service',
                  Key: `__ouput/${projectId}/${file}`,
                  Body: fs.createReadStream(filePath),
                  ContentType: mime.lookup(filePath)
               }));

               console.log(res.$metadata.httpStatusCode, `${file} uploaded`)
            } catch (error) {
               console.error(`Error uploading file: ${file}`, error.message);
            }
         })

         await Promise.all(uploadPromises);
         resolve(0)
      } catch (error) {
         console.error(error.message)
         reject(1)
      }
   })
} 
