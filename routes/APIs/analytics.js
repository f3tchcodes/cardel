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
        current_month_cost = 0,
        next_payment,
        biggest_cost,
        week_1,
        week_2,
        week_3,
        week4,
        category_streaming,
        category_gaming,
        category_workbusiness,
        category_health,
        category_digitaltools,
        category_others;

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
        const billing_type = sub.sub_billing_type;
        const billing_interval = sub.sub_billing_interval;

        let occurences = 0;

        if (subbed_at > firstDayCurrentMonth && subbed_at < firstDayNextMonth) {
            occurences++;
        }
    }
});

module.exports = router;
