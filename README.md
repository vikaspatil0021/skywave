<p align='center'>
  <a href="https://skywave-web-app.vercel.app" target='_blank'>
    <img alt="Skywave is the open-source cloud platform for deployment of static sites." 
      src="https://github.com/user-attachments/assets/0b575f6a-a02a-46cf-ab4f-bd05761b1d1e">
  </a>
</p>

## Introduction

Skywave is the open-source cloud platform for deployment of static websites.

### Features

- Instant static site hosting for quick and easy website launches.  
- Automatic Git-based deployments with every push.  
- Scalable performance using AWS CloudFront and S3.  
- Easy access to detailed deployment logs for tracking and troubleshooting.  
- Support for popular frameworks like React, Angular, and Vue.  

## Built with

- [Next.js](https://nextjs.org/) – framework
- [TypeScript](https://www.typescriptlang.org/) – language
- [Tailwind](https://tailwindcss.com/) – CSS
- [NextAuth.js](https://next-auth.js.org/) – auth
- [Kafka](https://kafka.apache.org/) – logs streaming
- [Clickhouse](https://clickhouse.com/) – logs database
- [Postgresql](https://www.postgresql.org/) – main database
- [Prisma](https://www.prisma.io/) – ORM
- [Shadcn](https://ui.shadcn.com/) – ui
- [S3](https://aws.amazon.com/s3/) – build storage
- [Cloudfront](https://aws.amazon.com/cloudfront/) – build distribution
- [tRPC](https://trpc.io/) – api

## Architecture

### Request Phase Workflow
1. **User Accesses Website**: The user opens the website in their browser.  
2. **CloudFront Handles Request**: AWS CloudFront receives the request to deliver content faster.  
3. **Edge Function Updates URL**: The request URL is rewritten at CloudFront’s edge to match S3 paths for CSS, JavaScript, or route files.  
4. **Request Sent to S3**: The updated request is sent to an S3 bucket to fetch the correct file.  
5. **CloudFront Caches Response**: CloudFront saves the file in its cache to serve future requests faster without going to S3.  

![Screenshot from 2024-11-02 21-43-53](https://github.com/user-attachments/assets/2aba1837-4c0c-4c61-8856-c6e7b5ee1dff)

### Deployment Phase Workflow
1. **Instance Launch**: The API server starts a build-server instance with predefined settings.  
2. **Repository Cloning and Build**: The build-server clones the repository and compiles the required artifacts.  
3. **Artifact Upload**: The build artifacts are uploaded to an S3 bucket after a successful build.  
4. **Log Production**: The build-server sends logs to a Kafka instance as a Kafka producer.  
5. **Log Storage**: A Kafka consumer saves logs to ClickHouse and updates deployment status in the main database.  
6. **Frontend Polling**: The frontend checks the API server for deployment status updates.  

![Screenshot from 2024-11-02 22-01-41](https://github.com/user-attachments/assets/715be6b8-d044-42dd-bc96-32f5a18040e3)

