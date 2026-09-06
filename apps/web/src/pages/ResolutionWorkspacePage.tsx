import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { resolutionCandidates } from "../resolution/fixtures.js";
import { catalogFields, catalogOptions, scopeFields, createResolutionDraft, updateResolutionDraft,
  validateResolutionDraft, type DraftAction, type ResolutionDraft, type SyntheticResolutionCandidate } from "../resolution/model.js";

function Choice({ label, value, options, onChange }: {
  readonly label: string; readonly value: string; readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}) {
  return <label className="resolution-field"><span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
  </label>;
}

export function ResolutionCandidateEditor({ candidate, draft, onAction }: {
  readonly candidate: SyntheticResolutionCandidate; readonly draft: ResolutionDraft;
  readonly onAction: (action: DraftAction) => void;
}) {
  const validation = validateResolutionDraft(candidate, draft);
  return <div className="resolution-editor">
    <section className="resolution-card" aria-labelledby="observation-title">
      <div className="resolution-section-heading"><div><p className="page-eyebrow">Selected candidate · synthetic</p>
        <h2 id="observation-title">{candidate.label}: {candidate.scenario}</h2></div><StatusBadge tone="neutral">{draft.reviewStatus}</StatusBadge></div>
      <dl className="resolution-observations"><div><dt>Observed role</dt><dd>{candidate.observedRole}</dd></div>
        <div><dt>Observed department</dt><dd>{candidate.observedDepartments.join(" · ")}</dd></div>
        <div><dt>Legacy source category</dt><dd>{candidate.legacySource}</dd></div>
        <div><dt>Active observation</dt><dd>{candidate.observedActive}</dd></div></dl>
      <p className="resolution-help">Source labels do not establish business context. Active observations trigger no action.</p>
      <ul className="resolution-warnings">{candidate.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </section>
    <section className="resolution-card" aria-labelledby="catalog-resolution-title">
      <h2 id="catalog-resolution-title">Catalog resolution</h2><p className="resolution-help">Select demo codes explicitly. UNRESOLVED is always available.</p>
      <div className="resolution-fields">{catalogFields.map((field) => <Choice key={field} label={field === "context" ? "Access Context" : field[0]!.toUpperCase() + field.slice(1)}
        value={draft.catalog[field]} options={["UNRESOLVED", ...catalogOptions[field]]} onChange={(value) => onAction({ type: "catalog", field, value })} />)}</div>
    </section>
    <section className="resolution-card" aria-labelledby="approval-resolution-title">
      <h2 id="approval-resolution-title">Approval resolution</h2><p className="resolution-help">Synthetic observations only. Identity types are draft labels; no people or groups are looked up.</p>
      <ul className="resolution-approvers">{candidate.approvers.map((person) => <li key={person.code}>{person.label}</li>)}</ul>
      <div className="resolution-fields">
        <Choice label="Authoritative approver" value={draft.approval.authoritativeApproverDecision} options={["UNRESOLVED", "YES", "NO"]}
          onChange={(value) => onAction({ type: "authority", value: value as ResolutionDraft["approval"]["authoritativeApproverDecision"] })} />
        <Choice label="Identity resolution" value={draft.approval.approverIdentityResolution} options={["UNRESOLVED", "PORTAL_USER", "ENTRA_USER", "ENTRA_GROUP", "UNKNOWN"]}
          onChange={(value) => onAction({ type: "identity", value: value as ResolutionDraft["approval"]["approverIdentityResolution"] })} />
        <Choice label="Approval mode" value={draft.approval.approvalMode} options={["UNKNOWN", "ANY", "ALL", "SEQUENTIAL"]}
          onChange={(value) => onAction({ type: "mode", value: value as ResolutionDraft["approval"]["approvalMode"] })} />
      </div>
      {draft.approval.approvalMode === "SEQUENTIAL" ? <fieldset className="resolution-sequence"><legend>Explicit synthetic sequence</legend>
        <p className="resolution-help">Choose each observation once. No order is inferred.</p>
        <div className="resolution-fields">{candidate.approvers.map((_, position) => <label className="resolution-field" key={position}><span>Position {position + 1}</span>
          <select value={draft.approval.sequence[position] ?? ""} onChange={(event) => onAction({ type: "sequence", position, value: event.target.value })}>
            <option value="">UNRESOLVED</option>{candidate.approvers.map((person) => <option key={person.code} value={person.code}>{person.label}</option>)}
          </select></label>)}</div></fieldset> : <p className="resolution-help">Sequence: UNRESOLVED. Explicit ordering is available only for SEQUENTIAL.</p>}
      <h3>Approval scope</h3><p className="resolution-help">Decide each dimension explicitly; no source or department meaning is assumed.</p>
      <div className="resolution-fields">{scopeFields.map((field) => <Choice key={field} label={`${field} scope`} value={draft.approval.scopeResolution[field]}
        options={["UNRESOLVED", "IN_SCOPE", "NOT_IN_SCOPE"]} onChange={(value) => onAction({ type: "scope", field, value: value as ResolutionDraft["approval"]["scopeResolution"][typeof field] })} />)}</div>
    </section>
    <section className="resolution-card resolution-validation" aria-labelledby="validation-title">
      <div className="resolution-section-heading"><h2 id="validation-title">Preview validation</h2><span role="status" aria-live="polite"><StatusBadge tone={validation.blockers.length ? "warning" : "info"}>{validation.readiness}</StatusBadge></span></div>
      <p>Resolved for preview means only that this synthetic draft is complete and checked. It is not saved, active, approved, or ready for production.</p>
      <p><strong>{validation.blockers.length} blockers</strong></p><ul>{validation.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul>
      <p className="resolution-help">{validation.warnings[validation.warnings.length - 1]}</p>
      <div className="resolution-actions"><button className="button button--secondary" type="button" onClick={() => onAction({ type: "reset" })}>Reset candidate</button>
        <button className="button button--primary" type="button" onClick={() => onAction({ type: "validate" })}>Validate Preview</button></div>
    </section>
  </div>;
}

export function ResolutionWorkspacePage() {
  const [selected, setSelected] = useState(resolutionCandidates[0]!.candidateId);
  const [drafts, setDrafts] = useState<Record<string, ResolutionDraft>>({});
  const candidate = resolutionCandidates.find((item) => item.candidateId === selected)!;
  const draft = drafts[selected] ?? createResolutionDraft(selected);
  const onAction = (action: DraftAction) => setDrafts((previous) => ({ ...previous,
    [selected]: updateResolutionDraft(candidate, previous[selected] ?? createResolutionDraft(selected), action) }));
  return <div className="resolution-workspace">
    <PageHeader eyebrow="Synthetic review lab" title="Resolution Workspace"
      description="This workspace demonstrates how unresolved legacy catalog and approval observations can be reviewed. Decisions made in this preview are not saved or activated." />
    <aside className="resolution-banner" aria-label="Preview safety"><div className="resolution-badges"><StatusBadge tone="info">ADMIN ONLY</StatusBadge><StatusBadge tone="warning">PREVIEW</StatusBadge><StatusBadge tone="warning">NOT SAVED</StatusBadge><StatusBadge tone="neutral">SYNTHETIC DATA</StatusBadge></div>
      <strong>Preview only — changes are not saved.</strong><span>Refresh or leave this page to discard drafts. No production candidates are loaded.</span></aside>
    <div className="resolution-layout"><section className="resolution-card resolution-candidates" aria-labelledby="candidate-list-title">
      <h2 id="candidate-list-title">Candidates</h2><p className="resolution-help">5 synthetic scenarios</p><div className="resolution-candidate-list">{resolutionCandidates.map((item) => <button key={item.candidateId} type="button"
        className={"resolution-candidate" + (item.candidateId === selected ? " resolution-candidate--selected" : "")} aria-pressed={item.candidateId === selected} onClick={() => setSelected(item.candidateId)}>
        <strong>{item.label}</strong><span>{item.scenario}</span><small>{drafts[item.candidateId]?.reviewStatus ?? "UNREVIEWED"}</small></button>)}</div>
      <button className="button button--secondary" type="button" onClick={() => { setDrafts({}); setSelected(resolutionCandidates[0]!.candidateId); }}>Reset all preview data</button>
    </section><ResolutionCandidateEditor candidate={candidate} draft={draft} onAction={onAction} /></div>
  </div>;
}
