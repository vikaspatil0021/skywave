import fs from "fs";

import dotenv from "dotenv";
dotenv.config({ path: "./../.env" });

import pg from "pg";
import { createClient } from "@clickhouse/client";

// pg clients cannot be reused and ends up creating useless errors so better to create a new client every time
export const pg_client_generate = () => new pg.Client({
    connectionString: process.env.DATABASE_URL as string,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./../postgresql.pem').toString(),
    },
})


export const db_client = createClient({
    url: process.env.CLICKHOUSE_DB_URL as string,
})

