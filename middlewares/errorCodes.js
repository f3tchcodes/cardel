const path = require('path');
const htmlPath = "../public/html/";

const errorCodes = (req, res) => {
    res.status(404).sendFile(path.join(__dirname, `${htmlPath}404.html`));
    res.status(500).sendFile(path.join(__dirname, `${htmlPath}500.html`));
}

module.exports = errorCodes;