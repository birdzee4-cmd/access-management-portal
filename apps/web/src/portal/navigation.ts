import type { PortalRole } from "../auth/types.js";

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly roles: readonly PortalRole[];
}

export const navigationItems: readonly NavigationItem[] = [
  { label: "Dashboard", path: "/", icon: "⌂", roles: ["Admin", "Approver", "Viewer"] },
  {
    label: "My Requests",
    path: "/requests",
    icon: "▤",
    roles: ["Admin", "Approver", "Viewer"],
  },
  {
    label: "Access Catalog",
    path: "/catalog",
    icon: "◇",
    roles: ["Admin", "Approver", "Viewer"],
  },
  {
    label: "Approvals",
    path: "/approvals",
    icon: "✓",
    roles: ["Admin", "Approver"],
  },
  { label: "Users", path: "/users", icon: "♙", roles: ["Admin"] },
  {
    label: "Legacy Requests",
    path: "/legacy-requests",
    icon: "↺",
    roles: ["Admin"],
  },
  {
    label: "Automation Jobs",
    path: "/automation-jobs",
    icon: "⚡",
    roles: ["Admin"],
  },
  { label: "Audit Logs", path: "/audit-logs", icon: "≣", roles: ["Admin"] },
  { label: "Settings", path: "/settings", icon: "⚙", roles: ["Admin"] },
];

export function hasRequiredRole(
  userRoles: readonly PortalRole[],
  requiredRoles: readonly PortalRole[],
): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

export function visibleNavigation(
  roles: readonly PortalRole[],
): readonly NavigationItem[] {
  return navigationItems.filter((item) => hasRequiredRole(roles, item.roles));
}
