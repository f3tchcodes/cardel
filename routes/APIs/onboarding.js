/*
    ROUTE: /api/onboarding/

    ENDPOINTS: 
    POST -- /complete -- (h_subUse, h_subManage, h_hearAbout, h_notifyDays, h_subNumber, h_subMonthlySpend)
*/

// importing libraries
require("dotenv").config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// variables
const jwtAuth = require("@middlewares/jwtAuth");
const con = require("@utils/database");

// complete onboarding
router.post("/complete", async (req, res) => {

    try{
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch(err){
        console.log(err);
        return res.json({error: true, message: true, message: "JWT can't be verified, login again or contact us to fix."});
    }

    try {
        [rows1] = await con.query(`
            SELECT * 
            FROM users
            WHERE email = ?;`,
            [jwt_data.email]);
    } catch (err) {
        res.status(500).json({error:true, message: "Server could not send the query to the database, if this persists please contact us at our support email."});
    }

    if (rows1.length === 1){
        if (rows1[0].first_time_login === 1){
            const data = {
                subUse: req.body.h_subUse || '',
                subManage: req.body.h_subManage || '',
                hearAbout: req.body.h_hearAbout || '',
                notifyDays: req.body.h_notifyDays || 3,
                subNumber: req.body.h_subNumber || 0,
                subMonthlySpend: req.body.h_subMonthlySpend || ''
            };

            try{
                h_notifyDays_int = parseInt(data.notifyDays) || 3;
                h_subNumber_int = parseInt(data.subNumber) || 0;
            } catch(err){
                console.log(err)
                return res.json({error: true, message: "Unexpected value"})
            }

            if (
                data.subUse.length > 10000 || 
                data.subManage.length > 255 ||
                data.hearAbout.length > 255 ||
                h_notifyDays_int.length > 255 ||
                h_subNumber_int.length > 255 ||
                data.subMonthlySpend.length > 255
                ) {
                    return res.json({error: true, mesage: "Input data is too large fucker, you tryna DoS or smth?"});
                }

            try {
                await con.query(`
                    INSERT INTO users_onboarding (user_id, subUse, subManage, hearAbout, notifyDays, subNumber, subMonthlySpend) VALUES
                    (?, ?, ?, ?, ?, ?, ?);`,
                    [jwt_data.user_id, data.subUse, data.subManage, data.hearAbout, h_notifyDays_int, h_subNumber_int, data.subMonthlySpend]);

                await con.query(`
                    UPDATE users
                    SET first_time_login = 0
                    WHERE user_id = ?`,
                    [jwt_data.user_id])
            } catch(err){
                console.log(err);
                if (err.code == "ER_DUP_ENTRY"){
                    await con.query(`
                    UPDATE users_onboarding
                    SET subUse = ?,
                    subManage = ?, 
                    hearAbout = ?, 
                    notifyDays = ?, 
                    subNumber = ?,
                    subMonthlySpend = ?
                    WHERE user_id = ?;`,
                    [data.subUse, data.subManage, data.hearAbout, h_notifyDays_int, h_subNumber_int, data.subMonthlySpend, jwt_data.user_id]);

                    await con.query(`
                    UPDATE users
                    SET first_time_login = 0
                    WHERE user_id = ?`,
                    [jwt_data.user_id])

                    return res.status(500).json({error: true, message: "Onboarding is already done, refresh the page to fix this error. If you can't get out of this loop, contact us at our support email!"});
                }
                return res.status(500).json({error: true, message: "Server could not send the query to the database, if this persists please contact us at our support email."});
            }
        }
    } else {
        return res.json({error: true, message: "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email."});
    }

    return res.redirect("/dashboard");

});

module.exports = router;
