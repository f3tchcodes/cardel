require("dotenv").config();
const jwt = require("jsonwebtoken");

const jwtAuth = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        console.log(err);
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

module.exports = jwtAuth;
