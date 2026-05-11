/*
PROJECT NAME: Cardel
VERSION: 1.0.0
RELEASE: BETA
DEVELOPER: f3tch
*/

require('module-alias/register');
require("dotenv").config();
require("@workers/subscriptions.js")

// importing libraries
const helmet = require('helmet');
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const path = require("path");



// variables
const express = require("express");
const app = express();
const jwtAuth = require("@middlewares/jwtAuth");



// ROUTES
// render view routes
const indexRVRoutes = require("@routes/indexRV");
const authenticatedIndexRVRoutes = require("@routes/authenticatedIndexRV")

// api routes
const authAPIRoutes = require("@routes/APIs/auth");
const userAPIRoutes = require("@routes/APIs/user");
const onboardingAPIRoutes = require("@routes/APIs/onboarding");
const subscriptionsAPIRoutes = require("@routes/APIs/user_subscriptions");



// custom middlewares
const multerErrorHandler = require("@middlewares/multerErrorHandler");
const invalidJSONFormat = require("@middlewares/invalidJSONFormat");
const errorCodes = require("@middlewares/errorCodes");



// middleware configurations
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per 10 minutes window on the API endpoints
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const sessionConf = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
})

const helmetConf = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'", "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js.map"],
    scriptSrc: ["'self'", "https://cdn.tailwindcss.com/"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"],
  },
})

const corsConf = cors({
  origin: "*",
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
})



// USE MIDDLEWARES
app.use(helmetConf);
app.use(corsConf);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionConf);
app.use(cookieParser());

app.use(invalidJSONFormat);

app.use(express.static("public"));



// VIEW ENGINES
app.set("view engine", "ejs");
app.set("views", path.resolve("views"));



// USE ROUTES
// use render view routes
app.use("/", indexRVRoutes);
app.use("/dashboard", jwtAuth);
app.use("/onboarding", jwtAuth);

app.use("/", authenticatedIndexRVRoutes);

// use api routes
app.use("/api/auth/", apiLimiter, authAPIRoutes);
app.use("/api/", apiLimiter, jwtAuth, userAPIRoutes);
app.use("/api/onboarding/", apiLimiter, jwtAuth, onboardingAPIRoutes);
app.use("/api/user/subscriptions/", apiLimiter, jwtAuth, subscriptionsAPIRoutes);


// error handlers
app.use(multerErrorHandler);
app.use(errorCodes);


// RUNNING THE SERVER
app.listen(process.env.PORT, () => {
    console.log(`Server has started on port ${process.env.PORT}`);
});
