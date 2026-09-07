# Repository instructions

Applies throughout this repository. Read [project state](docs/project-state.md),
[production safety](docs/production-safety-boundary.md) and the requested
[milestone](docs/roadmap.md), then inspect relevant source and historical docs.
Repository evidence establishes implementation; do not trust prompt history alone.

- Check git status, branch, HEAD and origin/main before work. Preserve unrelated
  changes byte-for-byte; never revert, stage or commit them. Stage explicit paths.
- Legacy Production is READ ONLY unless a future task explicitly authorizes a
  scoped exception. No Legacy SQL / SharePoint / VSTS writes by default; no
  Power Automate editing, triggering, enabling or disabling by default.
- Provisioning, revocation and automation remain disabled. Do not change safety
  flags, Entra configuration, deploy, migrate, run db push, seed or write Portal DB
  without explicit task authorization. A roadmap entry grants no permission.
- Production reads require task-specific scope. Never query production to refresh
  documentation. Use repository evidence and synthetic tests.
- Follow the canonical safety reference. Never print or commit secrets, tokens,
  credentials, connection strings, real tenant/client/user identifiers, production
  personal data, raw Manager values or raw production rows. Keep local settings
  ignored and examples/fixtures synthetic.
- API authorization is authoritative; UI visibility and Admin status grant no
  legacy permissions. Never infer identity, approval or access from source labels.
- Distinguish OBSERVED (evidence), RESOLVED (explicit mapping), APPROVED (authorized
  exact scope/version), ACTIVE (explicit activation), PROVISIONED (verified target
  access). None implies the next. Legacy Active and VSTS closure prove none of them.
- Run appropriate existing checks and, before delivery, npm test, npm run typecheck,
  npm run build, npm run prisma:validate and npm audit --audit-level=moderate.
  Use synthetic tests/local schema checks; never substitute database operations.
  Report failures and validation limitations honestly.
- Before commit, review/security-scan staged changes for sensitive data, verify
  unrelated edits remain unstaged, and run git diff --cached --check. Commit/push
  only within task authorization; never force push by default.
- On `CreateProcessWithLogonW failed: 1907`, STOP execution, report the environment
  blocker and await user repair. Do not retry, bypass or change credentials.
- Preserve historical 07A–07Q evidence. Future planning uses M1/M2/M3/M4, not 07R.
  Leave unresolved business decisions POLICY REQUIRED. STOP after requested scope;
  do not automatically begin the next milestone. Update canonical context when
  implementation changes.
