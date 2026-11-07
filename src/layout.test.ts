import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTiles, move, nextSize } from "./layout.ts";

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

test("nextSize cycles S -> M -> L -> S", () => {
  assert.equal(nextSize(undefined), "M");
  assert.equal(nextSize("M"), "L");
  assert.equal(nextSize("L"), "S");
});
