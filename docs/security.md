# Security

## Phase-one security posture

This repository is a local skeleton. It contains no production credentials, cloud resources, live clients, deployment automation, or write-capable legacy connector contract.

## Mandatory safety controls

All legacy integrations operate in `READ_ONLY` mode. The expected configuration is:

```dotenv
LEGACY_INTEGRATION_MODE=READ_ONLY
ENABLE_SHAREPOINT_WRITE=false
ENABLE_LEGACY_SQL_WRITE=false
ENABLE_VSTS_WRITE=false
ENABLE_ACCESS_PROVISIONING=false
ENABLE_ACCESS_REVOCATION=false
ENABLE_AUTOMATION=false
```

The parser in `packages/shared` accepts only these exact safe values and throws on absent, malformed, or permissive values. This is defense in depth; feature flags do not replace least-privilege identities, network controls, API permissions, database permissions, code review, or change approval.

## Identity and authorization

Microsoft Entra ID is the planned identity provider. A later phase must:

- register separate applications for appropriate client/API trust boundaries;
- validate issuer, tenant, audience, signature, expiry, and scopes/roles in the API;
- use least-privilege application permissions and prefer delegated access where appropriate;
- define portal roles separately from legacy-system permissions;
- prohibit authorization decisions based only on UI state.

No application registration, secret, certificate, or production tenant identifier is created here.

## Secrets

- Commit `.env.example` and `local.settings.example.json` only.
- Never commit `.env`, `local.settings.json`, connection strings, tokens, client secrets, certificates, or personal access tokens.
- Use managed identities and a managed secret store in future hosted environments.
- Use synthetic/local data for development.

## Legacy connector controls

Future integration identities must be technically read-only at the source:

- SharePoint: read scopes only; no list or item mutation permissions.
- Existing SQL Server: a dedicated login restricted to `SELECT` on approved views; no DML or DDL grants.
- Azure DevOps / VSTS: read scopes only; no work-item, membership, permission, pipeline, or repository mutation scopes.
- Power Automate: no flow editing, triggering, enabling, or disabling permissions.

Any future connector must add tests proving that its public contract offers no mutation methods and that unsafe configuration prevents startup.

## Logging and privacy

Future logs must avoid access tokens, secrets, connection strings, full request payloads, and unnecessary employee data. Audit events should capture actor, action, target, decision, correlation ID, and timestamp, with an approved retention period.

## Threats to address before pilot

- Excessive Microsoft Graph or Azure DevOps scopes
- Confused-deputy behavior between portal and legacy permissions
- IDOR/BOLA on access-request resources
- Injection into legacy query filters
- Token leakage through browser storage or logs
- Privilege escalation through group or role mapping
- Replay and duplicate-request handling
- Incomplete audit trails
