/*
    ROUTE: /api/auth/

    ENDPOINTS:
    POST -- /signup -- (username, email, password, confirm_password)
    GET  -- /verify -- (token)
    POST -- /login  -- (email, password)
*/

// importing libraries
const express = require("express");
const ejs = require("ejs");
const app = express();
const router = express.Router();
const argon2 = require("argon2"); // for password
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto"); // for generating email verification token
const { Resend } = require("resend"); // for sending email verification

const resend = new Resend(process.env.RESEND_API_KEY);

// db connection
const con = require("@utils/database");

const emailTemplate = path.resolve(
    __dirname,
    "../../views/emails/verifyEmail.ejs",
);

// ROUTER /auth
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password, confirm_password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // marketing consent value
        if (!req.body.marketing_consent) {
            req.body.marketing_consent = false;
        } else {
            req.body.marketing_consent = true;
        }

        const marketing_consent = req.body.marketing_consent;

        // privacy consent value
        if (!req.body.privacy_consent) {
            req.body.privacy_consent = false;
        } else {
            req.body.privacy_consent = true;
        }

        const privacy_consent = req.body.privacy_consent;

        // basic checks
        if (
            username.length === 0 ||
            normalizedEmail.length === 0 ||
            password.length === 0
        ) {
            return res.json({
                success: false,
                error: true,
                message: "All input fields must be filled.",
            });
        }

        if (normalizedEmail.length > 100 || password.length > 100 || username.length > 50) {
            return res.json({
                success: false,
                error: true,
                message: "Input data is too large.",
            });
        }

        if (!emailRegex.test(normalizedEmail)) {
            return res.json({
                success: false,
                error: true,
                message: "Please enter a valid email address.",
            });
        }

        if (password.length < 8) {
            return res.json({
                success: false,
                error: true,
                message: "Password must be 8 or more characters.",
            });
        }

        if (password != confirm_password) {
            return res.json({
                success: false,
                error: true,
                message: "Passwords do not match.",
            });
        }

        if (!privacy_consent) {
            return res.json({
                success: false,
                error: true,
                message: "You must accept our ToS to continue.",
            });
        }

        // password to sha-256 hash
        hashed_password = await argon2.hash(password);

        // email verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        const nextVerificationAllowed = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes

        // main db query
        await con.query(
            `INSERT INTO users 
            (username, email, password, marketing_consent, verification_token, verification_expires, next_verification_allowed) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                username,
                normalizedEmail,
                hashed_password,
                marketing_consent,
                verificationToken,
                verificationExpires,
                nextVerificationAllowed,
            ],
        );

        // send the verification email
        const verifyUrl = `http://${process.env.HOST}/api/auth/verify?token=${verificationToken}`;

        const emailData = {
            username: username,
            verifyUrl: verifyUrl,
            hostname: process.env.HOST,
        };

        await ejs.renderFile(emailTemplate, emailData, async (err, html) => {
            if (err)
                return console.error("Error rendering email template:", err);
            await resend.emails.send({
                from: "Cardel <support@cardel.app>",
                to: normalizedEmail,
                subject: "Verify your email",
                html: html,
            });
        });

        return res.json({
            success: true,
            error: false,
            message: "Verification link sent. Please check your email.",
        });
    } catch (err) {
        console.log(err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.json({
                success: false,
                error: true,
                message: "This email has already been used!",
            });
        } else {
            return res.json({
                success: false,
                error: true,
                message: "Unknown error occured. Try again later.",
            });
        }
    }
});

router.get("/verify", async (req, res) => {
    try {
        const { token } = req.query;

        // check if token is present
        if (!token) {
            return res.render("verify", { status: 400 });
        }

        // check if token is expired
        const [rows] = await con.query(
            `SELECT user_id, username FROM users
            WHERE verification_token = ?
            AND verification_expires > NOW()
            AND isVerified = false`,
            [token],
        );

        if (rows.length === 0) {
            return res.render("verify", { status: 404 });
        }

        // update isVerified after verifying
        await con.query(
            `
            UPDATE users
            SET isVerified = true,
                verification_token = NULL,
                verification_expires = NULL,
                next_verification_allowed = NULL
            WHERE user_id = ?`,
            [rows[0].user_id],
        );

        username = rows[0].username;

        res.render("verify", {
            status: 200,
            name: username,
        });
    } catch (err) {
        console.log(err);
        res.status(500).sendFile(
            path.join(__dirname, `../../public/html/500.html`),
        );
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // db query
    const [rows] = await con.query(
        `
        SELECT *
        FROM users 
        WHERE email = ?`,
        [normalizedEmail],
    );

    // basic checks

    if (normalizedEmail.length === 0 || password.length === 0) {
        return res.json({
            success: false,
            error: true,
            message: "All input fields must be filled.",
        });
    }

    if (normalizedEmail.length > 100 || password.length > 100) {
        return res.json({
            success: false,
            error: true,
            message: "Input data is too large.",
        });
    }

    if (rows.length === 0) {
        return res.json({
            success: false,
            error: true,
            message: "Email or password is not correct.",
        });
    }

    // verify password
    try {
        isPasswordCorrect = await argon2.verify(rows[0].password, password);
    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            error: true,
            message: "Argon could not verify the password: contact support.",
        });
    }

    if (!isPasswordCorrect) {
        return res.json({
            success: false,
            error: true,
            message: "Email or password is not correct.",
        });
    } else {
        // check if email is verified
        if (rows[0].isVerified === 1) {
            // email is verified, password is okay, continue
            console.log(`Logged in as ${rows[0].username}`);

            const jwt_secret = process.env.JWT_SECRET;

            jwtPayload = {
                user_id: rows[0].user_id,
                username: rows[0].username,
                email: rows[0].email,
                plan: rows[0].plan,
            };

            // token signed, logged in.
            const token = jwt.sign(jwtPayload, jwt_secret, {
                expiresIn: "365d",
            });

            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
            });

            return res.json({
                success: true,
                error: false,
                message: `Logging in as ${rows[0].username}`,
                user_id: `${rows[0].user_id}`,
                username: `${rows[0].username}`,
                email: `${rows[0].email}`,
                plan: `${rows[0].plan}`,
                jwt_token: `${token}`,
                redirect_url: "/dashboard",
            });
        } else {
            try {
                // check if it has been 10 minutes since last time requesting email
                if (rows[0].next_verification_allowed < new Date(Date.now())) {
                    // generate new token
                    const verificationToken = crypto
                        .randomBytes(32)
                        .toString("hex");
                    const verificationExpires = new Date(
                        Date.now() + 1000 * 60 * 60,
                    ); // 1 hour
                    const nextVerificationAllowed = new Date(
                        Date.now() + 1000 * 60 * 5,
                    ); // 5 minutes

                    // store new updates and send email again
                    await con.query(
                        `
                        UPDATE users 
                        SET verification_token = ?, 
                        verification_expires = ?, 
                        next_verification_allowed = ? 
                        WHERE user_id = ${rows[0].user_id};`,
                        [
                            verificationToken,
                            verificationExpires,
                            nextVerificationAllowed,
                        ],
                    );

                    const verifyUrl = `http://${process.env.HOST}/api/auth/verify?token=${verificationToken}`;

                    const emailData = {
                        username: rows[0].username,
                        verifyUrl: verifyUrl,
                        hostname: process.env.HOST,
                    };

                    await ejs.renderFile(
                        emailTemplate,
                        emailData,
                        async (err, html) => {
                            if (err) {
                                return console.error(
                                    "Error rendering email template:",
                                    err,
                                );
                            }
                            await resend.emails.send({
                                from: "Cardel <support@cardel.app>",
                                to: normalizedEmail,
                                subject: "Verify your email",
                                html: html,
                            });
                        },
                    );

                    return res.json({
                        success: true,
                        error: false,
                        message:
                            "Verification link sent, please check your email.",
                    });
                } else {
                    return res.json({
                        success: false,
                        error: true,
                        message:
                            "You can only send one verification email every 5 minutes.",
                    });
                }
            } catch (err) {
                console.log(err);
                return res.json({
                    success: false,
                    error: true,
                    message: "Unknown error occured. Try again later.",
                });
            }
        }
    }
});

module.exports = router;
