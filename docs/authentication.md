# Microsoft Entra ID Authentication Foundation

## Scope

Task 05A added authentication and authorization code boundaries. Task 05B wires those boundaries to Microsoft Entra resources that were created manually outside this repository. It does not create or modify app registrations, Azure resources, secrets, production configuration, deployment artifacts, business permissions, or connections to any database or legacy system.

All identifiers in committed environment examples are placeholders.

## Authentication architecture

~~~mermaid
flowchart LR
    User[User] --> Portal[React Portal]
    Portal --> Entra[Microsoft Entra ID]
    Entra --> Token[Access Token]
    Token --> Functions[Azure Functions API]
    Functions --> Validation[JWT Validation]
    Validation --> Context[Authenticated User Context]
~~~

The browser and API have different responsibilities:

- The browser signs the user in and acquires an access token for the API.
- The API treats the token as untrusted input until it independently validates the signature and claims.
- Identity values manually supplied in request bodies or custom frontend fields are never authoritative.

## Frontend MSAL responsibility

The React application uses @azure/msal-browser and @azure/msal-react behind apps/web/src/auth.

AuthProvider owns the MSAL instance and exposes:

- login by redirect;
- logout by redirect;
- current authenticated user;
- authentication state;
- silent access-token acquisition immediately before an API call.

UI components consume useAuth rather than calling MSAL directly. ProtectedRoute provides client-side visibility and navigation capability, but it is only a user-experience boundary. Hiding a route or button never authorizes an API operation.

MSAL is configured to use sessionStorage rather than localStorage. Access tokens are returned to the caller when needed and are not copied into React state, application storage, logs, or committed files.

If every frontend Entra value remains missing or set to a placeholder, AuthProvider reports unconfigured state and renders the local application without initiating a login or network request. Partial configuration fails clearly.

## Backend JWT validation responsibility

The API accepts identity only from the Authorization Bearer header. EntraJwtAccessTokenValidator uses a tenant-derived Microsoft JWKS endpoint and validates:

- RS256 signature;
- an exact tenant-specific Microsoft v1 or v2 issuer;
- configured audience;
- the delegated access_as_user scope;
- expiration and issued-at claims;
- subject, tenant, and Entra object ID claims;
- exact tenant ID match.

Only after validation does it create AuthenticatedUser with entraObjectId, email, displayName, recognized application roles, verified claims, and the authentication source.

Remote signing keys are resolved only when a protected request is validated. No token validation or Entra network call happens during module import, the health endpoint, builds, or tests.

Authentication failures return generic error information. The implementation does not log access tokens, ID tokens, Authorization headers, secrets, or the underlying validation exception.

## Authentication versus authorization

Authentication proves who made the request. Authorization decides whether that authenticated identity may perform a specific operation.

requireAuthenticatedUser validates the bearer token and produces the user context. requireRole then enforces one or more application roles on the backend. For example, an Admin-only handler will call requireRole(user, "Admin") even when the frontend already hides that operation.

The initial application roles are:

- Admin
- Approver
- Viewer

Matching application roles have been created manually on the API registration, and the development user has been assigned Admin outside this repository. No role IDs, assignments, user identifiers, or tenant values are stored here. These roles do not grant any legacy-system permission.

Business permissions, ownership rules, request-level access, and target-user authorization remain future work.

## Manually created Entra app registrations

Task 05B expects two distinct registrations that already exist:

1. A single-tenant public SPA registration for the React portal with the localhost redirect URI.
2. A single-tenant protected API registration exposing the delegated access_as_user scope and Admin, Approver, and Viewer roles.

The SPA has delegated permission to the API scope. No client secret is used or required for browser user authentication.

## Task 05B protected test endpoints

- GET /api/auth/me requires a valid access token and returns only authenticated, displayName, email, and roles.
- GET /api/auth/admin-test requires a valid access token plus the Admin application role.

Responses set Cache-Control to no-store. They never include verified claims, object IDs, JWTs, ID tokens, access tokens, or Authorization headers. The endpoints do not access SQL, SharePoint, Azure DevOps, or any business service.

## Required environment variables

Frontend:

~~~text
VITE_ENTRA_CLIENT_ID=replace_me
VITE_ENTRA_TENANT_ID=replace_me
VITE_ENTRA_API_CLIENT_ID=replace_me
VITE_ENTRA_REDIRECT_URI=http://localhost:5173
VITE_ENTRA_API_SCOPE=api://replace_me/access_as_user
~~~

Backend:

~~~text
ENTRA_TENANT_ID=replace_me
ENTRA_API_CLIENT_ID=replace_me
ENTRA_EXPECTED_AUDIENCE=replace_me
~~~

These are identifiers and validation settings, not credentials. Real values must not be committed. The frontend requires the exact scope format api://<API_CLIENT_ID>/access_as_user. ENTRA_EXPECTED_AUDIENCE must match the aud value Entra actually issues for this API; it is never inferred or hard-coded. It must not include the /access_as_user scope suffix. Trusted issuer values and the JWKS URL are derived from ENTRA_TENANT_ID.

Copy .env.example to the ignored root .env and enter the frontend values there manually. Vite reads that root file through its envDir configuration. Copy apps/api/local.settings.example.json to the ignored apps/api/local.settings.json and enter the backend values in its Values object. Enter identifiers without angle brackets. The repository-supported npm run dev:api command starts Azure Functions, which loads local.settings.json without printing its contents.

The completed local authentication check verified Microsoft Entra interactive sign-in, GET /api/auth/me, the Admin role returned from the validated API access token, and Admin authorization on GET /api/auth/admin-test.

## Local development strategy

The web application remains usable in unconfigured mode with placeholder values.

The API development mock has three safeguards:

1. APP_ENV must be exactly development.
2. ENABLE_DEV_AUTH_MOCK must be explicitly true; its committed default is false.
3. Each mocked request must contain X-Development-Auth: enabled.

When all three checks pass, the mock produces the fixed synthetic identity dev.user@example.invalid with only the Viewer role. It never accepts a caller-supplied employee identity or role. Setting the mock flag outside development throws a configuration error and cannot produce a user.

This mechanism is for local handler development only. It is not a token format and must not be enabled in any shared or hosted environment.

## Security rules

- Never store access tokens in localStorage.
- Never log tokens, Authorization headers, secrets, or validation exceptions containing token material.
- Never trust user, email, object ID, or role values manually supplied by the frontend.
- Validate issuer, audience, signature, lifetime, tenant, and required claims in the API.
- Derive the JWKS endpoint from the configured tenant rather than from token-controlled data.
- Enforce roles on backend handlers, regardless of frontend route visibility.
- Use no client secret for SPA user authentication.
- Keep production values and local settings outside version control.
- Authentication does not relax the Production Safety Boundary or permit legacy writes.

## Remaining future work

Task 05B is local wiring only. Hosted redirect URIs, deployment configuration, production consent, production role assignment, monitoring, Conditional Access review, and operational support remain separately authorized future work. Task 06 is not part of this change.
