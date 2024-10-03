import fs from "fs";
import path from "path";
import { Kafka } from "kafkajs";

import dotenv from "dotenv";
dotenv.config();

const kafka = new Kafka({
    clientId: `skywave-kafka-producer`,
    brokers: [process.env.KAFKA_BROKER_URL as string],
    ssl: {
        ca: [fs.readFileSync(path.join(path.resolve(process.cwd(), '..'), 'kafka.pem'), 'utf-8')]
    },
    sasl: {
        username: process.env.KAFKA_USERNAME as string,
        password: process.env.KAFKA_PASSWORD as string,
        mechanism: 'scram-sha-512'
    }
})

export const kafkaProducer = kafka.producer();

export const generateLogProducer = (deployment_id: string) => { //closure
    return async (value: string, type: 'Log' | "Status") => {
        let params;

        if (type === 'Log') {
            params = {
                type,
                deployment_id,
                log: value,
                created_at: new Date()
            }
        } else if (type === 'Status') {
            params = {
                type,
                status: value,
                deployment_id
            }
        }

        await kafkaProducer.send({
            topic: "build-logs",
            messages: [{
                key: "logs",
                value: JSON.stringify(params)
            }]
        })
    }
}