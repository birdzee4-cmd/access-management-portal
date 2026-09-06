import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { act, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import type { PortalRole } from "../auth/types.js";
import { AuthContext } from "../auth/context.js";
import { PortalApplication, PortalView } from "../portal/PortalApplication.js";
import { visibleNavigation } from "../portal/navigation.js";
import { ResolutionWorkspacePage } from "./ResolutionWorkspacePage.js";

const noOperation = async () => undefined;
const forbidden = async (): Promise<never> => { throw new Error("Workspace must not call a legacy API."); };
const api = { getLegacyMatrixRows: forbidden, getLegacyMatrixSummary: forbidden,
  getLegacyUserRequests: forbidden, getLegacyUserRequestDetail: forbidden };
function portal(roles: readonly PortalRole[]) {
  return <MemoryRouter initialEntries={["/admin/resolution"]}><PortalView
    identity={{ authenticated: true, displayName: "Synthetic Admin", email: "", roles }}
    onSignOut={noOperation} api={api} /></MemoryRouter>;
}

async function withDom(element: ReactNode, run: (ui: {
  root: HTMLElement; choose: (label: string, value: string) => Promise<void>;
  click: (text: string) => Promise<void>; remount: () => Promise<void>;
}) => Promise<void>) {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
  const globals = new Map<string, PropertyDescriptor | undefined>();
  const replace = (key: string, value: unknown) => {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  };
  replace("window", dom.window); replace("document", dom.window.document);
  replace("HTMLElement", dom.window.HTMLElement); replace("IS_REACT_ACT_ENVIRONMENT", true);
  let networkCalls = 0;
  replace("fetch", () => { networkCalls++; throw new Error("No workspace network calls allowed."); });
  let storageCalls = 0;
  dom.window.Storage.prototype.setItem = () => { storageCalls++; throw new Error("No draft persistence allowed."); };
  dom.window.Storage.prototype.getItem = () => { storageCalls++; throw new Error("No draft persistence allowed."); };
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  let root = createRoot(container);
  const choose = async (label: string, value: string) => {
    const field = [...container.querySelectorAll("label")].find((item) => item.querySelector("span")?.textContent === label);
    const select = field?.querySelector("select");
    assert.ok(select, "Control not found: " + label);
    assert.ok([...select.options].some((option) => option.value === value));
    await act(async () => { select.value = value; select.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  };
  const click = async (text: string) => {
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent === text || item.querySelector("strong")?.textContent === text);
    assert.ok(button, "Button not found: " + text);
    await act(async () => button.click());
  };
  try {
    await act(async () => root.render(element));
    await run({ root: container, choose, click, remount: async () => {
      await act(async () => root.unmount()); root = createRoot(container);
      await act(async () => root.render(element));
    } });
    assert.equal(networkCalls, 0); assert.equal(storageCalls, 0);
    assert.equal(dom.window.document.cookie, "");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("Admin navigation and route display only bundled synthetic scenarios and safety labels", () => {
  assert.ok(visibleNavigation(["Admin"]).some((item) => item.path === "/admin/resolution"));
  const html = renderToStaticMarkup(portal(["Admin"]));
  for (const label of ["Resolution Workspace", "Candidate A", "Candidate E", "Synthetic Approver A", "ADMIN ONLY", "PREVIEW", "NOT SAVED", "SYNTHETIC DATA"]) assert.ok(html.includes(label));
  assert.match(html, /Preview only — changes are not saved/);
});

for (const role of ["Viewer", "Approver"] as const) {
  test(role + " cannot see navigation or access resolution contents directly", () => {
    assert.ok(!visibleNavigation([role]).some((item) => item.path === "/admin/resolution"));
    const html = renderToStaticMarkup(portal([role]));
    assert.match(html, /Page not available/);
    assert.doesNotMatch(html, /Candidate A|Synthetic Approver|Resolution Workspace/);
  });
}

test("unauthenticated resolution navigation follows existing Microsoft sign-in flow", async () => {
  let logins = 0;
  await withDom(<MemoryRouter initialEntries={["/admin/resolution"]}><AuthContext.Provider value={{
    state: "unauthenticated", user: null, login: async () => { logins++; }, logout: noOperation, getAccessToken: forbidden,
  }}><PortalApplication /></AuthContext.Provider></MemoryRouter>, async ({ root, click }) => {
    assert.ok(root.textContent?.includes("Sign in with Microsoft"));
    assert.ok(!root.textContent?.includes("Candidate A"));
    await click("Sign in with Microsoft");
    assert.equal(logins, 1);
  });
});

test("Admin can edit controls, validate, and reset an in-memory candidate", async () => {
  await withDom(portal(["Admin"]), async ({ root, choose, click }) => {
    assert.ok(root.textContent?.includes("NOT_READY"));
    for (const [label, value] of [["System", "SYS-DEMO"], ["Application", "APP-DEMO"], ["Role", "ROLE-DEMO-001"],
      ["Permission", "PERMISSION-DEMO-READ"], ["Access Context", "CONTEXT-DEMO-ALPHA"],
      ["Authoritative approver", "YES"], ["Identity resolution", "ENTRA_USER"], ["Approval mode", "ANY"],
      ["Role scope", "IN_SCOPE"], ["Department scope", "NOT_IN_SCOPE"], ["Source scope", "NOT_IN_SCOPE"], ["Context scope", "NOT_IN_SCOPE"]]) {
      await choose(label!, value!);
    }
    assert.ok(root.textContent?.includes("READY_FOR_REVIEW"));
    await click("Validate Preview");
    assert.ok(root.textContent?.includes("RESOLVED_FOR_PREVIEW"));
    await choose("System", "UNRESOLVED");
    assert.ok(root.textContent?.includes("NOT_READY"));
    await click("Reset candidate");
    assert.equal(root.querySelectorAll("select")[0]!.value, "UNRESOLVED");
    assert.ok(root.textContent?.includes("UNREVIEWED"));
  });
});

test("candidate switching retains only local drafts, reset all and remount discard them", async () => {
  await withDom(<ResolutionWorkspacePage />, async ({ root, choose, click, remount }) => {
    await choose("System", "SYS-DEMO");
    await click("Candidate B");
    assert.equal(root.querySelectorAll("select")[0]!.value, "UNRESOLVED");
    await choose("Application", "APP-DEMO");
    await click("Candidate A");
    assert.equal(root.querySelectorAll("select")[0]!.value, "SYS-DEMO");
    await click("Reset all preview data");
    assert.equal(root.querySelectorAll("select")[0]!.value, "UNRESOLVED");
    await click("Candidate B");
    assert.equal(root.querySelectorAll("select")[1]!.value, "UNRESOLVED");
    await choose("System", "SYS-DEMO");
    await remount();
    assert.equal(root.querySelectorAll("select")[0]!.value, "UNRESOLVED");
  });
});

test("explicit sequence controls appear only for SEQUENTIAL and start unresolved", async () => {
  await withDom(<ResolutionWorkspacePage />, async ({ root, choose, click }) => {
    await click("Candidate C");
    assert.equal(root.querySelector("fieldset"), null);
    await choose("Approval mode", "SEQUENTIAL");
    const sequenceSelects = root.querySelectorAll("fieldset select");
    assert.equal(sequenceSelects.length, 2);
    assert.ok([...sequenceSelects].every((select) => (select as HTMLSelectElement).value === ""));
    await choose("Position 1", "APPROVER-DEMO-D");
    await choose("Position 2", "APPROVER-DEMO-C");
    assert.ok(!root.textContent?.includes("Choose each synthetic approver exactly once"));
    await choose("Approval mode", "ALL");
    assert.equal(root.querySelector("fieldset"), null);
    await choose("Approval mode", "SEQUENTIAL");
    assert.ok([...root.querySelectorAll("fieldset select")].every((select) => (select as HTMLSelectElement).value === ""));
  });
});

test("collision and ambiguous-link fixtures display persistent blockers", async () => {
  await withDom(<ResolutionWorkspacePage />, async ({ root, click }) => {
    await click("Candidate D"); await click("Validate Preview");
    assert.ok(root.textContent?.includes("Catalog code collision requires a separate business decision"));
    assert.ok(root.textContent?.includes("BLOCKED"));
    await click("Candidate E");
    assert.ok(root.textContent?.includes("Catalog linkage is ambiguous"));
  });
});

test("workspace actions cannot save submit activate approve provision revoke import or sync", () => {
  const html = renderToStaticMarkup(<ResolutionWorkspacePage />);
  const dom = new JSDOM(html);
  const buttons = [...dom.window.document.querySelectorAll("button")].map((button) => button.textContent ?? "");
  assert.ok(buttons.every((text) => !/\b(Save|Submit|Publish|Activate|Approve|Provision|Revoke|Import|Sync)\b/i.test(text)));
  assert.equal(dom.window.document.querySelector("form"), null);
  dom.window.close();
});

test("new workspace modules contain no network, storage, backend or production data dependencies", () => {
  for (const relative of ["../pages/ResolutionWorkspacePage.tsx", "../resolution/model.ts", "../resolution/fixtures.ts"]) {
    const source = readFileSync(new URL("../../src/pages/" + relative, import.meta.url), "utf8");
    assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie|AuthApiClient|@access-portal\/connectors|@access-portal\/database|\/api\/|getLegacy|legacy-catalog-mapping|legacy-approval-mapping|\b(POST|PUT|PATCH|DELETE)\b/);
  }
});
