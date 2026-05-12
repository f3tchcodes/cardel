// Worker for sending update emails after subscription ends

const { Worker } = require("bullmq");
const { connection } = require("@utils/queue");
const { subEmail } = require("@utils/subEmail");

// WORKER PROCESSES

const worker = new Worker(
    "queue",
    async (job) => {
        if (job.name === "send-sub-renewal-email") {
            subEmail("renewal", job.id);
        }

        if (job.name === "send-sub-update-email") {
            const days_left = job.id.at(-1);
            subEmail("update", job.id, days_left);
        }
    },
    { connection },
);

// WORKER EVENTS

worker.on("completed", (job) => console.log(`job ${job.id} completed!`));

worker.on("error", (err) => {
    console.error("WORKER ERROR", err);
});

worker.on("failed", (job, err) => {
    console.error("JOB FAILED", err);
});
