const mysql = require("mysql2");
require("dotenv").config();

const db_host = process.env.DB_HOST;
const db_port = process.env.DB_PORT;
const db_user = process.env.DB_USER;
const db_name = process.env.DB_NAME;
const db_pass = process.env.DB_PASS;

const con = mysql
    .createPool({
        host: db_host,
        user: db_user,
        password: db_pass,
        database: db_name,
    })
    .promise();

console.log("Connected!");

module.exports = con;
