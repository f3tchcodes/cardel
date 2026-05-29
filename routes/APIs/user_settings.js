/*
    ROUTE: /api/user/settings/

    ENDPOINTS: 
    POST -- /profile -- (file, username)
    POST -- /account -- (email, current_password, new_password)
*/

// importing libraries
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");

const multer = require("multer");
const sharp = require("sharp");

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// utils and middlewares
const jwtAuth = require("@middlewares/jwtAuth");
const con = require("@utils/database");
const { emailQueue } = require("@utils/queue");

// multer configuration
const pfpUploadDir = path.join(__dirname, "../../public/media/pfp/");

if (!fs.existsSync(pfpUploadDir)) {
    fs.mkdirSync(pfpUploadDir);
}

const userPfpUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("INVALID_FILE_TYPE"));
        }
    },
});

// POST request to /profile
router.post("/profile", userPfpUpload.single("sub_icon"), async (req, res) => {

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
            return res.json({
                error: true,
                message:
                    "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email.",
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

    const { username } = req.body;

    if (username.length > 50) {
        return res.status(400).json({
            error: true,
            message: "Input data is too large."
        })
    }

    let secureFilename = "default.png";
    
    if (req.file) {
        secureFilename = `${crypto.randomBytes(16).toString("hex")}.webp`;
        const outputPath = path.join(pfpUploadDir, secureFilename);

        await sharp(req.file.buffer)
            .resize({ width: 256, height: 256, fit: "cover" })
            .toFormat("webp", { quality: 80 })
            .toFile(outputPath);
    }

    const secureFilenameComplete = `/media/pfp/${secureFilename}`; 

    try {
        const [results] = await con.query(
            `
            UPDATE users SET
            username = ?,
            pfp_path = ?
            WHERE user_id = ?
            `,
            [username, secureFilenameComplete, jwt_data.user_id]
        );

        if (results.affectedRows !== 1) {
            return res.status(200).json({
                error: true,
                message: "Error occured! Could not update your details."
            });
        }
    } catch(err) {
        res.status(500).json({
            status: 500,
            error: true,
            message: "Unknown error occured while running database query.",
        });
        return console.log(err);
    }

    return res.status(200).json({
        status: true,
        message: "Successfully updated the account!"
    });

});

router.post("/account", async (req, res) => {
    try {
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err);
        return res.json({
            error: true,
            message: "JWT can't be verified, login again or contact us to fix.",
        });
    }

    let rows1;

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
            return res.json({
                error: true,
                message:
                    "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email.",
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

    const user = rows1[0];

    const current_password = req.body.current_password ?? "";
    const new_password = req.body.new_password ?? "";
    
    // email validation
    const normalizedEmail = req.body.account_email?.toLowerCase().trim() ?? "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (normalizedEmail.length > 0 && normalizedEmail !== user.email) {
        // basic checks of email

        if (normalizedEmail.length > 100) {
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

        // duplicate email check

        try {
            const [existingUser] = await con.query(
                `
                SELECT user_id
                FROM users 
                WHERE email = ? 
                LIMIT 1;
                `,
                [normalizedEmail]
            );

            if (existingUser.length > 0) {
                return res.json({
                    success: false,
                    error: true,
                    message: "This email address is already in use by another account.",
                });
            }
        } catch (dbErr) {
            console.log(dbErr);
            return res.json({
                success: false,
                error: true,
                message: "Database error verifying email availability.",
            });
        }

        // update email

        const [emailResults] = await con.query(
            `
            UPDATE users
            SET email = ?
            WHERE user_id = ?
            `,
            [normalizedEmail, jwt_data.user_id]
        )

        if (emailResults.affectedRows === 0){
            return res.json({
                success: false,
                error: true,
                message: "Error occured. Email has not been updated!"
            })
        }
    }

    // password verification and validation
    if (current_password.length > 0 || new_password.length > 0) {
        let isPasswordCorrect;

        // password verification
        try {
            isPasswordCorrect = await argon2.verify(user.password, current_password);
        } catch (err) {
            console.log(err);
            return res.json({
                success: false,
                error: true,
                message: "Argon could not verify the password: contact support.",
            });
        }

        if (!isPasswordCorrect) {
            // password is not correct
            return res.json({
                success: false,
                error: true,
                message: "Current password is not correct!",
            });
        } else {
            // password has been verified, continue from here
            // password validation
            if (new_password.trim().length < 8) {
                return res.json({
                    success: false,
                    error: true,
                    message: "Password must be 8 or more characters.",
                });
            }

            if (new_password.trim().length > 50) {
                return res.json({
                    success: false,
                    error: true,
                    message: "Password must be lower than 50 characters.",
                });
            }

            const hashed_password = await argon2.hash(new_password);
            
            const [passwordResults] = await con.query(
                `
                UPDATE users
                SET password = ?
                WHERE user_id = ?
                `,
                [hashed_password, jwt_data.user_id]
            );

            if (passwordResults.affectedRows === 0){
                return res.json({
                    success: false,
                    error: true,
                    message: "Error occured. Password has not been updated!"
                })
            }
        }
    }

    return res.status(200).json({
        success: true,
        message: "Account settings updated successfully!"
    })
});


module.exports = router;
