/*
    ROUTE: /api/user/subscriptions/

    ENDPOINTS: 
    GET    -- /list
    POST   -- /toggle  -- (sub_id, enabled)
    POST   -- /add     -- (sub_name, sub_start, sub_rate, sub_billing)
    DELETE -- /:sub_id -- (sub_id)
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
const con = require("@utils/database");
const { emailQueue } = require("@utils/queue");

// multer configuration
const iconUploadDir = path.join(__dirname, "../../public/media/userSubIcons/");

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

// calculating add subscriptions data
function calculateNextBillingDate(startDate, type, interval = 1) {
    const date = new Date(startDate);

    switch (type) {
        case "day":
            date.setDate(date.getDate() + interval);
            break;

        case "week":
            date.setDate(date.getDate() + 7 * interval);
            break;

        case "month": {
            const originalDay = date.getDate();

            date.setMonth(date.getMonth() + interval);

            if (date.getDate() !== originalDay) {
                date.setDate(0);
            }

            break;
        }

        case "year": {
            const originalMonth = date.getMonth();
            const originalDay = date.getDate();

            date.setFullYear(date.getFullYear() + interval);

            if (
                date.getMonth() !== originalMonth ||
                date.getDate() !== originalDay
            ) {
                date.setDate(0);
            }

            break;
        }

        default:
            throw new Error("Invalid billing type");
    }

    return date;
}

function advanceUntilFuture(subNext, type, interval = 1) {
    let next = new Date(subNext);
    const now = new Date();

    while (next <= now) {
        next = calculateNextBillingDate(next, type, interval);
    }

    return next;
}

// getting subscriptions list to put in dashboard
router.get("/list", async (req, res) => {
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
            console.log(err);
            return res.json({
                error: true,
                message:
                    "Refresh page!",
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

    try {
        [rowsSubList] = await con.query(
            `
            SELECT * 
            FROM users_subscriptions 
            WHERE user_id = ?;
            `,
            jwt_data.user_id,
        );

        for (const sub of rowsSubList) {
            const currentNext = new Date(sub.sub_next);

            if (currentNext <= new Date()) {
                const updatedNext = advanceUntilFuture(
                    sub.sub_next,
                    sub.sub_billing_type,
                    sub.sub_billing_interval,
                );

                sub.sub_next = updatedNext;

                await con.query(
                    `
                    UPDATE users_subscriptions
                    SET sub_next = ?
                    WHERE sub_id = ?
                `,
                    [updatedNext, sub.sub_id],
                );
            }
        }

        res.json(rowsSubList);
    } catch (err) {
        console.log(err);
        return res.json({
            error: true,
            message:
                "Error occured, request did not go through. Contact support to get help.",
        });
    }
});

// disabling and enabling subscriptions
router.post("/toggle", async (req, res) => {
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
                    "Refresh page!",
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

    const { sub_id, enabled } = req.body || {};

    if (sub_id === undefined || enabled === undefined) {
        return res.json({
            error: true,
            message: "sub_id or enabled not provided",
        });
    } else if (sub_id > 99999999999 || enabled >= 2 || enabled < 0) {
        return res.json({ error: true, message: "Input data is false" });
    } else if (!Number.isInteger(sub_id) || !Number.isInteger(enabled)) {
        return res.json({ error: true, message: "Input data is not integer" });
    }

    try {
        result = await con.query(
            `
            UPDATE users_subscriptions 
            SET enabled = ? 
            WHERE user_id = ? AND sub_id = ?;
            `,
            [enabled, jwt_data.user_id, sub_id],
        );

        if (result[0].affectedRows === 0) {
            return res.status(404).json({
                error: true,
                message: "Subscription not found",
            });
        }

        return res.status(200).json({
            success: "true",
            user_id: jwt_data.user_id,
            sub_id: sub_id,
            enabled: enabled,
        });
    } catch (err) {
        console.log(err);
        return res
            .status(401)
            .json({ error: true, message: "Unidentified error occured" });
    }
});

router.post("/add", userSubIconsUpload.single("sub_icon"), async (req, res) => {
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
                    "Refresh page!",
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

    try {
        const {
            sub_name,
            sub_start,
            sub_rate,
            sub_billing_type,
            sub_billing_interval,
            op,
            sub_id
        } = req.body;
        console.log(sub_start);

        const validTypes = ["day", "week", "month", "year"];

        if (!validTypes.includes(sub_billing_type)) {
            return res.status(400).json({
                error: true,
                message: "Invalid billing type.",
            });
        }

        const billingInterval = parseInt(sub_billing_interval);

        if (
            isNaN(billingInterval) ||
            billingInterval < 1 ||
            billingInterval > 100
        ) {
            return res.status(400).json({
                error: true,
                message: "Invalid billing interval.",
            });
        }

        // check if all fields exist
        if (!sub_name || !sub_start || !sub_rate) {
            return res.status(400).json({
                error: true,
                message: "All fields (name, date, rate) are required.",
            });
        }

        // validate subscription name (prevent massive strings)
        const trimmedName = sub_name.trim();
        if (trimmedName.length === 0 || trimmedName.length > 50) {
            return res.status(400).json({
                error: true,
                message:
                    "Subscription name must be between 1 and 50 characters.",
            });
        }

        // validate date
        const parsedDate = Date.parse(sub_start);
        if (isNaN(parsedDate)) {
            return res
                .status(400)
                .json({
                    error: true,
                    message: "Invalid date format provided.",
                });
        }

        // validate rate (ensure it's a valid positive number)
        const rateNumber = parseFloat(sub_rate);
        if (isNaN(rateNumber) || rateNumber < 0 || rateNumber > 1000000) {
            return res.status(400).json({
                error: true,
                message:
                    "Invalid subscription amount. Must be a positive number.",
            });
        }

        if (parsedDate > Date.now()) {
            return res.status(400).json({
                error: true,
                message: "Subscription start date cannot be in the future.",
            });
        }

        const nextBillingDate = calculateNextBillingDate(
            sub_start,
            sub_billing_type,
            billingInterval,
        );

        let secureFilename = "default.png";

        if (req.file) {
            secureFilename = `${crypto.randomBytes(16).toString("hex")}.webp`;
            const outputPath = path.join(iconUploadDir, secureFilename);

            await sharp(req.file.buffer)
                .resize({ width: 256, height: 256, fit: "cover" })
                .toFormat("webp", { quality: 80 })
                .toFile(outputPath);
        }

        const secureFilenameComplete = `/media/userSubIcons/${secureFilename}`;

        if (op === "create"){
            try {
                await con.query(
                    `
                    INSERT INTO users_subscriptions
                    (
                        user_id,
                        sub_icon,
                        sub_name,
                        sub_rate,
                        subbed_at,
                        sub_billing_type,
                        sub_billing_interval,
                        sub_next
                    ) VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        jwt_data.user_id,
                        secureFilenameComplete,
                        trimmedName,
                        rateNumber,
                        sub_start,
                        sub_billing_type,
                        billingInterval,
                        nextBillingDate,
                    ],
                );

                [[subData]] = await con.query(
                    `
                    SELECT sub_id, sub_next
                    FROM users_subscriptions 
                    WHERE user_id = ?
                    ORDER BY sub_id DESC 
                    LIMIT 1`,
                    [jwt_data.user_id],
                );

                // scheduling emails
                const date = new Date(subData.sub_next);
                const targetTimeMs = date.getTime();
                const nowMs = Date.now();
                const delayMs = Number(targetTimeMs) - Number(nowMs);

                const oneDayMs = 86400000;
                const delayMs1D = delayMs - oneDayMs;
                const delayMs3D = delayMs - 3 * oneDayMs;

                if (delayMs < 0) {
                    return res.status(500).json({
                        status: 500,
                        error: true,
                        message: "Wait a few minutes and try again!",
                    });
                }
                
                // scheduling final renewal email
                await emailQueue.add(
                    "send-sub-renewal-email",
                    { subscriptionId: subData.sub_id },
                    {
                        delay: delayMs,
                        jobId: `sub_${subData.sub_id}`,
                    },
                );

                // scheduling email 1 day before renewal
                if (delayMs1D > 0) {
                    await emailQueue.add(
                        "send-sub-update-email",
                        { subscriptionId: subData.sub_id },
                        {
                            delay: delayMs1D,
                            jobId: `sub_${subData.sub_id}_1`,
                        },
                    );
                    console.log(`delayMs: ${delayMs}`);
                    console.log(`delayMs1D: ${delayMs1D}`);
                    console.log(`delayMs+oneDayMs: ${delayMs + oneDayMs}`);
                    console.log(`sub_${subData.sub_id}_1 added`);
                    console.log("-------------");
                }

                // scheduling email 3 days before renewal
                if (delayMs3D > 0) {
                    await emailQueue.add(
                        "send-sub-update-email",
                        { subscriptionId: subData.sub_id },
                        {
                            delay: delayMs3D,
                            jobId: `sub_${subData.sub_id}_3`,
                        },
                    );
                    console.log(`delayMs: ${delayMs}`);
                    console.log(`delayMs3D: ${delayMs3D}`);
                    console.log(`delayMs+3*oneDayMs: ${delayMs + 3 * oneDayMs}`);
                    console.log(`sub_${subData.sub_id}_3 added`);
                    console.log("-------------");
                }
            } catch (err) {
                res.status(500).json({
                    status: 500,
                    error: true,
                    message: "Unknown error occured while running database query.",
                });
                return console.log(err);
            }

            return res.status(200).json({
                status: true,
                message: "Subscription added successfully!",
                data: {
                    sub_id: subData.sub_id,
                    name: trimmedName,
                    date: parsedDate,
                    rate: rateNumber,
                    sub_billing_type,
                    sub_billing_interval: billingInterval,
                    next_billing: nextBillingDate,
                    iconPath: secureFilenameComplete,
                },
            });
        } else if (op === "edit") {
            try {
                const [subData] = await con.query(
                `
                    SELECT *
                    FROM users_subscriptions 
                    WHERE sub_id = ?
                `, [
                    sub_id
                ]);

                // check whether or not the subscription exists
                if (subData.length === 0) {
                    return res.status(404).json({
                        error: true,
                        message: "Subscription not found"
                    });
                }

                if (subData[0].user_id !== jwt_data.user_id) {
                    return res.status(401).json({
                        error: true,
                        message: "Unauthenticated user!"
                    })
                }

                const change = await con.query(
                    `
                    UPDATE users_subscriptions SET
                        user_id = ?,
                        sub_icon = ?,
                        sub_name = ?,
                        sub_rate = ?,
                        subbed_at = ?,
                        sub_billing_type = ?,
                        sub_billing_interval = ?,
                        sub_next = ?
                    WHERE sub_id = ?
                    ;`,
                    [
                        jwt_data.user_id,
                        secureFilenameComplete,
                        trimmedName,
                        rateNumber,
                        sub_start,
                        sub_billing_type,
                        billingInterval,
                        nextBillingDate,
                        sub_id
                    ],
                );

                [[subData]] = await con.query(
                    `
                    SELECT sub_id, sub_next
                    FROM users_subscriptions 
                    WHERE user_id = ?
                    ORDER BY sub_id DESC 
                    LIMIT 1`,
                    [jwt_data.user_id],
                );

                // removing old queue
                await emailQueue.remove(`sub_${subData.sub_id}`)

                // scheduling emails
                const date = new Date(subData.sub_next);
                const targetTimeMs = date.getTime();
                const nowMs = Date.now();
                const delayMs = Number(targetTimeMs) - Number(nowMs);

                const oneDayMs = 86400000;
                const delayMs1D = delayMs - oneDayMs;
                const delayMs3D = delayMs - 3 * oneDayMs;

                if (delayMs < 0)
                    return res.status(500).json({
                        status: 500,
                        error: true,
                        message: "Wait a few minutes and try again!",
                    });

                // scheduling final renewal email
                await emailQueue.add(
                    "send-sub-renewal-email",
                    { subscriptionId: subData.sub_id },
                    {
                        delay: delayMs,
                        jobId: `sub_${subData.sub_id}`,
                    },
                );

                // scheduling email 1 day before renewal
                if (delayMs1D > 0) {
                    await emailQueue.add(
                        "send-sub-update-email",
                        { subscriptionId: subData.sub_id },
                        {
                            delay: delayMs1D,
                            jobId: `sub_${subData.sub_id}_1`,
                        },
                    );
                    console.log(`delayMs: ${delayMs}`);
                    console.log(`delayMs1D: ${delayMs1D}`);
                    console.log(`delayMs+oneDayMs: ${delayMs + oneDayMs}`);
                    console.log(`sub_${subData.sub_id}_1 added`);
                    console.log("-------------");
                }

                // scheduling email 3 days before renewal
                if (delayMs3D > 0) {
                    await emailQueue.add(
                        "send-sub-update-email",
                        { subscriptionId: subData.sub_id },
                        {
                            delay: delayMs3D,
                            jobId: `sub_${subData.sub_id}_3`,
                        },
                    );
                    console.log(`delayMs: ${delayMs}`);
                    console.log(`delayMs3D: ${delayMs3D}`);
                    console.log(`delayMs+3*oneDayMs: ${delayMs + 3 * oneDayMs}`);
                    console.log(`sub_${subData.sub_id}_3 added`);
                    console.log("-------------");
                }
            } catch (err) {
                res.status(500).json({
                    status: 500,
                    error: true,
                    message: "Unknown error occured while running database query.",
                });
                return console.log(err);
            }

            return res.status(200).json({
                status: true,
                message: "Subscription edited successfully!",
                data: {
                    sub_id: subData.sub_id,
                    name: trimmedName,
                    date: parsedDate,
                    rate: rateNumber,
                    sub_billing_type,
                    sub_billing_interval: billingInterval,
                    next_billing: nextBillingDate,
                    iconPath: secureFilenameComplete,
                },
            });

        } else {
            return res.status(404).json({
                error: true,
                message: "Unknown option"
            })
        }
    } catch (error) {
        console.error("Subscription add error: ", error);

        if (error.message === "INVALID_FILE_TYPE") {
            return res.status(400).json({
                error: true,
                message: "Only JPG, PNG, and WebP images are allowed.",
            });
        }

        if (
            error.message.includes(
                "Input buffer contains unsupported image format",
            )
        ) {
            return res.status(400).json({
                error: true,
                message:
                    "Corrupted image or invalid image file signature detected.",
            });
        }

        return res.status(500).json({
            status: 500,
            error: true,
            message:
                "An internal server error occurred while processing the request.",
        });
    }
});

router.delete("/:sub_id", async (req, res) => {

    let jwt_data;

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
            console.log(err);
            return res.json({
                error: true,
                message:
                    "Refresh page!",
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

    try {
        const sub_id = req.params.sub_id;
        
        const [[subData]] = await con.query(`SELECT * FROM users_subscriptions WHERE sub_id = ?`, [sub_id])
        if (subData.user_id !== jwt_data.user_id) {
            return res.status(401).json({
                error: true,
                message: "Unauthenticated user!"
            })
        }

        const deleteQuery = await con.query(`
            DELETE FROM
            users_subscriptions WHERE 
            sub_id = ?`,
            [sub_id]);

        if (deleteQuery.affectedRows === 0) {
            return res.status(404).json({
                error: true,
                message: "Subscription not found",
            });
        } else {
            return res.status(200).json({
                status: true,
                message: `The subscription ${sub_id} has been deleted successfully!`,
            });
        }
    } catch (err) {
        return res.json({
            error: true,
            message:
                "Error occured, request did not go through. Contact support to get help.",
        });
    }
});

module.exports = router;
