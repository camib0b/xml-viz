"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var toggleSelectedTagCodes = require("../src/tagSelectionToggle.js").toggleSelectedTagCodes;

test("from none selected, checking one tag selects only that tag", function () {
  assert.deepEqual(toggleSelectedTagCodes([], "alpha", true), ["alpha"]);
});

test("from one selected, checking another keeps the first and adds the second", function () {
  assert.deepEqual(toggleSelectedTagCodes(["alpha"], "beta", true), ["alpha", "beta"]);
});

test("from all selected, unchecking one tag leaves the rest selected", function () {
  var allCodes = ["alpha", "beta", "gamma"];
  assert.deepEqual(toggleSelectedTagCodes(allCodes, "beta", false), ["alpha", "gamma"]);
});
