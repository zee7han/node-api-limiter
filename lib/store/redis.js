"use strict";

const redis = require("redis");
const hlpr = require("../helper")

function RedisStore(body) {
  const hits = body["conf"]["hash"] || "api_limiter::hits"

  this["resetTimeSecWindow"] = hlpr["calculateNextResetTime"](body["secWindow"]);
  this["resetTimeMinWindow"] = hlpr["calculateNextResetTime"](body["minWindow"]);
  this["resetTimeHourWindow"] = hlpr["calculateNextResetTime"](body["hrWindow"]);

  this["conf"] = body["conf"]

  this["windows"] = ["secWindow", "minWindow", "hrWindow"]


  this.initialize = function () {
    this["client"] = redis.createClient(this["conf"]['port'], this["conf"]['host']);
  
    this["client"].on('error', (err) => {
      console.log("[redis][connection error]", err)
    });
  
    this["client"].on('connect', (res) => {
      console.log(`[redis server running successfully on] ${this["conf"]['host']}:${this["conf"]['port']}`)
    });
  }
  
  this.incr = function (key, cb) {
    let current = {}
    let requests = this["windows"].map((window) => {
      return new Promise((resolve)=>{
        incrementKey(this["client"], key, window, current, resolve)
      })
    })
    Promise.all(requests).then(() =>{
      cb(null, current, {
        resetTimeSecWindow: this["resetTimeSecWindow"],
        resetTimeMinWindow: this["resetTimeMinWindow"],
        resetTimeHourWindow: this["resetTimeHourWindow"]
      })
    });
  }
  
  this.decrement = function (key) {
    this["windows"].forEach((window) => {
      this["client"]["hincrby"](hits, `${key}::${window}`, -1, (err, rs) => {
        if (err) {
          console.log("[RedisStore][decrement][hincrby][err]", err);
        }
      })
    })
  };
  
  this.resetWindow = function (windowType) {
    this["client"]["hgetall"](hits, (err, rs) => {
      if (err) {
          console.log(`[RedisStore][resetAll${windowType}][hgetall][err]`, err);
      } else {
          if (rs !== null && Object.keys(rs)["length"] > 0) {
              Object.keys(rs).forEach((key) => {
                  if (key.includes(windowType)) {
                      this["client"]["hset"](hits, key, 0, (err, rs) => {
                          if (err) {
                              console.log(`[RedisStore][resetAll${windowType}][hset][err]`, err);
                          }
                      })
                  }
              })
          }
      }
  })
    this[`resetTime${windowType}`] = hlpr["calculateNextResetTime"](body[windowType]);
  };
  
  this.resetKey = function (key) {
    this["windows"].forEach((window) => {
      this["client"]["hdel"](hits, `${key}::${window}`, (err, rs) => {
        if (err) {
          console.log("[RedisStore][resetKey][hdel][err]", err);
        }
      })
    })
  };

  const incrementKey = function (client, key, window, current, cb) {
    client["hincrby"](hits, `${key}::${window}`, 1, (err, rs) => {
      if (rs) {
        console.log("rs   ", rs);
        current[window] = rs
      }
      cb()
    })
  }

  this["windows"].forEach((window)=>{
    let intervalWindow = `${window}Interval`

    intervalWindow = setInterval(()=>{
      this["resetWindow"](window)
    }, body[window]);
    if (intervalWindow["unref"]) {
      console.log("intervalWindow  ", intervalWindow);
      intervalWindow["unref"]();
    }
  })

}

module.exports = RedisStore;