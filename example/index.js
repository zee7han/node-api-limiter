const express = require("express")
const bodyParser = require("body-parser")

const controllers = require("./controllers")
const api_limiter = require("../lib/main")

const PORT = process.env.PORT || 7777

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(api_limiter({
    secWindow: 1,
    minWindow: 1,
    maxSecWindow: 5,
    maxMinWindow: 10,
    skipRoutes: ["/start"],
    skipIps: [],
    skipFailRequests: true,
    skipSuccessRequests: false,
    store: "redis",
    redisConf: {
        host: "localhost",
        port: 6379
    }
}))
app.route("/start").get(controllers.start)
app.route("/stop").get(controllers.stop)

app.listen(PORT, () => {
    console.log(`server is running successfully on http://localhost:${PORT}`);
})