import { test } from "node:test";
import assert from "node:assert/strict";
import { SPAN, orderTiles, move, nextSize, sizeForSpan } from "./layout.ts";

const tiles = ["a", "b", "c", "d"].map((id) => ({ id }));

test("orderTiles puts saved order first and appends new tiles", () => {
  assert.deepEqual(orderTiles(tiles, { order: ["c", "a", "zzz"], sizes: {} }).map((t) => t.id), ["c", "a", "b", "d"]);
  assert.deepEqual(orderTiles(tiles, undefined).map((t) => t.id), ["a", "b", "c", "d"]);
});

test("move drops the dragged tile into the target slot", () => {
  assert.deepEqual(move(["a", "b", "c", "d"], "a", "c"), ["b", "c", "a", "d"]);
  assert.deepEqual(move(["a", "b", "c", "d"], "d", "a"), ["d", "a", "b", "c"]);
  assert.deepEqual(move(["a", "b", "c", "d"], "b", "b"), ["a", "b", "c", "d"]);
});

test("nextSize cycles 1×1, 2×1, 1×2, 2×2", () => {
  assert.equal(nextSize(undefined), "W");
  assert.equal(nextSize("W"), "M");
  assert.equal(nextSize("M"), "L");
  assert.equal(nextSize("L"), "S");
});

test("spans are 1×1, 2×1, 1×2, and 2×2", () => {
  assert.deepEqual(SPAN.S, [1, 1]);
  assert.deepEqual(SPAN.W, [2, 1]);
  assert.deepEqual(SPAN.M, [1, 2]);
  assert.deepEqual(SPAN.L, [2, 2]);
});

test("sizeForSpan maps a corner drag onto the four sizes", () => {
  assert.equal(sizeForSpan(1, 1), "S");
  assert.equal(sizeForSpan(1.4, 1.2), "S");
  assert.equal(sizeForSpan(2, 1), "W");
  assert.equal(sizeForSpan(1.6, 1.2), "W");
  assert.equal(sizeForSpan(1, 2), "M");
  assert.equal(sizeForSpan(1.1, 1.6), "M");
  assert.equal(sizeForSpan(2, 2), "L");
  assert.equal(sizeForSpan(1.6, 1.8), "L");
  assert.equal(sizeForSpan(0, -1), "S");
});
