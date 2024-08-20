import fs from "fs";
import path from "path";
import { Kafka } from "kafkajs";

import dotenv from "dotenv";
dotenv.config();

const kafka = new Kafka({
    clientId: `skywave-build-server`,
    brokers: [process.env.KAFKA_BROKER_URL as string],
    ssl: {
        ca: [fs.readFileSync(path.join(process.cwd(), 'kafka.pem'), 'utf-8')]
    },
    sasl: {
        username: process.env.KAFKA_USERNAME as string,
        password: process.env.KAFKA_PASSWORD as string,
        mechanism: 'plain'
    }
})
export const kafkaProducer = kafka.producer();

export const generateLogProducer = (project_id: string, deployment_id: string) => { //closure
    return async (log: string) => {
        await kafkaProducer.send({
            topic: "build-logs",
            messages: [{
                key: "logs",
                value: JSON.stringify({
                    project_id,
                    deployment_id,
                    log
                })
            }]
        })
    }
}