"use strict";

const hlpr = require("../helper")

function MemoryStore(body) {
  let hits = {};
  let resetTimeSecWindow = hlpr["calculateNextResetTime"](body["secWindow"]);
  let resetTimeMinWindow = hlpr["calculateNextResetTime"](body["minWindow"]);
  let resetTimeHourWindow = hlpr["calculateNextResetTime"](body["hrWindow"]);

  this.incr = function (key, cb) {
    if (hits[key]) {
      hits[key]["secWindow"]++;
      hits[key]["minWindow"]++;
      hits[key]["hrWindow"]++;
    } else {
      hits[key] = {};
      hits[key]["secWindow"] = 1;
      hits[key]["minWindow"] = 1;
      hits[key]["hrWindow"] = 1;
    }

    cb(null, hits[key], {
      resetTimeSecWindow,
      resetTimeMinWindow,
      resetTimeHourWindow
    });
  };

  this.decrement = function (key) {
    if (hits[key]) {
      hits[key]["secWindow"]--;
      hits[key]["minWindow"]--;
      hits[key]["hrWindow"]--;
    }
  };

  this.resetAllSecWindow = function () {
    Object.keys(hits).forEach((key) => {
      hits[key]["secWindow"] = 0
    })
    resetTimeSecWindow = hlpr["calculateNextResetTime"](body["secWindow"]);
  };

  this.resetAllMinWindow = function () {
    Object.keys(hits).forEach((key) => {
      hits[key]["minWindow"] = 0
    })
    resetTimeMinWindow = hlpr["calculateNextResetTime"](body["minWindow"]);
  };

  this.resetAllHrWindow = function () {
    Object.keys(hits).forEach((key) => {
      hits[key]["hrWindow"] = 0
    })
    resetTimeHourWindow = hlpr["calculateNextResetTime"](body["hrWindow"]);
  };
  // export an API to allow hits from one IP to be reset
  this.resetKey = function (key) {
    delete hits[key];
  };


  const intervalSec = setInterval(this["resetAllSecWindow"], body["secWindow"]);
  if (intervalSec["unref"]) {
    intervalSec["unref"]();
  }

  const intervalMin = setInterval(this["resetAllMinWindow"], body["minWindow"]);
  if (intervalMin["unref"]) {
    intervalMin["unref"]();
  }

  const intervalHr = setInterval(this["resetAllHrWindow"], body["hrWindow"]);
  if (intervalHr["unref"]) {
    intervalHr["unref"]();
  }

}

module.exports = MemoryStore;