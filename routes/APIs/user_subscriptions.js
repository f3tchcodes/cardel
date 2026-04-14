/*
ROUTE: /api/user/subscriptions/

ENDPOINTS: 
GET  -- /list
POST -- /toggle  -- (sub_id, enabled)
POST -- /add     -- (sub_name, sub_start, sub_rate, sub_billing)
*/

// importing libraries
require("dotenv").config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const multer = require("multer");
const sharp = require('sharp');

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// variables
const jwtAuth = require("../../middlewares/jwtAuth");
const con = require("../../database");

// multer configuration
const iconUploadDir = path.join(__dirname, '../../public/media/userSubIcons/');

if (!fs.existsSync(iconUploadDir)) {
    fs.mkdirSync(iconUploadDir);
}

const userSubIconsUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('INVALID_FILE_TYPE'));
        }
    }
});

// getting subscriptions list to put in dashboard
router.get("/list", async (req, res) => {
    try{
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch(err){
        console.log(err);
        return res.json({error: true, message: "JWT can't be verified, login again or contact us to fix."});
    }

    try {
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
            console.log(err);
            return res.json({error: true, message: "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email."});
        }
    } catch (err) {
        console.log(err);
        return res.json({error: true, message: "Error occured, request did not go through. Contact support to get help."});
    }

    try {
        [rowsSubList] = await con.query(`
            SELECT * 
            FROM users_subscriptions 
            WHERE user_id = ?;
            `, jwt_data.user_id);

        res.json(rowsSubList);
    } catch (err) {
        console.log(err);
        return res.json({error: true, message: "Error occured, request did not go through. Contact support to get help."});
    }
});

// disabling and enabling subscriptions
router.post("/toggle", async (req, res) => {
    try{
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch(err){
        console.log(err);
        return res.json({error: true, message: "JWT can't be verified, login again or contact us to fix."});
    }

    try {
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
            return res.json({error: true, message: "Either user does not exist or there are multiple users with this email, clear cookies and login again. If it does not work, contact us at our support email."});
        }
    } catch (err) {
        console.log(err);
        return res.json({error: true, message: "Error occured, request did not go through. Contact support to get help."});
    }

    const { sub_id, enabled } = req.body || {};

    if (sub_id === undefined || enabled === undefined) {
        return res.json({error: true, message: "sub_id or enabled not provided"});
    } else if (sub_id > 99999999999 || enabled >= 2 || enabled < 0) {
        return res.json({error: true, message: "Input data is false"});
    } else if (!Number.isInteger(sub_id) || !Number.isInteger(enabled)) {
        return res.json({error: true, message: "Input data is not integer"})
    }

    try {
        result = await con.query(`
            UPDATE users_subscriptions 
            SET enabled = ? 
            WHERE user_id = ? AND sub_id = ?;
            `, [enabled, jwt_data.user_id, sub_id]);

        console.log(result)

        if (result[0].affectedRows === 0) {
            return res.status(404).json({
                error: true,
                message: "Subscription not found"
            });
        }

        return res.status(200).json({
            success: "true",
            user_id: jwt_data.user_id,
            sub_id: sub_id,
            enabled: enabled
        });
    } catch (err) {
        console.log(err);
        return res.status(401).json({error: true, message: "Unidentified error occured"});
    }
});

router.post("/add", userSubIconsUpload.single('sub_icon'), async (req, res) => {

    try{
        jwt_data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch(err){
        console.log(err);
        return res.json({error: true, message: "JWT can't be verified, login again or contact us to fix."});
    }

    try {
        const { sub_name, sub_start, sub_rate, sub_billing } = req.body;
        console.log(sub_start)

        // check if all fields exist
        if (!sub_name || !sub_start || !sub_rate) {
            return res.status(400).json({ error: true, message:  'All fields (name, date, rate) are required.' });
        }

        // validate subscription name (prevent massive strings)
        const trimmedName = sub_name.trim();
        if (trimmedName.length === 0 || trimmedName.length > 50) {
            return res.status(400).json({ error: true, message:  'Subscription name must be between 1 and 50 characters.' });
        }

        // validate date
        const parsedDate = Date.parse(sub_start);
        if (isNaN(parsedDate)) {
            return res.status(400).json({ error: true, message:  'Invalid date format provided.' });
        }

        // validate rate (ensure it's a valid positive number)
        const rateNumber = parseFloat(sub_rate);
        if (isNaN(rateNumber) || rateNumber < 0 || rateNumber > 1000000) {
            return res.status(400).json({ error: true, message:  'Invalid subscription amount. Must be a positive number.' });
        }

        if (parsedDate > Date.now()) {
            return res.status(400).json({ error: true, message:  'Subscription start date cannot be in the future.' });
        }

        let secureFilename = "default.png";

        if (req.file) {
            secureFilename = `${crypto.randomBytes(16).toString('hex')}.webp`;
            const outputPath = path.join(iconUploadDir, secureFilename);

            await sharp(req.file.buffer)
                .resize({ width: 256, height: 256, fit: 'cover' })
                .toFormat('webp', { quality: 80 })
                .toFile(outputPath);
        }

        const secureFilenameComplete = `/media/userSubIcons/${secureFilename}`;
        console.log(secureFilename)

        try {
            await con.query(`
                INSERT INTO users_subscriptions (user_id, sub_icon, sub_name, sub_rate, subbed_at, sub_billing) VALUES
                (?, ?, ?, ?, ?, ?);`,
                [jwt_data.user_id, secureFilenameComplete, trimmedName, rateNumber, sub_start, sub_billing]);
        } catch (err) {
            res.status(500).json({status: 500, error: true, message: "Unknown error occured while running database query."})
            return console.log(err);
        }
        

        return res.status(200).json({
            status: true,
            message: 'Subscription added successfully!',
            data: {
                name: trimmedName,
                date: parsedDate,
                rate: rateNumber,
                sub_billing: sub_billing,
                iconPath: secureFilenameComplete
            }
        });

    } catch (error) {
        console.error('Subscription add error: ', error);

        if (error.message === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ error: true, message:  'Only JPG, PNG, and WebP images are allowed.' });
        }

        if (error.message.includes('Input buffer contains unsupported image format')) {
            return res.status(400).json({ error: true, message:  'Corrupted image or invalid image file signature detected.' });
        }

        return res.status(500).json({ status: 500, error: true, message: 'An internal server error occurred while processing the request.' });
    }
});

module.exports = router;