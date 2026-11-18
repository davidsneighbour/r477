import assert from "node:assert/strict";
import test from "node:test";
import { colourAt, parseRGB, renderFrames, validateConfig } from "../src/core.ts";

const base = { defaults: { fps: 10, duration: 1, width: 64, height: 64 }, clips: [{ name: "test", from: "#ff0000", to: "#0000ff" }] };

test("validates and normalises configuration", () => {
  const result = validateConfig(base);
  assert.equal(result.fps, 10);
  assert.deepEqual(result.clips[0]?.colours, ["#ff0000", "#0000ff"]);
});

test("rejects malformed colours", () => {
  assert.throws(() => validateConfig({ clips: [{ name: "invalid", from: "red", to: "#000000" }] }), /RGB hex colour/);
});

test("rejects unsafe and duplicate clip names", () => {
  assert.throws(() => validateConfig({ clips: [{ name: "../escape", from: "#000000", to: "#ffffff" }] }), /name/);
  assert.throws(() => validateConfig({ clips: [base.clips[0], base.clips[0]] }), /duplicate/);
});

test("rejects odd output dimensions", () => {
  assert.throws(() => validateConfig({ defaults: { width: 63 }, clips: base.clips }), /even/);
});

test("interpolates RGB stops", () => {
  const clip = validateConfig(base).clips[0]!;
  assert.deepEqual(colourAt(clip, 0), [255, 0, 0]);
  assert.deepEqual(colourAt(clip, 0.5), [128, 0, 128]);
  assert.deepEqual(colourAt(clip, 1), [0, 0, 255]);
});

test("supports multi-stop transitions and easing", () => {
  const clip = { name: "multi", colours: ["#ff0000", "#00ff00", "#0000ff"], duration: 1, easing: "ease-in-out" as const };
  assert.deepEqual(colourAt(clip, 0.5), [0, 255, 0]);
  assert.deepEqual(colourAt(clip, 0.125), [215, 40, 0]);
});

test("creates exactly the requested frame count", () => {
  const clip = validateConfig(base).clips[0]!;
  const frames = renderFrames(clip, 10);
  assert.equal(frames.length, 30);
  assert.deepEqual([...frames.subarray(0, 3)], parseRGB("#ff0000"));
  assert.deepEqual([...frames.subarray(-3)], parseRGB("#0000ff"));
});
