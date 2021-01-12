"use strict";
const MemoryStore = require("./store/memory");
const RedisStore = require("./store/redis");
const hlpr = require("./helper");

function ApiLimiter(opts) {
  opts = Object.assign({
      secWindow: 5, // seconds - how long to keep records of requests in memory
      minWindow: 5, // minutes - how long to keep records of requests in memory
      hrWindow: 1, // hours - how long to keep records of requests in memory
      maxSecWindow: 5, // max number of recent connections during `window` seconds before sending a 429 response
      maxMinWindow: 50, // max number of recent connections during `window` minutes before sending a 429 response
      maxHrWindow: 500, // max number of recent connections during `window` hours before sending a 429 response
      message: "Too many requests, please try again later.",
      statusCode: 429, // 429 status = Too Many Requests (RFC 6585)
      headers: true, //Send custom rate limit header with limit and remaining
      draft_polli_ratelimit_headers: false, //Support for the new RateLimit standardization headers
      skipFailRequests: false, // Do not count failed requests (status >= 400)
      skipSuccessRequests: false, // Do not count successful requests (status < 400)
      skipIps: [], // a list of IP addresses which you want to skip for the rate limiting.
      skipRoutes: [], // a list of routes and path addresses which you want to skip for the rate limiting.
      // allows to create custom keys (by default user IP is used)
      keyGenerator: hlpr["key_gnrtr"],
      handler: hlpr["rs_hndlr"],
      onLimitReached: hlpr["lmt_rchd"]
    },
    opts
  );

  opts["secWindow"] = opts["secWindow"] * 1000
  opts["minWindow"] = opts["minWindow"] * 60 * 1000
  opts["hrWindow"] = opts["hrWindow"] * 60 * 60 * 1000

  // store to use for persisting rate limit data
  if (opts["store"] && opts["store"] === "redis") {
    if (opts["redisConf"] && opts["redisConf"]["host"] && opts["redisConf"]["port"]) {
      opts["store"] = new RedisStore({
        secWindow: opts["secWindow"],
        minWindow: opts["minWindow"],
        hrWindow: opts["hrWindow"],
        conf: opts["redisConf"]
      });
      opts["store"]["initialize"]()
    } else {
      throw new Error("Pass the valid config for the redis store.");
    }
  } else {
    opts["store"] = new MemoryStore({
      secWindow: opts["secWindow"],
      minWindow: opts["minWindow"],
      hrWindow: opts["hrWindow"]
    });
  }

  function rateLimit(req, res, next) {
    const skpd_ip = hlpr["skip_ip"](req, opts["skipIps"])
    const skpd_route = hlpr["skip_route"](req, opts["skipRoutes"])
    if (skpd_ip || skpd_route) {
      return next()
    } else {
      const key = opts["keyGenerator"](req, res);

      opts["store"]["incr"](key, function (err, current, resetTime) {
        if (err) {
          return next(err);
        } else {
          req.rateLimit = {
            limit: {
              secWindow: opts["maxSecWindow"],
              minWindow: opts["maxMinWindow"],
              hrWindow: opts["maxHrWindow"]
            },
            remaining: {
              secWindow: Math.max(opts["maxSecWindow"] - current["secWindow"], 0),
              minWindow: Math.max(opts["maxMinWindow"] - current["minWindow"], 0),
              hrWindow: Math.max(opts["maxHrWindow"] - current["hrWindow"], 0)
            },
            current,
            resetTime
          };

          if (opts["headers"] && !res["headersSent"]) {
            res.setHeader("X-RateLimit-Limit-Sec", opts["maxSecWindow"]);
            res.setHeader("X-RateLimit-Remaining-Sec", req["rateLimit"]["remaining"]["secWindow"]);

            res.setHeader("X-RateLimit-Limit-Min", opts["maxMinWindow"]);
            res.setHeader("X-RateLimit-Remaining-Min", req["rateLimit"]["remaining"]["minWindow"]);

            res.setHeader("X-RateLimit-Limit-Hr", opts["maxHrWindow"]);
            res.setHeader("X-RateLimit-Remaining-Hr", req["rateLimit"]["remaining"]["hrWindow"]);

            if ((resetTime["resetTimeSecWindow"] instanceof Date) && (resetTime["resetTimeMinWindow"] instanceof Date) && (resetTime["resetTimeHourWindow"] instanceof Date)) {
              // if we have a resetTime, also provide the current date to help avoid issues with incorrect clocks
              res.setHeader("Date", new Date().toGMTString());
              res.setHeader("X-SecRateLimit-Reset", Math.ceil(resetTime["resetTimeSecWindow"].getTime() / 1000));
              res.setHeader("X-MinRateLimit-Reset", Math.ceil(resetTime["resetTimeMinWindow"].getTime() / 1000));
              res.setHeader("X-HrRateLimit-Reset", Math.ceil(resetTime["resetTimeHourWindow"].getTime() / 1000));

            }
          }
          if (opts["skipFailRequests"] || opts["skipSuccessRequests"]) {
            let decremented = false;
            const decrementKey = () => {
              if (!decremented) {
                opts.store.decrement(key);
                decremented = true;
              }
            };

            if (opts["skipFailRequests"]) {
              res.on("finish", function () {
                if (res["statusCode"] >= 400) {
                  decrementKey();
                }
              });

              res.on("close", () => {
                if (!res["finished"]) {
                  decrementKey();
                }
              });

              res.on("error", () => decrementKey());
            }

            if (opts["skipSuccessRequests"]) {
              res.on("finish", function () {
                if (res["statusCode"] < 400) {
                  opts["store"]["decrement"](key);
                }
              });
            }
          }

          if ((current["secWindow"] === opts["maxSecWindow"] + 1) || (current["minWindow"] === opts["maxMinWindow"] + 1) || (current["hrWindow"] === opts["maxHrWindow"] + 1)) {
            opts["onLimitReached"](req, res, opts);
          }

          let retry_time = 0

          if (current["secWindow"] > opts["maxSecWindow"]) {
            retry_time = Math.ceil(opts["secWindow"] / 1000)
          } else if (current["minWindow"] > opts["maxMinWindow"]) {
            retry_time = Math.ceil(opts["minWindow"] / 1000)
          } else if (current["hrWindow"] > opts["maxHrWindow"]) {
            retry_time = Math.ceil(opts["hrWindow"] / 1000)
          }

          if (retry_time > 0) {
            if (opts["headers"] && !res["headersSent"]) {
              res.setHeader(
                "Retry-After",
                retry_time
              );
            }
            return opts.handler(res, {
              statusCode: opts["statusCode"],
              message: opts["message"]
            });
          } else {
            next();
          }
        }
      });
    }

  }

  rateLimit["resetKey"] = opts["store"]["resetKey"].bind(opts["store"]);

  // Backward compatibility function
  rateLimit["resetIp"] = rateLimit["resetKey"];

  return rateLimit;
}

module.exports = ApiLimiter;