// Check if user logs in first time
// Yes: Continue to /onboarding
// No: Continue to /dashboard
// Rest of the stuff is dashboard.

require("dotenv").config();
const express = require("express");
const router = express.Router();
const con = require("@config/database");
const jwt = require("jsonwebtoken")

// ROUTER /dashboard

// routing to dashboard
router.get("/dashboard", async (req, res) => {
    try{
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch(err){
        console.log(err);
        return res.json({error: "JWT can't be verified, login again or contact us to fix."});
    }

    [rows1] = await con.query(`
        SELECT * 
        FROM users
        WHERE email = ?;`,
        [jwt_data.email]);

    if (rows1.length === 1){
        if (rows1[0].first_time_login === 1){
            return res.redirect("/onboarding");
        }
    } else {
        res.clearCookie("token");
        return res.json({error: "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email."});
    }

    // continue with dashboard
    return res.render("dashboard");
});

// DASHBOARD API IS IN api.js


// ROUTER /onboarding
router.get("/onboarding", async (req, res) => {
    try{
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch(err){
        console.log(err);
        return res.json({error: "JWT can't be verified, login again or contact us to fix."});
    }

    console.log(jwt_data)
    
    try {
        [rows1] = await con.query(`
            SELECT * 
            FROM users
            WHERE email = ?;`,
            [jwt_data.email]);
    } catch (err) {
        res.status(500).json({error: "Server could not send the query to the database, if this persists please contact us at our support email."});
    }

    if (rows1.length === 1){
        if (rows1[0].first_time_login === 1){
            try{
                subManage = [
                    "I don't track them",
                    "Manual tracking",
                    "Sheets/notes",
                    "Alarms",
                    "Dedicated tools",
                    "Custom scripts",
                    "Other"
                ]

                hearAbout = [
                    "Social media",
                    "Search engines",
                    "Friends",
                    "Partnership",
                    "Online ads",
                    "Other"
                ]

                notifyDays = [
                    "1",
                    "2",
                    "3",
                    "4",
                    "5"
                ]

                subNumber = [
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "10+"
                ]

                subMonthlySpend = [
                    "$0-$25",
                    "$25-$50",
                    "$50-$75",
                    "$75-$100",
                    "$100-$150",
                    "$150-$200",
                    "$200-$300",
                    "$300-$500",
                    "$500-$750",
                    "$750-$1000",
                    "$1000+"
                ]

                const [rows2] = await con.query("SELECT subName, subIconURL FROM subscription_templates");
                
                subscriptions = rows2.map(row => [row.subName, row.subIconURL]);
                return res.render("onboarding", {
                    username: jwt_data.username, 
                    subUse: subscriptions, 
                    subManage: subManage, 
                    hearAbout: hearAbout,
                    notifyDays: notifyDays,
                    subNumber: subNumber,
                    subMonthlySpend: subMonthlySpend
                });
            } catch(err){
                console.log(err);
                return res.json({error: "Can't onboard you, contact us at our email to fix this error."});
            }
        }
    } else {
        return res.json({error: "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email."});
    }

    res.redirect("/dashboard")
});

// ONBOARDING API IS IN /APIs

module.exports = router;
