import type { PortalAccessRequest } from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PortalRequestApiError } from "../requests/portalRequestApi.js";
import {
  normalizePortalRequestRouteId,
  portalRequestDetailErrorState,
  PortalRequestDetailView,
  type PortalRequestDetailViewState,
} from "./PortalRequestDetailPage.js";

const detail: PortalAccessRequest = {
  id: "00000000-0000-4000-8000-000000000101",
  requestNumber: "PR-000001",
  requestType: "CHANGE",
  reason: "Synthetic business reason for testing detail display.",
  status: "SUBMITTED",
  version: 1,
  submittedAt: "2026-09-07T00:00:00.000Z",
  effectiveDate: "2026-09-08",
  expirationDate: null,
  item: {
    action: "CHANGE",
    status: "PENDING",
    currentRole: { id: "00000000-0000-4000-8000-000000000201", systemId: "00000000-0000-4000-8000-000000000301", systemCode: "SYN", systemName: "Synthetic System", applicationId: null, applicationName: null, contextId: null, contextName: null, code: "READER", name: "Reader" },
    requestedRole: { id: "00000000-0000-4000-8000-000000000202", systemId: "00000000-0000-4000-8000-000000000301", systemCode: "SYN", systemName: "Synthetic System", applicationId: null, applicationName: null, contextId: null, contextName: "Synthetic Context", code: "CONTRIBUTOR", name: "Contributor" },
  },
};

function render(state: PortalRequestDetailViewState): string {
  return renderToStaticMarkup(<PortalRequestDetailView state={state} onBack={() => undefined} onRefresh={() => undefined} />);
}

test("Portal request detail renders only Portal-owned request information and safe actions", () => {
  const html = render({ kind: "success", detail });
  assert.match(html, /Request Detail/);
  assert.match(html, /CHANGE/);
  assert.match(html, /SUBMITTED/);
  assert.match(html, /PENDING/);
  assert.match(html, /Synthetic System · Reader/);
  assert.match(html, /Synthetic System · Contributor · Synthetic Context/);
  assert.match(html, /Synthetic business reason/);
  assert.match(html, />Back</);
  assert.match(html, />Refresh</);
  assert.doesNotMatch(html, /Approve|Cancel|Amend|Provision|Revoke|Delete/);
});

test("Portal request detail normalizes only UUID route identifiers", () => {
  assert.equal(normalizePortalRequestRouteId(detail.id.toUpperCase()), detail.id);
  for (const value of [undefined, "", "42", "not-a-uuid", "00000000-0000-4000-7000-000000000101"]) {
    assert.equal(normalizePortalRequestRouteId(value), null);
  }
});

test("Portal request detail displays safe state for expected API errors", () => {
  const expected: ReadonlyArray<readonly [number, PortalRequestDetailViewState["kind"], string]> = [
    [401, "unauthorized", "Authentication required"], [403, "forbidden", "Request unavailable"], [404, "not-found", "Request not found"], [503, "unavailable", "temporarily unavailable"], [500, "error", "Unable to display request"],
  ];
  for (const [status, kind, message] of expected) {
    const state = portalRequestDetailErrorState(new PortalRequestApiError(status, "synthetic"));
    assert.equal(state.kind, kind);
    assert.match(render(state), new RegExp(message));
  }
});
