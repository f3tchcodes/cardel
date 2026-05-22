const multer = require("multer");

const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                error: "File is too large. The maximum limit is 5MB.",
            });
        }
    }

    if (err) {
        console.error("System Error:", err.message);
        return res.status(500).json({
            error: "An unexpected error occurred.",
        });
    }

    next();
};

module.exports = multerErrorHandler;
