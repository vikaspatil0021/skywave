import { v4 as uuidv4 } from 'uuid';

import { EachBatchPayload, MessageSetEntry, RecordBatchEntry } from "kafkajs";

import { kafkaConsumer } from "./kafka.js"
import { db_client, pg_client_generate } from "./dbClient.js";


type Message = {
    deployment_id: string,
    log?: string,
    created_at?: Date,
    status?: string
    type: 'Log' | "Status"
}

async function init() {
    await kafkaConsumer.connect();

    await kafkaConsumer.subscribe({ topics: ["build-logs"], fromBeginning: true })

    await kafkaConsumer.run({
        eachBatch: async ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }: EachBatchPayload) => {

            const pg_client = pg_client_generate();
            await pg_client.connect()

            const promises = batch?.messages.map((msg: MessageSetEntry | RecordBatchEntry) => {
                return new Promise(async (resolve, reject) => {

                    const { type, deployment_id, log, created_at, status } = JSON.parse(msg.value?.toString() as string) as Message;

                    try {

                        if (type === 'Log') {
                            await db_client.insert({
                                table: 'build_logs',
                                values: [{ id: uuidv4(), deployment_id, log, created_at }],
                                format: 'JSONEachRow'
                            });
                        } else if (type === 'Status') {

                            const query = `
                                UPDATE "Deployment"
                                SET status=$1
                                WHERE id=$2;
                          `;
                            const values = [status, deployment_id];

                            await pg_client.query(query, values);

                        }


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
            await Promise.all(promises);
            await pg_client.end();
        }
    }).catch(async () => await kafkaConsumer.disconnect());

}

init();
