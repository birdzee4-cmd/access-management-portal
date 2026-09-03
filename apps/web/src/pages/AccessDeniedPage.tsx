import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState.js";

export function AccessDeniedPage() {
  return (
    <div className="page">
      <div className="panel">
        <EmptyState
          title="Page not available"
          description="Your current portal role does not include this navigation item. Backend authorization remains authoritative."
        />
        <div className="empty-state__action">
          <Link className="button-link" to="/">
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
