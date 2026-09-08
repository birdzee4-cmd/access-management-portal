export interface PortalFeatures { readonly productManagementMvp: boolean; readonly accessManagementUi: boolean; }
function enabled(value: string | undefined, fallback: boolean): boolean { return value === undefined || value.trim() === "" ? fallback : value.trim().toLowerCase() === "true"; }
/** UI flags only. API authorization remains authoritative. */
export function readPortalFeatures(environment: ImportMetaEnv | undefined = import.meta.env): PortalFeatures {
  return { productManagementMvp: enabled(environment?.VITE_PRODUCT_MANAGEMENT_MVP, true), accessManagementUi: enabled(environment?.VITE_ACCESS_MANAGEMENT_UI, false) };
}
