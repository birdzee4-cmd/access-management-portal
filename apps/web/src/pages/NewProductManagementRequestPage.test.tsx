import type { ProductManagementLookupContext } from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import { NewProductManagementRequestPage } from "./NewProductManagementRequestPage.js";

const topics = [
  "Create New Account (ลูกค้าใหม่)",
  "เพิ่ม Email เข้า Account(ลูกค้า)",
  "เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)",
  "เพิ่ม App เข้า Account(ลูกค้า)",
  "ขอสิทธิ์เข้า Role(พนักงาน)",
  "เพิ่ม App เข้า Role(พนักงาน)",
  "เพิ่ม Permission เข้า Role(ลูกค้า)",
  "เพิ่ม Package Add On(ลูกค้า)",
  "Create New Role สำหรับ Account(ลูกค้า)",
  "เปลี่ยน Provider สำหรับ Account(ลูกค้า)",
  "Tranfer Owner Account(ลูกค้า)",
  "ลบ User ใน Account(ลูกค้า)",
  "ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account",
] as const;
const countries = ["Thailand", "Philippines", "Vietnam", "Malaysia", "Indonesia"] as const;
const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

const emptyApi = {
  countries: async () => ({ source: "MOCK" as const, countries: [] }),
  topics: async (country: string) => ({ source: "MOCK" as const, country, topics: [] }),
  form: async (country: string, topic: string) => ({ source: "MOCK" as const, country, topic, schema: { legacyScreenPattern: "Synthetic", legacyFormPattern: "Synthetic", lookupRequirements: [], implementationStatus: "PARTIAL" as const, partialReasons: ["UNKNOWN_SUBMISSION_MAPPING" as const] }, fields: [] }),
  lookup: async (lookup: string) => ({ source: "MOCK" as const, lookup, options: [] }),
  submit: async () => { throw new Error("Submission is not called during server rendering."); },
};

test("New Request starts with API loading and safe empty states without hardcoded master values", () => {
  const html = renderToStaticMarkup(<MemoryRouter><NewProductManagementRequestPage api={emptyApi} /></MemoryRouter>);
  assert.match(html, /Loading Product Management master data/);
  assert.match(html, /No countries available/);
  assert.match(html, /No topics available/);
  assert.doesNotMatch(html, /<option[^>]*>Thailand<\/option>|<option[^>]*>Vietnam<\/option>/);
  assert.match(html, /No production write/);
});

test("New Request renders five Countries, common Topics, partial schema state and Account dependent Role", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/requests/new" });
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalHTMLElement = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  const originalAct = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, "HTMLElement", { value: dom.window.HTMLElement, configurable: true });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });

  const topicCalls: string[] = [];
  const lookupCalls: Array<{ name: string; context: ProductManagementLookupContext }> = [];
  let submissions = 0;
  const api = {
    countries: async () => ({ source: "MOCK" as const, countries: options(countries) }),
    topics: async (country: string) => { topicCalls.push(country); return { source: "MOCK" as const, country, topics: options(topics) }; },
    form: async (country: string, topic: string) => ({
      source: "MOCK" as const,
      country,
      topic,
      schema: { legacyScreenPattern: "TH base; other {CC}_เพิ่ม Permission เข้า Role(ลูกค้า)_{CC}", legacyFormPattern: "Form* (DataSource: USR_PowerApp)", lookupRequirements: ["account", "customerRole"] as const, implementationStatus: "PARTIAL" as const, partialReasons: ["UNKNOWN_TEXT_LIST_FORMAT" as const] },
      fields: [
        { key: "account", label: "Account", required: false, type: "select" as const, lookup: "account" as const },
        { key: "customerRole", label: "Customer Role", required: false, type: "select" as const, lookup: "customerRole" as const, dependsOn: ["account"] },
      ],
    }),
    lookup: async (name: string, context: ProductManagementLookupContext) => {
      lookupCalls.push({ name, context });
      return { source: "MOCK" as const, lookup: name, options: name === "account" ? options([`${context.country} Synthetic Account`]) : options([`${context.country} Synthetic Customer Role`]) };
    },
    submit: async () => { submissions++; throw new Error("Partial schema must not submit."); },
  };

  const restore = (key: string, descriptor: PropertyDescriptor | undefined) => descriptor
    ? Object.defineProperty(globalThis, key, descriptor)
    : Reflect.deleteProperty(globalThis, key);
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const flush = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };
  const select = async (label: string, value: string) => {
    const control = [...container.querySelectorAll("label")].find((item) => item.querySelector("span")?.textContent === label)?.querySelector("select");
    assert.ok(control, `Missing ${label} select`);
    await act(async () => { control.value = value; control.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
    await flush();
  };

  try {
    await act(async () => root.render(<MemoryRouter><NewProductManagementRequestPage api={api} /></MemoryRouter>));
    await flush();
    const countrySelect = container.querySelector('select[aria-label="Country"]') as HTMLSelectElement;
    assert.deepEqual([...countrySelect.options].slice(1).map((item) => item.value), [...countries]);

    await select("Country", "Thailand");
    const topicSelect = container.querySelector('select[aria-label="Topic"]') as HTMLSelectElement;
    assert.deepEqual([...topicSelect.options].slice(1).map((item) => item.value), [...topics]);
    await select("Topic", topics[6]);
    assert.match(container.textContent ?? "", /This request type is being mapped/);
    const partialButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Schema mapping incomplete") as HTMLButtonElement;
    assert.ok(partialButton?.disabled);

    const roleSelect = [...container.querySelectorAll("label")].find((item) => item.querySelector("span")?.textContent === "Customer Role")?.querySelector("select") as HTMLSelectElement;
    assert.ok(roleSelect.disabled);
    await select("Account", "Thailand Synthetic Account");
    assert.equal(roleSelect.disabled, false);
    assert.ok([...roleSelect.options].some((item) => item.value === "Thailand Synthetic Customer Role"));
    assert.ok(lookupCalls.some((call) => call.name === "customerRole" && call.context.account === "Thailand Synthetic Account"));

    await select("Country", "Indonesia");
    assert.deepEqual([...topicSelect.options].slice(1).map((item) => item.value), [...topics]);
    assert.deepEqual(topicCalls, ["Thailand", "Indonesia"]);
    assert.equal(submissions, 0);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    restore("window", originalWindow);
    restore("document", originalDocument);
    restore("HTMLElement", originalHTMLElement);
    restore("IS_REACT_ACT_ENVIRONMENT", originalAct);
  }
});
