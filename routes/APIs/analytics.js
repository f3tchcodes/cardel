/*
    ROUTE: /api/user/analytics

    ENDPOINTS:
    GET  -- /current_month
    POST -- /date  -- (from, to)
*/

const express = require("express");
const router = express.Router();
const con = require("@utils/database");
const jwt = require("jsonwebtoken");

router.get("/current_month", async (req, res) => {
    let jwt_data;
    
    try {
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err);
        return res.json({
            error: true,
            message: "JWT can't be verified, login again or contact us to fix.",
        });
    }

    try {
        [rows1] = await con.query(
            `
            SELECT * 
            FROM users
            WHERE email = ?;`,
            [jwt_data.email],
        );

        if (rows1.length === 1) {
            if (rows1[0].first_time_login === 1) {
                return res.redirect("/onboarding");
            }
        } else {
            res.clearCookie("token");
            console.log(err);
            return res.json({
                error: true,
                message:
                    "Refresh page!",
            });
        }
    } catch (err) {
        console.log(err);
        return res.json({
            error: true,
            message:
                "Error occured, request did not go through. Contact support to get help.",
        });
    }

    // initializing variables
    let
        [current_month_cost,
        next_payment_in,
        biggest_cost,
        biggest_cost_name,
        week_1,
        week_2,
        week_3,
        week_4,
        week_5,
        cat_streaming,
        cat_gaming,
        cat_workbusiness,
        cat_health,
        cat_digitaltools,
        cat_others] = Array(15).fill(0);

    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [subscriptions] = await con.query(
        `SELECT * 
        FROM users_subscriptions
        WHERE user_id = ? AND enabled = ?`,
        [jwt_data.user_id, 1]
    );

    for (const sub of subscriptions) {
        const subbed_at = sub.subbed_at;
        const cost = parseFloat(sub.sub_rate);
        const next_sub = sub.sub_next;
        const billing_type = sub.sub_billing_type;
        const billing_interval = sub.sub_billing_interval;
        const sub_category = sub.sub_category.toLowerCase();

        const current_month_daysMs = firstDayNextMonth-firstDayCurrentMonth;
        const current_month_days = current_month_daysMs / (1000 * 60 * 60 * 24);
        
        let chargeDate = new Date(subbed_at);
        let occurences = 0;

        if (cost > biggest_cost) {
            biggest_cost = sub.sub_rate;
            biggest_cost_name = String(sub.sub_name);
        }

        while (chargeDate < firstDayNextMonth) {
            if (chargeDate >= firstDayCurrentMonth) {
                occurences++;

                const dayOfMonth = chargeDate.getDate();

                if (dayOfMonth <= 7) {
                    week_1 += cost;
                } else if (dayOfMonth <= 14) {
                    week_2 += cost;
                } else if (dayOfMonth <= 21) {
                    week_3 += cost;
                } else if (dayOfMonth <= 28) {
                    week_4 += cost;
                } else {
                    week_5 += cost;
                }

                switch (sub_category) {
                    case "streaming":
                        cat_streaming += cost;
                        break;
                    case "gaming":
                        cat_gaming += cost;
                        break;
                    case "digitaltools":
                        cat_digitaltools += cost;
                        break;
                    case "health":
                        cat_health += cost;
                        break;
                    case "workbusiness":
                        cat_workbusiness += cost;
                        break;
                    default:
                        cat_others += cost;
                }
            }

            switch (billing_type) {
                case "day":
                    chargeDate.setDate(
                        chargeDate.getDate() + billing_interval
                    );
                    break;
                case "week":
                    chargeDate.setDate(
                        chargeDate.getDate() + (billing_interval * 7)
                    );
                    break;
                case "month":
                    chargeDate.setMonth(
                        chargeDate.getMonth() + billing_interval);
                    break;
                case "year":
                    chargeDate.setFullYear(
                        chargeDate.getFullYear() + billing_interval
                    );
                    break;
            }
        }

        const current_sub_cost = occurences * cost;
        current_month_cost = current_month_cost + current_sub_cost;

        // LOGS
        // console.log(`cost: ${cost},`);
        // console.log(`subbed_at: ${subbed_at},`);
        // console.log(`next_sub: ${next_sub},`);
        // console.log(`billing_type: ${billing_type},`);
        // console.log(`billing_interval: ${billing_interval},`);
        // console.log(`occurences: ${occurences},`);
        // console.log(`current_sub_cost: ${current_sub_cost},`);
        // console.log(`current_month_cost: ${current_month_cost}\n`);
    }

    return res.status(200).json({
        current_month_cost,
        biggest_cost: {
            biggest_cost,
            biggest_cost_name
        },
        weeks: {
            week_1,
            week_2,
            week_3,
            week_4,
            week_5
        },
        category: {
            cat_streaming,
            cat_gaming,
            cat_workbusiness,
            cat_health,
            cat_digitaltools,
            cat_others
        }
    })
});

module.exports = router;
