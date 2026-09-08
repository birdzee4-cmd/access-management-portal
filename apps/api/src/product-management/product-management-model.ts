import type {
  ProductManagementFieldMultiplicity,
  ProductManagementFieldRequiredness,
  ProductManagementFormDefinition,
  ProductManagementFormField,
  ProductManagementFormSchemaMetadata,
  ProductManagementLookupName,
  ProductManagementSchemaPartialReason,
} from "@access-portal/contracts";

export const productManagementCountries = [
  "Thailand",
  "Philippines",
  "Vietnam",
  "Malaysia",
  "Indonesia",
] as const;

export const productManagementTopics = [
  "Create New Account (ลูกค้าใหม่)",
  "เพิ่ม Email เข้า Account(ลูกค้า)",
  "เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)",
  "เพิ่ม App เข้า Account(ลูกค้า)",
  "ขอสิทธิ์เข้า Role(พนักงาน)",
  "เพิ่ม App เข้า Role(พนักงาน)",
  "เพิ่ม Permission เข้า Role(ลูกค้า)",
  "เพิ่ม Package Add On(ลูกค้า)",
  "Create New Role สำหรับ Account(ลูกค้า)",
  "เปลี่ยน Provider สำหรับ Account(ลูกค้า)",
  "Tranfer Owner Account(ลูกค้า)",
  "ลบ User ใน Account(ลูกค้า)",
  "ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account",
] as const;

export type ProductManagementCountry = (typeof productManagementCountries)[number];
export type ProductManagementTopic = (typeof productManagementTopics)[number];

export interface ProductManagementSchemaRegistryEntry extends ProductManagementFormSchemaMetadata {
  readonly topic: ProductManagementTopic;
  readonly fields: readonly ProductManagementFormField[];
}

type ProductManagementFieldEvidence = Omit<ProductManagementFormField, "key" | "label" | "required" | "type" | "lookup" | "dependsOn" | "serverResolvedBy" | "options">;

const field = (
  key: string,
  label: string,
  type: ProductManagementFormField["type"],
  requiredness: ProductManagementFieldRequiredness,
  multiplicity: ProductManagementFieldMultiplicity,
  evidence: ProductManagementFieldEvidence,
): ProductManagementFormField => ({
  key,
  label,
  required: requiredness === "CONFIRMED_REQUIRED",
  type,
  requiredness,
  multiplicity,
  ...evidence,
});

const text = (
  key: string,
  label: string,
  requiredness: ProductManagementFieldRequiredness,
  multiplicity: ProductManagementFieldMultiplicity,
  evidence: ProductManagementFieldEvidence,
  type: "text" | "textarea" = "text",
): ProductManagementFormField => field(key, label, type, requiredness, multiplicity, evidence);

const lookup = (
  key: string,
  label: string,
  name: ProductManagementLookupName,
  requiredness: ProductManagementFieldRequiredness,
  multiplicity: ProductManagementFieldMultiplicity,
  evidence: ProductManagementFieldEvidence,
  dependsOn?: readonly string[],
  serverResolvedBy?: ProductManagementFormField["serverResolvedBy"],
): ProductManagementFormField => ({
  ...field(key, label, "select", requiredness, multiplicity, evidence),
  lookup: name,
  ...(dependsOn ? { dependsOn } : {}),
  ...(serverResolvedBy ? { serverResolvedBy } : {}),
});

const fixedChoice = (
  key: string,
  label: string,
  options: readonly string[],
  requiredness: ProductManagementFieldRequiredness,
  evidence: ProductManagementFieldEvidence,
): ProductManagementFormField => ({
  ...field(key, label, "select", requiredness, "SINGLE", evidence),
  options,
});

function schema(
  topic: ProductManagementTopic,
  legacyScreenPattern: string,
  fields: readonly ProductManagementFormField[],
  partialReasons: readonly ProductManagementSchemaPartialReason[],
): ProductManagementSchemaRegistryEntry {
  return {
    topic,
    legacyScreenPattern,
    legacyFormPattern: "Form* (DataSource: USR_PowerApp)",
    lookupRequirements: fields.flatMap((field) => field.lookup ? [field.lookup] : []),
    implementationStatus: "PARTIAL",
    partialReasons,
    fields,
  };
}

/**
 * Evidence-based registry from the offline Power Apps export. All schemas remain
 * PARTIAL because the remaining evidence/policy gaps are explicit on each entry.
 * Observed legacy behavior is recorded without treating it as approved Portal
 * submission policy.
 */
export const productManagementSchemaRegistry: readonly ProductManagementSchemaRegistryEntry[] = [
  schema(productManagementTopics[0], "{CC}_สร้างAccountลูกค้า", [
    text("companyName", "Company Name", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "CompanyName(Product)", legacyLabel: "Company Name", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.CompanyName(Product); encoded in Detail -> SQL.Detail -> VSTS description", transformation: "English letters, digits, and spaces only" }),
    text("customerEmail", "Customer Email", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "Emailลูกค้า(Product)", legacyLabel: "Email ลูกค้า", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.Emailลูกค้า(Product) -> SQL.Email_Customer; also encoded in Detail", transformation: "Rejects more than one @ delimiter; no exported email-format validation" }),
    lookup("providerType", "Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "ProviderType(Product)", legacyLabel: "Name Provider Type", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.ProviderType(Product) -> SQL.EmailProviderType; also encoded in Detail" }),
    lookup("package", "Package", "package", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "Package(Product)", legacyLabel: "Package", legacyControl: "Classic/ComboBox", legacyBinding: "Selected.DisplayName", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - vw_ListPackageStandard aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.Package(Product); encoded in Detail -> SQL.Detail -> VSTS description" }),
    lookup("appName", "App Name", "appName", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "App Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned Sponsor App aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Concat each selected [AppID] display value with comma separators" }),
    lookup("packageAddOn", "Package Add On", "packageAddOn", "CONFIRMED_OPTIONAL", "MULTIPLE", { legacyDataField: "PackageHid(Product)", legacyLabel: "Package Add On", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - vw_ListPackagHidden aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.PackageHid(Product) only; no Product Management SQL/VSTS mapping found", transformation: "Concat DisplayName values with comma separators" }),
  ], ["UNKNOWN_SUBMISSION_MAPPING"]),
  schema(productManagementTopics[1], "TH base; other {CC}_เพิ่ม Email เข้า Account(ลูกค้า)_{CC}", [
    text("customerEmail", "Customer Email", "CONFIRMED_REQUIRED", "UNKNOWN", { legacyDataField: "Emailลูกค้า(Product)", legacyLabel: "Email ลูกค้า", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.Emailลูกค้า(Product) -> SQL.Email_Customer; also encoded in Detail" }),
    lookup("providerType", "Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "ProviderType(Product)", legacyLabel: "Name Provider Type", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.ProviderType(Product) -> SQL.EmailProviderType; also encoded in Detail" }),
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Concat AccountRoleName values with comma separators" }, ["account"]),
  ], ["UNKNOWN_MULTIPLICITY"]),
  schema(productManagementTopics[2], "{CC}_เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Concat AccountRoleName values with comma separators" }, ["account"]),
  ], ["DUPLICATE_LEGACY_ROUTE"]),
  schema(productManagementTopics[3], "TH base; other {CC}_เพิ่ม App เข้า Account(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("appName", "App Name", "appName", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "App Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned Sponsor App aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Concat each selected [AppID] display value with comma separators" }),
  ], ["UNKNOWN_SUBMISSION_MAPPING"]),
  schema(productManagementTopics[4], "TH base; other {CC}_ขอสิทธิ์เข้า Role(พนักงาน)_{CC}", [
    lookup("internalRole", "Internal Role", "internalRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleInternal(Product)", legacyLabel: "Role Internal", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "TH, PH, or shared VN/MY/ID Matrix filtered by authenticated user Department/Manager", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleInternal(Product) -> SQL.RoleInternal; also encoded in Detail", transformation: "Concat RoleName values with comma separators" }, undefined, "AUTHENTICATED_USER_DEPARTMENT_OR_MANAGER"),
  ], ["UNKNOWN_LOOKUP_AUTHORITY"]),
  schema(productManagementTopics[5], "TH base; other {CC}_เพิ่ม App เข้า Role(พนักงาน)_{CC}", [
    lookup("internalRole", "Internal Role", "internalRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleInternal(Product)", legacyLabel: "Role Internal", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "TH, PH, or shared VN/MY/ID Matrix filtered by authenticated user Department/Manager", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleInternal(Product) -> SQL.RoleInternal; also encoded in Detail", transformation: "Concat RoleName values with comma separators" }, undefined, "AUTHENTICATED_USER_DEPARTMENT_OR_MANAGER"),
    lookup("appName", "App Name", "appName", "CONFIRMED_OPTIONAL", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "App Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned Sponsor App aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Concat each selected [AppID] display value with comma separators; legacy submit guard does not require App" }),
  ], ["UNKNOWN_LOOKUP_AUTHORITY", "LEGACY_REQUIREDNESS_ANOMALY"]),
  schema(productManagementTopics[6], "TH base; other {CC}_เพิ่ม Permission เข้า Role(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected.AccountRoleName", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail" }, ["account"]),
    text("featureList", "List Feature", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Feature", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Prefixed with Topic, Account, and Role labels" }, "textarea"),
  ], ["UNKNOWN_TEXT_LIST_FORMAT"]),
  schema(productManagementTopics[7], "TH base; other {CC}_เพิ่ม Package Add On(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "ProductName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.ProductName(Product) -> SQL.ProductName; also encoded in Detail", transformation: "Reuses ProductName(Product) for comma-separated AccountRoleName values" }, ["account"]),
    lookup("packageAddOn", "Package Add On", "packageAddOn", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "Package Add On", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - vw_ListPackagHidden aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Reuses AppName(Product) for comma-separated Add-On DisplayName values" }),
  ], ["UNAPPROVED_LEGACY_FIELD_REUSE"]),
  schema(productManagementTopics[8], "{CC}_Create New Role สำหรับ Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    text("newRole", "Create Role Name", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Create Role Name", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail" }),
    text("featureList", "List Feature", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Feature", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Prefixed with Topic, Account, and Create Role labels" }, "textarea"),
  ], ["UNKNOWN_TEXT_LIST_FORMAT"]),
  schema(productManagementTopics[9], "{CC}_เปลี่ยน Provider สำหรับ Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("providerType", "New Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Name Provider Type (New)", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Reuses RoleName(Product) for the new Provider Type" }),
    text("emailList", "List Email", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Email", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Prefixed with Topic, Account, and new Provider labels" }, "textarea"),
  ], ["UNKNOWN_TEXT_LIST_FORMAT", "UNAPPROVED_LEGACY_FIELD_REUSE"]),
  schema(productManagementTopics[10], "{CC}_Tranfer Owner Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("providerType", "New Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Name Provider Type (New)", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Reuses RoleName(Product) for the new Provider Type" }),
    text("customerEmail", "Customer Email", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "Detail", legacyLabel: "Email ลูกค้า", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Prefixed with Topic, Account, and new Provider labels; no exported email-format validation" }),
  ], ["UNAPPROVED_LEGACY_FIELD_REUSE"]),
  schema(productManagementTopics[11], "{CC}_ลบ User ใน Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    text("emailList", "List Email", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Email", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Prefixed with Topic and Account labels" }, "textarea"),
  ], ["UNKNOWN_TEXT_LIST_FORMAT"]),
  schema(productManagementTopics[12], "{CC}_ขอเปิด_ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    fixedChoice("notificationSetting", "Notification Setting", ["เปิด", "ปิด"], "CONFIRMED_REQUIRED", { legacyDataField: "Detail", legacyLabel: "Send Email BCC to Owner Account", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value through hidden TextInput", legacyDefault: "selection sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded เปิด/ปิด choices", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Prefixed with Topic and Account labels" }),
  ], ["UNKNOWN_SUBMISSION_MAPPING"]),
] as const;

export function isProductManagementCountry(country: string): country is ProductManagementCountry {
  return (productManagementCountries as readonly string[]).includes(country);
}

export function isProductManagementTopic(topic: string): topic is ProductManagementTopic {
  return (productManagementTopics as readonly string[]).includes(topic);
}

export function isSupportedProductManagementContext(country: string, topic: string): boolean {
  return isProductManagementCountry(country) && isProductManagementTopic(topic);
}

export function productManagementForm(country: string, topic: string): ProductManagementFormDefinition {
  if (!isSupportedProductManagementContext(country, topic)) {
    throw new Error("INVALID_PRODUCT_MANAGEMENT_CONTEXT");
  }
  const entry = productManagementSchemaRegistry.find((candidate) => candidate.topic === topic);
  if (!entry) throw new Error("INVALID_PRODUCT_MANAGEMENT_CONTEXT");
  return {
    country,
    topic,
    schema: {
      legacyScreenPattern: entry.legacyScreenPattern,
      legacyFormPattern: entry.legacyFormPattern,
      lookupRequirements: entry.lookupRequirements,
      implementationStatus: entry.implementationStatus,
      partialReasons: entry.partialReasons,
    },
    fields: entry.fields,
  };
}
