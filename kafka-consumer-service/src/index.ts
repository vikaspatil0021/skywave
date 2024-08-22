import { v4 as uuidv4 } from 'uuid';

import { EachBatchPayload, MessageSetEntry, RecordBatchEntry } from "kafkajs";

import { kafkaConsumer } from "./kafka.js"
import { db_client } from "./dbClient.js";


type Message = {
    project_id: string,
    deployment_id: string,
    log: string,
    created_at: Date
}

async function init() {
    await kafkaConsumer.connect();

    await kafkaConsumer.subscribe({ topics: ["build-logs"], fromBeginning: true })

    await kafkaConsumer.run({
        eachBatch: async ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }: EachBatchPayload) => {

            const promises = batch?.messages.map((msg: MessageSetEntry | RecordBatchEntry) => {
                return new Promise(async (resolve, reject) => {

                    const { deployment_id, log, project_id, created_at } = JSON.parse(msg.value?.toString() as string) as Message;

                    try {
                        await db_client.insert({
                            table: 'log_events',
                            values: [{ id: uuidv4(), project_id, deployment_id, log, created_at }],
                            format: 'JSONEachRow'
                        });


                        //resolveOffset - makes sures duplicate messages are not processed in a single batch and in case of any error all resolved messages are committed to the kafka instance
                        resolveOffset(msg.offset as string);
                        //commitOffsetsIfNecessary - commit to the kafka instance that the message has been read
                        await commitOffsetsIfNecessary({ topics: [{ topic: 'build-logs', partitions: [{ offset: msg.offset, partition: 0 }] }] });
                        //heartbeat - tell the kafka that this consumer is still alive 
                        await heartbeat();
                        resolve(0)
                    } catch (error) {
                        console.log(error)
                        reject(error)
                    };
                });
            });
            await Promise.all(promises)
        }
    })
}

init();
