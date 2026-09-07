import assert from "node:assert/strict";
import test from "node:test";
import { portalRequestTypes } from "../dist/index.js";

test("portal request vocabulary is limited to M1 actions", () => {
  assert.deepEqual(portalRequestTypes, ["ADD", "REMOVE", "CHANGE"]);
});
