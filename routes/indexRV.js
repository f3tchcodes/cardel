const path = require("path");
const express = require("express");
const router = express.Router();
const htmlPath = "@public/html/";
const jwt = require("jsonwebtoken");

// extras
const jwtAuth = require("@middlewares/jwtAuth");

// ROUTER /
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, `${htmlPath}index.html`));
});

router.get("/privacy", (req, res) => {
    res.sendFile(path.join(__dirname, `${htmlPath}privacy.html`));
});

router.get("/login", (req, res) => {
    if (req.cookies.token){
        try {
            jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError"){
                res.clearCookie("token");
                return res.redirect("/login");
            }
        }   
        return jwt_data && res.redirect("/dashboard");
    }

    res.render("login");
});

router.get("/signup", (req, res) => {
    if (req.cookies.token){
        try {
            jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError"){
                res.clearCookie("token");
                return res.redirect("/login");
            }
        }   
        return jwt_data && res.redirect("/dashboard");
    }

    res.render("signup");
});


router.get("/pricing", (req, res) => {
    try{
        res.render("pricing");
    } catch (err) {
        res.json({status: 400, message: "Error loading pricing page."});
        console.log(err)
    }
});


module.exports = router;
