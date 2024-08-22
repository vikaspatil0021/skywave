
import dotenv from "dotenv";
dotenv.config({ path: "./../.env" });

import { createClient } from "@clickhouse/client";


export const db_client = createClient({
    url: process.env.CLICKHOUSE_DB_URL as string,
})

