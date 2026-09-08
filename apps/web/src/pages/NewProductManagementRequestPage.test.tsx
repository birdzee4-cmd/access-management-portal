import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { NewProductManagementRequestPage } from "./NewProductManagementRequestPage.js";

const api = {
  countries: async () => ({ source: "MOCK" as const, countries: [] }),
  topics: async (country: string) => ({ source: "MOCK" as const, country, topics: [] }),
  form: async (country: string, topic: string) => ({ source: "MOCK" as const, country, topic, fields: [] }),
  lookup: async (lookup: string) => ({ source: "MOCK" as const, lookup, options: [] }),
  submit: async () => { throw new Error("Submission is not called during server rendering."); },
};

test("New Request starts with API loading and safe empty states without hardcoded master values", () => {
  const html = renderToStaticMarkup(<MemoryRouter><NewProductManagementRequestPage api={api} /></MemoryRouter>);
  assert.match(html, /Loading Product Management master data/);
  assert.match(html, /No countries available/);
  assert.match(html, /No topics available/);
  assert.doesNotMatch(html, /<option[^>]*>Thailand<\/option>|<option[^>]*>Vietnam<\/option>/);
  assert.match(html, /No production write/);
});
