# Microsoft Entra ID Authentication Foundation

## Scope

Task 05A adds authentication and authorization code boundaries only. It does not create Microsoft Entra app registrations, Azure resources, secrets, production configuration, deployment artifacts, business permissions, or connections to any database or legacy system.

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
- configured issuer;
- configured audience;
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

These roles are code vocabulary only. They have not been created or assigned in Microsoft Entra ID, and they do not grant any legacy-system permission.

Business permissions, ownership rules, request-level access, and target-user authorization remain future work.

## Planned Entra app registrations

Task 05B may configure two distinct registrations after review:

1. A public single-page application registration for the React portal, using authorization code flow with PKCE and an approved redirect URI.
2. A protected web API registration exposing a delegated API scope and the approved Admin, Approver, and Viewer application roles.

No client secret is required for normal browser user authentication. Exact tenant policy, supported accounts, redirect URIs, API scope, consent, token version, role assignments, and deployment settings must be approved in Task 05B.

## Required environment variables

Frontend:

~~~text
VITE_ENTRA_CLIENT_ID=replace_me
VITE_ENTRA_TENANT_ID=replace_me
VITE_ENTRA_REDIRECT_URI=http://localhost:5173
VITE_ENTRA_API_SCOPE=api://replace_me/access_as_user
~~~

Backend:

~~~text
ENTRA_TENANT_ID=replace_me
ENTRA_API_CLIENT_ID=replace_me
ENTRA_EXPECTED_AUDIENCE=replace_me
ENTRA_EXPECTED_ISSUER=https://login.microsoftonline.com/replace_me/v2.0
~~~

These are identifiers and validation settings, not credentials. Real values must not be committed. The API client ID is retained separately from the expected audience because a future App ID URI may differ from the registration's client ID.

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

## Future Task 05B steps

Task 05B must be separately authorized before any Entra or Azure change. It should review and then configure:

1. Tenant ownership and single-tenant policy.
2. Separate SPA and API app registrations.
3. Approved localhost and hosted redirect URIs.
4. API Application ID URI and delegated access scope.
5. Access-token version and issuer/audience values.
6. Admin, Approver, and Viewer app-role definitions and assignments.
7. Consent and least-privilege policy.
8. Hosted environment configuration and secret-management process.
9. End-to-end sign-in and protected-API tests in a non-production environment.
10. Operational monitoring without token or sensitive-claim logging.

Task 05A does not perform any of these configuration actions.
