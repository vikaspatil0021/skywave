<p align='center'>
  <a href="https://skywave-web-app.vercel.app" target='_blank'>
    <img alt="Skywave is the open-source cloud platform for deployment of static sites." 
      src="https://github.com/user-attachments/assets/0b575f6a-a02a-46cf-ab4f-bd05761b1d1e">
  </a>
</p>

## Introduction

Skywave is the open-source cloud platform for deployment of static websites.

### Features

- **Instant Static Site Hosting**: Launch your static website quickly with simple, streamlined hosting.

- **Automatic Deployments from Git**: Deploy changes automatically with each push to your Git repository.

- **Scalable with CloudFront and S3**: Benefit from AWS's global network for fast, reliable, and scalable website performance.

- **Easy Access to Deployment Logs**: View detailed logs for each deployment to track changes and troubleshoot easily.

- **Supports Popular Frameworks**: Compatible with top frameworks like React, Angular, Vue, and more, letting you build with your preferred tools.

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
This demonstrates a request flow where a user accesses a deployed website, and the request is processed through AWS CloudFront, with URL rewrites at the edge before being routed to an S3 bucket.

1. **User Accesses Website**:  The request flow starts when the user tries to access a deployed website.

2. **CloudFront Receives the Request**:  The request first goes to AWS CloudFront, which acts as a Content Delivery Network (CDN) and speeds up content delivery by caching resources at various edge locations.

3. **Edge Function URL Rewrite**:
   - At CloudFront's edge, an **Edge Function** processes the incoming request.
   - The Edge Function inspects the request URL pathname and rewrites the path as follows:
     - For **CSS Files**: Requests with `https://abc1.skywave.app/static/style.css` are rewritten to `[s3 url]/abc1/css/style.css`.
     - For **JavaScript Files**: Requests with `https://abc1.skywave.app/static/script.js` are rewritten to `[s3 url]/abc1/js/script.js`.
     - For **Route Paths**: Requests for routes like `https://abc1.skywave.app/dashboard` or `https://ab1.skywave.app/new` are rewritten to serve the `[s3 url]/abc1/index.html` file.

4. **Request Sent to S3**:
   - After the URL rewrite, the request (now with the updated URI) is directed to an **S3 Bucket**.
   - **Note**: The request reaches S3 only once for each unique resource, as CloudFront will cache the content after the initial retrieval, reducing latency for subsequent requests.

5. **CloudFront Caching**:
   - Once a request is served from S3, CloudFront caches the response.
   - Subsequent requests for the same resource are served directly from CloudFront’s cache, reducing load on S3 and improving the response time.


![Screenshot from 2024-11-02 21-43-53](https://github.com/user-attachments/assets/2aba1837-4c0c-4c61-8856-c6e7b5ee1dff)

### Deployment Phase Workflow

1. **Instance Launch**: The API server launches a build-server instance using predefined settings.

2. **Repository Cloning and Build**: The build-server clones the git repository and builds the necessary artifacts.

3. **Artifact Upload**: Upon successful build, the build-server uploads the build artifacts to an S3 bucket.

4. **Log Production**: The build-server acts as a Kafka producer, generating logs and sending them to a Kafka instance.

5. **Log Consumption and Storage**: A Kafka consumer service receives the logs, stores them in a ClickHouse database, and updates the deployment status in the main database.

6. **Frontend Polling**: The frontend polls the API server to retrieve deployment status updates from the main and ClickHouse databases.


![Screenshot from 2024-11-02 22-01-41](https://github.com/user-attachments/assets/715be6b8-d044-42dd-bc96-32f5a18040e3)

