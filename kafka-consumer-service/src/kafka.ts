import fs from "fs";
import path from "path";
import { Kafka } from "kafkajs";

import dotenv from "dotenv";
dotenv.config();

const kafka = new Kafka({
    clientId: `skywave-kafka-consumer`,
    brokers: [process.env.KAFKA_BROKER_URL as string],
    ssl: {
        ca: [fs.readFileSync(path.join(path.resolve(process.cwd(), '..'), 'kafka.pem'), 'utf-8')]
    },
    sasl: {
        username: process.env.KAFKA_USERNAME as string,
        password: process.env.KAFKA_PASSWORD as string,
        mechanism: 'scram-sha-512'
    }
});


export const kafkaConsumer = kafka.consumer({ groupId: 'kafka-consumer-group' });

