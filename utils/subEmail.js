const con = require("@utils/database");
const { Resend } = require("resend");
const ejs = require("ejs");
const path = require("path");

const resend = new Resend(process.env.RESEND_API_KEY);
const updateEmailTemplate = path.resolve(
    __dirname,
    "../views/emails/subUpdateEmail.ejs",
);
const renewalEmailTemplate = path.resolve(
    __dirname,
    "../views/emails/subRenewalEmail.ejs",
);

async function subEmail(status, job_id, days_left = 3) {
    try {
        // get sub_id from job_id
        const sub_id = job_id.slice(4);

        // get subscriptions data from sub_id
        const [[user_sub]] = await con.query(
            `
            SELECT * 
            FROM users_subscriptions 
            WHERE sub_id = ?;`,
            [sub_id],
        );

        // get user data from user_id received from sub_id
        const [[user]] = await con.query(
            `
            SELECT * 
            FROM users 
            WHERE user_id = ?;`,
            [user_sub.user_id],
        );

        if (status === "update") {
            // send email for updates ie. 3 days, 2 days, 1 day
            const emailData = {
                hostname: process.env.HOST,
                sub_icon: user_sub.sub_icon,
                username: user.username,
                sub_name: user_sub.sub_name,
                sub_rate: user_sub.sub_rate,
                days_left: days_left,
            };

            await ejs.renderFile(
                updateEmailTemplate,
                emailData,
                async (err, html) => {
                    if (err)
                        return console.error(
                            "Error rendering email template:",
                            err,
                        );
                    await resend.emails.send({
                        from: `Cardel <${process.env.EMAIL}>`,
                        to: user.email,
                        subject: `Your ${user_sub.sub_name} subscription will be renewed in ${days_left} day${days_left > 1 ? "s" : ""}`,
                        html: html,
                    });
                },
            );
        }

        if (status === "renewal") {
            // send email for renewal ie. your netflix subscription has been renewed.
            const emailData = {
                hostname: process.env.HOST,
                sub_icon: user_sub.sub_icon,
                username: user.username,
                sub_name: user_sub.sub_name,
                sub_rate: user_sub.sub_rate,
            };

            await ejs.renderFile(
                renewalEmailTemplate,
                emailData,
                async (err, html) => {
                    if (err)
                        return console.error(
                            "Error rendering email template:",
                            err,
                        );
                    await resend.emails.send({
                        from: `Cardel <${process.env.EMAIL}>`,
                        to: user.email,
                        subject: `Your ${user_sub.sub_name} subscription has been renewed!`,
                        html: html,
                    });
                },
            );
        }
    } catch (err) {
        console.log(`Error in subUpdateEmail.js: ${err}`);
    }
}

module.exports = { subEmail };
