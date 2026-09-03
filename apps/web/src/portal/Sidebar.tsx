import { NavLink } from "react-router-dom";

import type { PortalRole } from "../auth/types.js";
import { visibleNavigation } from "./navigation.js";

export interface SidebarProps {
  readonly roles: readonly PortalRole[];
}

export function Sidebar({ roles }: SidebarProps) {
  const items = visibleNavigation(roles);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          AM
        </span>
        <span className="brand__text">
          <strong>Access Management</strong>
          <small>Portal</small>
        </span>
      </div>

      <nav className="primary-nav" aria-label="Portal navigation">
        {items.map((item) => (
          <NavLink
            key={item.path}
            aria-label={item.label}
            className={({ isActive }) =>
              "nav-link" + (isActive ? " nav-link--active" : "")
            }
            end={item.path === "/"}
            title={item.label}
            to={item.path}
          >
            <span className="nav-link__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-link__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__status" aria-hidden="true" />
        <span>
          <strong>Legacy access</strong>
          <small>Read only</small>
        </span>
      </div>
    </aside>
  );
}
