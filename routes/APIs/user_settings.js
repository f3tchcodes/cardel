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
const iconUploadDir = path.join(__dirname, "../../public/media/pfp/");

if (!fs.existsSync(iconUploadDir)) {
    fs.mkdirSync(iconUploadDir);
}

const userSubIconsUpload = multer({
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
router.post("/profile", userSubIconsUpload.single("sub_icon"), async (req, res) => {

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
        const outputPath = path.join(iconUploadDir, secureFilename);

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


module.exports = router;
