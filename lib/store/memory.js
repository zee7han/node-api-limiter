"use strict";

const hlpr = require("../helper")

function MemoryStore(body) {
  let hits = {};
  this["windows"] = ["secWindow", "minWindow", "hrWindow"]

  this["resetTimesecWindow"] = hlpr["calculateNextResetTime"](body["secWindow"]);
  this["resetTimeminWindow"] = hlpr["calculateNextResetTime"](body["minWindow"]);
  this["resetTimehrWindow"] = hlpr["calculateNextResetTime"](body["hrWindow"]);

  this.incr = function (key, cb) {
    let current = {}
    this["windows"].forEach((window) => {
      if (hits[`${key}::${window}`]) {
        hits[`${key}::${window}`]++
        current[window] = hits[`${key}::${window}`]
      } else {
        hits[`${key}::${window}`] = 1
        current[window] = hits[`${key}::${window}`]
      }
    })

    cb(null, current, {
      resetTimeSecWindow: this["resetTimesecWindow"],
      resetTimeMinWindow: this["resetTimeminWindow"],
      resetTimeHourWindow: this["resetTimehrWindow"]
    });
  };

  this.decrement = function (key) {
    this["windows"].forEach((window) => {
      if (hits[`${key}::${window}`]) {
        hits[`${key}::${window}`]--
      }
    })
  };

  this.resetWindow = function (windowType) {
    if (hits && Object.keys(hits).length > 0) {
      Object.keys(hits).forEach((key) => {
        if (key.includes(windowType)) {
          hits[key] = 0
        }
      })
    }
  };

  // export an API to allow hits from one IP to be reset
  this.resetKey = function (key) {
    if (hits && Object.keys(hits).length > 0) {
      Object.keys(hits).forEach((windowKey) => {
        if (windowKey.includes(key)) {
          delete hits[windowKey]
        }
      })
    }
  };

  this["windows"].forEach((window) => {
    let intervalWindow = `${window}Interval`
    intervalWindow = setInterval(() => {
      this["resetWindow"](window)
    }, body[window]);
    if (intervalWindow["unref"]) {
      intervalWindow["unref"]();
    }
  })
}

module.exports = MemoryStore;