"use strict";

const redis = require("redis");
const hlpr = require("../helper")

function RedisStore(body) {
  this["resetTimeSecWindow"] = hlpr["calculateNextResetTime"](body["secWindow"]);
  this["resetTimeMinWindow"] = hlpr["calculateNextResetTime"](body["minWindow"]);
  this["resetTimeHourWindow"] = hlpr["calculateNextResetTime"](body["hrWindow"]);

  this["conf"] = body["conf"]

  this["hits"] = "api_limiter::hits"
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
        incrementKey(key, window, current)
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
      this["client"]["hincrby"](this["hits"], `${key}::${window}`, -1, (err, rs) => {
        if (err) {
          console.log("[RedisStore][decrement][hincrby][err]", err);
        }
      })
    })
  };
  
  this.resetAllWindow = function (windowType) {
    this["client"]["hgetall"](this["hits"], (err, rs) => {
      if (err) {
          console.log(`[RedisStore][resetAll${windowType}Window][hgetall][err]`, err);
      } else {
          if (rs !== null && Object.keys(rs)["length"] > 0) {
              Object.keys(rs).forEach((key) => {
                  if (key.includes(`${windowType}Window`)) {
                      this["client"]["hset"](this["hits"], key, 0, (err, rs) => {
                          if (err) {
                              console.log(`[RedisStore][resetAll${windowType}Window][hset][err]`, err);
                          }
                      })
                  }
              })
          }
      }
  })
    this[`resetTime${windowType}Window`] = hlpr["calculateNextResetTime"](body[`${windowType}Window`]);
  };
  
  this.resetKey = function (key) {
    this["windows"].forEach((window) => {
      this["client"]["hdel"](this["hits"], `${key}::${window}`, (err, rs) => {
        if (err) {
          console.log("[RedisStore][resetKey][hdel][err]", err);
        }
      })
    })
  };

  const incrementKey = function (key, window, current) {
    this["client"]["hincrby"](this["hits"], `${key}::${window}`, 1, (err, rs) => {
      if (rs) {
        current[window] = rs
      }
    })
  }
  
  const intervalSec = setInterval(()=>{
    this["resetAllWindow"]("sec")
  }, this["windows"]["secWindow"]);
  if (intervalSec["unref"]) {
    intervalSec["unref"]();
  }
  
  const intervalMin = setInterval(()=>{
    this["resetAllWindow"]("min")
  }, this["windows"]["minWindow"]);
  if (intervalMin["unref"]) {
    intervalMin["unref"]();
  }
  
  const intervalHr = setInterval(()=>{
    this["resetAllWindow"]("hr")
  }, this["windows"]["hrWindow"]);
  if (intervalHr["unref"]) {
    intervalHr["unref"]();
  }

}

module.exports = RedisStore;