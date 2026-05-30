/*
    ROUTE: /api/user/analytics

    ENDPOINTS:
    GET  -- /current_month
    POST -- /date  -- (from, to)
*/

const express = require("express");
const router = express.Router();

router.post("/current_month", async (req, res) => {
    // initializing variables

    let
        current_month_cost,
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
});

module.exports = router;
