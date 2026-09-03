import type { AuthenticatedIdentityResponse } from "@access-portal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthApiClient, AuthApiError } from "./authApi";
import { useAuth } from "./useAuth";

export function AuthenticationTestPanel() {
  const auth = useAuth();
  const api = useMemo(
    () => new AuthApiClient(auth.getAccessToken),
    [auth.getAccessToken],
  );
  const [verifiedIdentity, setVerifiedIdentity] =
    useState<AuthenticatedIdentityResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reportError = (error: unknown) => {
    setMessage(
      error instanceof AuthApiError
        ? "API returned HTTP " + error.status + "."
        : "Authentication test request failed.",
    );
  };

  const callMe = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const identity = await api.getMe();
      setVerifiedIdentity(identity);
      setMessage("/api/auth/me succeeded.");
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }, [api]);

  const callAdminTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.getAdminTest();
      setMessage("/api/auth/admin-test succeeded: Admin authorized.");
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (auth.state === "authenticated") {
      void callMe();
    } else {
      setVerifiedIdentity(null);
      setMessage(null);
    }
  }, [auth.state, callMe]);

  if (auth.state !== "authenticated" || !auth.user) {
    return (
      <section className="auth-panel" aria-labelledby="authentication-title">
        <h2 id="authentication-title">Authentication test</h2>
        <p>
          Status: <strong>{auth.state}</strong>
        </p>
        <button
          type="button"
          disabled={auth.state === "unconfigured" || auth.state === "authenticating"}
          onClick={() => void auth.login()}
        >
          Sign in with Microsoft
        </button>
      </section>
    );
  }

  const roles = verifiedIdentity?.roles ?? auth.user.roles;

  return (
    <section className="auth-panel" aria-labelledby="authentication-title">
      <h2 id="authentication-title">Authentication test</h2>
      <p>
        Signed in as <strong>{auth.user.displayName}</strong>
      </p>
      <p>Roles: {roles.length > 0 ? roles.join(", ") : "None returned"}</p>
      <div className="auth-actions">
        <button type="button" disabled={busy} onClick={() => void callMe()}>
          Call /api/auth/me
        </button>
        <button type="button" disabled={busy} onClick={() => void callAdminTest()}>
          Call Admin test
        </button>
        <button type="button" disabled={busy} onClick={() => void auth.logout()}>
          Sign out
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
