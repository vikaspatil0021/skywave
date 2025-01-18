import mime from "mime-types";

import dotenv from "dotenv";
dotenv.config();

// -----------aws s3 client handlers--------------
import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand, CreateInvalidationCommandInput } from "@aws-sdk/client-cloudfront";

const awsConfig = {
   region: 'ap-south-1',
   credentials: {
      accessKeyId: process.env.AWS_ID as string,
      secretAccessKey: process.env.AWS_KEY as string
   }
}

export const s3Client = new S3Client(awsConfig)
export const cloudFrontClient = new CloudFrontClient(awsConfig);


const s3_putObject_command = (objectData: PutObjectCommandInput) => new PutObjectCommand(objectData)
const cloudFront_create_invalidation_command = (input_data: CreateInvalidationCommandInput) => new CreateInvalidationCommand(input_data);

//------runCommand function handler----------

import { spawn } from "child_process";

export function runCommand(command: string, args: string[], logProducer: (value: string, type: 'Log' | "Status") => Promise<void>): Promise<number> {
   return new Promise((resolve, reject) => {

      const cmd = spawn(command, args);

      cmd.stdout.on('data', async (data: Buffer) => {
         await logProducer(data.toString(), 'Log');
      });

      cmd.stderr.on('data', async (data: Buffer) => {
         await logProducer(data.toString(), 'Log');
      });

      cmd.on('close', (code: number) => {
         (code === 0) ? resolve(code) : reject(code)
      });

   })
}




//------------sending object to s3---------------

import fs from "fs";
import path from "path";

const buildDirPath = path.join(process.cwd(), "build");


export async function sendObjectsToS3(domain: string, logProducer: (value: string, type: 'Log' | "Status") => Promise<void>): Promise<number> {
   return new Promise(async (resolve, reject) => {
      try {
         await logProducer("\nUploading build...\n", 'Log')
         const files_and_folders = fs.readdirSync(buildDirPath, { recursive: true }) as string[];

         const files = files_and_folders.filter((file: string) => {    //return only files
            const filePath = path.join(buildDirPath, file as string);
            const fileStat = fs.lstatSync(filePath);

            return !fileStat.isDirectory()
         }) as string[]

         const uploadPromises = files.map(async (file: string) => {
            try {
               const filePath = path.join(buildDirPath, file as string);
               const file_name = path.basename(filePath);
               let key = '';

               if (file_name.includes(".html")) {
                  key = `__output/${domain}/${file_name}`
               } else if (file_name.includes(".css")) {
                  key = `__output/${domain}/css/${file_name}`
               } else if (file_name.includes(".js")) {
                  key = `__output/${domain}/js/${file_name}`
               } else {
                  key = `__output/${domain}/others/${file_name}`
               }

               const res = await s3Client.send(s3_putObject_command({
                  Bucket: 'skywave-artifacts-storage',
                  Key: key,
                  Body: fs.createReadStream(filePath),
                  ContentType: mime.lookup(filePath) as string
               }));

               await logProducer(`${res.$metadata.httpStatusCode} ${file} uploaded`, 'Log')
            } catch (error: any) {
               await logProducer(`Error uploading file: ${file} ${error.message}`, 'Log');
            }
         })

         await Promise.all(uploadPromises);
         resolve(0)
      } catch (error: any) {
         await logProducer(error?.message, 'Log')
         reject(1)
      }
   })
}


//---------invalidating the objects in s3 at /[domain]/*
export async function cloudfront_invalidation(domain: string) {
   return new Promise(async (resolve, reject) => {
      try {

         await cloudFrontClient.send(cloudFront_create_invalidation_command({
            DistributionId: process.env.AWS_DISTRIBUTION_ID,
            InvalidationBatch:{
               Paths: {
                  Quantity: 1,
                  Items: [
                     `/${domain}/*`,
                  ],
               },
               CallerReference: (new Date()).toISOString(),
            }
         }));
         resolve(0)
      } catch (error: any) {
         reject(1)
      }
   })
}
