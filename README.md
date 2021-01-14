# Node API Limiter

[![npm downloads](https://img.shields.io/npm/dm/node-api-limiter)](https://www.npmjs.com/package/node-api-limiter)

Basic API rate limiting middleware for the NodeJS server. It's used to limit the repeated requests to the public APIs within given time frame.

This module helps the user to limit their public APIs. Right now we are providing the support with the in memory store and redis store.

**Memory Store** : This is the by default store and it will save all the api-limiter data into the memory, As this is not the persistent storage whenever you restart your server data get purged.
**Redis Store** :  This is the persistent store it will never purge your data provides you the higher reliabilitiy on your rate limiting.

The initialization and integration of the module is pretty simple and you can follow the simple below steps to integrate it into your server.

## About
This module is just put the api rate limits on the public API of your server.It's provides the capability for the different time/window frame to limit your APIs, like secWindow for the number of requests to be served in given second window frame,minWindow for thr number of requests to be served in minute window and hrWindow to served the number of requests in hour time frame.
It allow us the capability to skips the particular server IP to not put the Api limits on and same at the server side as you don't want to put the API limits on a particular routes as well.


## Install

```sh
$ npm install --save node-api-limiter
```

## Usage

For an API server where the api-limiter should be applied to all requests and the store should be in memory:

```js
const apiLimiter = require("node-api-limiter");

// Enable if you're behind a reverse proxy (AWS ELB, Bluemix, Heroku, Nginx, etc)
// app.set('trust proxy', 1);

//  apply to all requests
app.use(apiLimiter({}));
```


For an API server where the api-limiter should be applied to all requests and the store should be in redis:

**Note:** redis store will require additional configuration, such as store url. The default built-in memory store is an exception to this rule.

```js
const apiLimiter = require("node-api-limiter");

//  apply to all requests
app.use(apiLimiter({
  "store": "redis",                      // It should be the type of the store redis in case you want to initiate redis store for presistent storage
  "redisUrl": "redis://localhost:6379"   // A mandatory param in case of the redis store and it's a complete url for the redis server.
}));
```

An Express example to integrate the apiLimiter middleware.

**index.js**
```js
const express = require("express")
const bodyParser = require("body-parser")
const apiLimiter = require("node-api-limiter");

const controllers = require("./controllers")

const PORT = process.env.PORT || 7777

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(apiLimiter({
      secWindow: 5, // seconds - how long to keep records of requests
      minWindow: 5, // minutes - how long to keep records of requests
      hrWindow: 1, // hours - how long to keep records of requests 
      maxReqSecWinodw: 5, // max number of recent connections during `window` seconds before sending a 429 response
      maxReqMinWinodw: 50, // max number of recent connections during `window` minutes before sending a 429 response
      maxReqHrWindow: 500, // max number of recent connections during `window` hours before sending a 429 response
      message: "Too many requests, please try again later.", // Message to send while limit reached.
      statusCode: 429, // 429 status = Too Many Requests (RFC 6585)
      headers: true, //Send custom rate limit header with limit and remaining
      skipFailRequests: false, // Do not count failed requests (status >= 400)
      skipSuccessRequests: false, // Do not count successful requests (status < 400)
      skipIps: [], // a list of IP addresses which you want to skip for the rate limiting.
      skipRoutes: [], // a list of routes and path addresses which you want to skip for the rate limiting.
      keyGenerator: (req, res) =>{ return req.ip }         // allows to create custom keys (by default user IP is used)
    }))
app.route("/start").get(controllers.start)
app.route("/stop").get(controllers.stop)

app.listen(PORT, () => {
    console.log(`server is running successfully on http://localhost:${PORT}`);
})
```

**controllers.js**
```js
module.exports.start = (req, res) => {
    res.status(200).send({
        message: "start successful"
    })
}

module.exports.stop = (req, res) => {
    res.status(200).send({
        message: "stop successful"
    })
}
```

## Request API

A `req.rateLimit` property is added to all requests with the `limit`, `current`, and `remaining` number of requests for each window and, if the store provides it, a `resetTime` Date object should be there. These may be help in your application code to take additional actions or inform the user of their status.

## Configuration options

### secWindow
It is a time frame for the seconds window for the number of requests to be served in the seconds time frame.
Defaults to `5` second. You can set to any number to increase/decrease it.

### maxReqSecWinodw
It is the number of the requests to be served within given `secWindow` time frame before sending a 429 response.
Defaults to `5` request. You can set to any number to increase/decrease it.

### minWindow
It is a time frame for the minutes window for the number of requests to be served in the minutes time frame.
Defaults to `5` minute. You can set to any number to increase/decrease it.

### maxReqMinWinodw
It is the number of the requests to be served within given `minWindow` time frame before sending a 429 response.
Defaults to `50` request. You can set to any number to increase/decrease it.

### hrWindow
It is a time frame for the hour window for the number of requests to be served in the hours time frame.
Defaults to `1` hour. You can set to any number to increase/decrease it.

### maxReqHrWindow
It is the number of the requests to be served within given `hrWindow` time frame before sending a 429 response.
Defaults to `500` request. You can set to any number to increase/decrease it.

### headers
It is a boolean `true/false`, used to sent the response headers of apiLimiter for current usage & remaining number of request.
Defaults set to `true`. You can set it to false to disable it.

### skipFailRequests
It is a boolean `true/false`, used to skip the failed requests consideration into the API limit usage.
Defaults set to `false`. You can set it to true to enable it.

### skipSuccessRequests
It is a boolean `true/false`, used to skip the success requests consideration into the API limit usage.
Defaults set to `false`. You can set it to true to enable it.

### skipIps
It is a Array object value which is used to skip the IP addresses, on which you do not want to put the api rate limits.
Defaults set to `[]`. You can pass the value as `['0.0.0.0','127.0.0.1']` to skips the particular IPs from the api rate limiter middleware. 

### skipRoutes
It is a Array object value which is used to skip the particular routes, on which you do not want to put the api rate limits.
Defaults set to `[]`. You can pass the value as `['/start','/stop']` to skips the particular routes from the api rate limiter middleware. 

### keyGenerator
It is the function used to generate the unique key for the server to maintain the API limits for a particular server.
Defaults function used the request IP address to maintain the api limit ledger for the server, you can pass your own custom function to generate the unique keys.

```js
const keyGenerator = (req, res) => {
  return req.ip
}
```
Addes the sample code for the keyGenerator function for the reference.


[Mohammad Zeeshan](https://github.com/zee7han/node-api-limiter)