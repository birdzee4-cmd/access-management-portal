import type { PortalRole } from "../auth/types.js";
import type { PortalFeatures } from "./features.js";

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly roles: readonly PortalRole[];
  readonly feature?: keyof PortalFeatures;
}

export const navigationItems: readonly NavigationItem[] = [
  { label: "Dashboard", path: "/", icon: "⌂", roles: ["Admin", "Approver", "Viewer"] },
  {
    label: "My Requests",
    path: "/requests",
    icon: "▤",
    roles: ["Admin", "Approver", "Viewer"],
  },
  { label: "New Request", path: "/requests/new", icon: "+", roles: ["Admin", "Approver", "Viewer"], feature: "productManagementMvp" },
  {
    label: "Access Catalog",
    path: "/catalog",
    icon: "◇",
    roles: ["Admin", "Approver", "Viewer"], feature: "accessManagementUi",
  },
  {
    label: "Approvals",
    path: "/approvals",
    icon: "✓",
    roles: ["Admin", "Approver"], feature: "accessManagementUi",
  },
  { label: "Users", path: "/users", icon: "♙", roles: ["Admin"], feature: "accessManagementUi" },
  { label: "Request Workspace", path: "/admin/resolution", icon: "▦", roles: ["Admin"] },
  {
    label: "Legacy Requests",
    path: "/legacy-requests",
    icon: "↺",
    roles: ["Admin"], feature: "accessManagementUi",
  },
  {
    label: "Automation Jobs",
    path: "/automation-jobs",
    icon: "⚡",
    roles: ["Admin"], feature: "accessManagementUi",
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
  features: PortalFeatures = { productManagementMvp: true, accessManagementUi: false },
): readonly NavigationItem[] {
  return navigationItems.filter((item) => hasRequiredRole(roles, item.roles) && (!item.feature || features[item.feature]));
}
