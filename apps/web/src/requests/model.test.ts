import assert from "node:assert/strict";
import test from "node:test";
import type { PortalCatalogRole } from "@access-portal/contracts";
import { emptyRequestDraft, toSubmission, validateDraft } from "./model.js";
const role = (id: string, systemId = "s1"): PortalCatalogRole => ({ id, systemId, systemCode: systemId, systemName: systemId,
  applicationId: null, applicationName: null, contextId: null, contextName: null, code: id, name: id });
const roles = [role("r1"), role("r2"), role("r3", "s2")];
test("draft validation covers ADD REMOVE CHANGE and same-system rules", () => {
  assert.deepEqual(validateDraft({ ...emptyRequestDraft, reason: "Business need", requestedRoleId: "r1" }, roles), []);
  assert.deepEqual(validateDraft({ ...emptyRequestDraft, requestType: "REMOVE", reason: "No longer needed", currentRoleId: "r1" }, roles), []);
  assert.deepEqual(validateDraft({ ...emptyRequestDraft, requestType: "CHANGE", reason: "Responsibilities changed", currentRoleId: "r1", requestedRoleId: "r2" }, roles), []);
  assert.match(validateDraft({ ...emptyRequestDraft, requestType: "CHANGE", reason: "Responsibilities changed", currentRoleId: "r1", requestedRoleId: "r3" }, roles).join(" "), /one Portal system/);
});
test("submission omits blank optional fields", () => {
  assert.deepEqual(toSubmission({ ...emptyRequestDraft, reason: " Business need ", requestedRoleId: "r1" }, "key"),
    { requestType: "ADD", reason: "Business need", requestedRoleId: "r1", idempotencyKey: "key" });
});
