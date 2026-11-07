import { test } from "node:test";
import assert from "node:assert/strict";
import { findChunk } from "./icons.ts";

test("findChunk picks the last part whose start <= name", () => {
  const parts = [{ file: "a" }, { start: "camera", file: "b" }, { start: "lightbulb-o", file: "c" }];
  assert.equal(findChunk(parts, "account"), "a");
  assert.equal(findChunk(parts, "camera"), "b");
  assert.equal(findChunk(parts, "lightbulb"), "b");
  assert.equal(findChunk(parts, "lightbulb-off"), "c");
  assert.equal(findChunk(parts, "zzz"), "c");
});
