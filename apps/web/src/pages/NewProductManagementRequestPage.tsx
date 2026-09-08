import type { ProductManagementFormDefinition, ProductManagementOption } from "@access-portal/contracts";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import type { ProductManagementApiClient } from "../requests/productManagementApi.js";

type Api = Pick<ProductManagementApiClient, "countries" | "topics" | "form" | "lookup" | "submit">;

export function NewProductManagementRequestPage({ api }: { readonly api: Api }) {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<readonly ProductManagementOption[]>([]);
  const [topics, setTopics] = useState<readonly ProductManagementOption[]>([]);
  const [country, setCountry] = useState("");
  const [topic, setTopic] = useState("");
  const [form, setForm] = useState<ProductManagementFormDefinition | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [lookups, setLookups] = useState<Record<string, readonly ProductManagementOption[]>>({});
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true; setState("loading");
    api.countries().then((response) => { if (active) { setCountries(response.countries); setState("ready"); } }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [api, reload]);

  useEffect(() => {
    setTopic(""); setTopics([]); setForm(null); setFields({}); setLookups({});
    if (!country) return;
    let active = true; setState("loading");
    api.topics(country).then((response) => { if (active) { setTopics(response.topics); setState("ready"); } }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [api, country, reload]);

  useEffect(() => {
    setForm(null); setFields({}); setLookups({});
    if (!country || !topic) return;
    let active = true; setState("loading");
    api.form(country, topic).then((response) => { if (active) { setForm(response); setState("ready"); } }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [api, country, topic, reload]);

  const context = useMemo(() => ({ country, topic, providerType: fields.providerType, package: fields.package, appName: fields.appName }), [country, topic, fields.providerType, fields.package, fields.appName]);
  const loadLookup = useCallback((key: string, lookup: string) => {
    setState("loading");
    api.lookup(lookup, context).then((response) => { setLookups((current) => ({ ...current, [key]: response.options })); setState("ready"); }).catch(() => setState("error"));
  }, [api, context, reload]);

  useEffect(() => {
    if (!form) return;
    for (const field of form.fields) {
      if (!field.lookup || field.dependsOn?.length) continue;
      void loadLookup(field.key, field.lookup);
    }
  }, [form, loadLookup]);

  const changeField = (key: string, value: string) => {
    setFields((current) => {
      const next = { ...current, [key]: value };
      if (key === "providerType") { delete next.package; delete next.packageAddOn; delete next.appName; delete next.account; delete next.role; }
      if (key === "package") { delete next.packageAddOn; delete next.appName; delete next.account; delete next.role; }
      if (key === "appName") { delete next.account; delete next.role; }
      return next;
    });
    setLookups((current) => {
      const next = { ...current };
      for (const field of form?.fields ?? []) if (field.dependsOn?.includes(key)) delete next[field.key];
      return next;
    });
  };

  useEffect(() => {
    if (!form) return;
    for (const field of form.fields) {
      if (!field.lookup || !field.dependsOn?.length || !field.dependsOn.every((dependency) => fields[dependency])) continue;
      void loadLookup(field.key, field.lookup);
    }
  }, [form, fields.providerType, fields.package, fields.appName, loadLookup]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || form.fields.some((field) => field.required && !fields[field.key]?.trim())) return;
    setState("saving");
    try { await api.submit({ country, topic, fields, idempotencyKey: crypto.randomUUID() }); navigate("/requests"); }
    catch { setState("error"); }
  };

  return <div className="page">
    <PageHeader eyebrow="Product Management" title="New Request" description="Master data is loaded through the Portal API. Request submission remains mock-only and does not call USR_PowerApp or an existing workflow." actions={<StatusBadge tone="info">No production write</StatusBadge>} />
    <form className="panel request-form" onSubmit={(event) => void submit(event)}>
      <div className="panel-heading"><div><p className="panel-kicker">Step 1</p><h2>Request context</h2></div><StatusBadge tone="neutral">System fixed</StatusBadge></div>
      <div className="request-form__grid">
        <label className="field"><span>System</span><input value="Product Management" readOnly /></label>
        <label className="field"><span>Country</span><select aria-label="Country" disabled={state === "loading" && countries.length === 0} value={country} onChange={(event) => setCountry(event.target.value)}><option value="">{countries.length ? "Select country" : "No countries available"}</option>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="field"><span>Topic</span><select aria-label="Topic" disabled={!country || state === "loading"} value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">{topics.length ? "Select topic" : "No topics available"}</option>{topics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
      {state === "loading" ? <p role="status" className="request-form__message">Loading Product Management master data…</p> : null}
      {state === "error" ? <p role="alert" className="request-form__message">Product Management master data is unavailable. <button className="button button--secondary button--compact" type="button" onClick={() => setReload((value) => value + 1)}>Retry</button></p> : null}
      {form ? <>
        <div className="panel-heading request-form__step"><div><p className="panel-kicker">Step 2</p><h2>{country} · {topic}</h2></div><StatusBadge tone={form.source === "REAL" ? "success" : "neutral"}>{form.source ?? "MOCK"} data</StatusBadge></div>
        <div className="request-form__grid">{form.fields.map((field) => <label key={field.key} className="field request-form__reason"><span>{field.label}{field.required ? " *" : ""}</span>{field.type === "textarea" ? <textarea required={field.required} value={fields[field.key] ?? ""} onChange={(event) => changeField(field.key, event.target.value)} /> : field.type === "select" ? <select required={field.required} disabled={Boolean(field.dependsOn?.some((dependency) => !fields[dependency]))} value={fields[field.key] ?? ""} onChange={(event) => changeField(field.key, event.target.value)}><option value="">Select</option>{(field.lookup ? lookups[field.key] : field.options?.map((value) => ({ value, label: value })))?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select> : <input required={field.required} value={fields[field.key] ?? ""} onChange={(event) => changeField(field.key, event.target.value)} />}</label>)}</div>
        <button className="button button--primary" disabled={state === "saving" || state === "loading"} type="submit">{state === "saving" ? "Submitting…" : "Submit mock request"}</button>
      </> : null}
    </form>
  </div>;
}
