/*
    ROUTE: /api/

    ENDPOINTS: 
    GET -- /user
*/

// importing libraries
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// fetching user information
router.get("/user", (req, res) => {
    try {
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);  
        return res.json(jwt_data);
    } catch (err) {
        console.log(err);
        return res.json({
            error: true,
            message: true,
            message: "JWT can't be verified, login again or contact us to fix.",
        });
    }
});

module.exports = router;
