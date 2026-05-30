/*
    ROUTE: /api/user/analytics

    ENDPOINTS:
    GET  -- /current_month
    POST -- /date  -- (from, to)
*/

const express = require("express");
const router = express.Router();

router.get("/current_month", async (req, res) => {
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

    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1); // <-- This one

    console.log(firstDayNextMonth);
    console.log(firstDayCurrentMonth); 
});

module.exports = router;
