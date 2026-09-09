import type {
  ProductManagementFieldMultiplicity,
  ProductManagementFieldRequiredness,
  ProductManagementDerivedValueMetadata,
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
  derivedValues?: readonly ProductManagementDerivedValueMetadata[],
): ProductManagementSchemaRegistryEntry {
  return {
    topic,
    legacyScreenPattern,
    legacyFormPattern: "Form* (DataSource: USR_PowerApp)",
    lookupRequirements: fields.flatMap((field) => field.lookup ? [field.lookup] : []),
    implementationStatus: partialReasons.length ? "PARTIAL" : "CONFIRMED",
    partialReasons,
    submissionEnabled: false,
    ...(derivedValues ? { derivedValues } : {}),
    fields,
  };
}

const rawText = (
  formula: string,
  destination: string,
  downstreamConsumer: string,
  status: "CONFIRMED" | "PARTIAL" = "CONFIRMED",
): NonNullable<ProductManagementFormField["serialization"]> => ({
  status,
  sourceCardinality: "SINGLE_CONTROL",
  mode: "RAW_TEXT_PASSTHROUGH",
  formula,
  delimiter: null,
  ordering: "AS_ENTERED",
  whitespace: "PRESERVED",
  emptyValue: "REJECTED_BY_SUBMIT_GUARD",
  escaping: "NONE",
  destination,
  downstreamConsumer,
});

const selectedItems = (
  formula: string,
  delimiter: string,
  destination: string,
  downstreamConsumer: string,
): NonNullable<ProductManagementFormField["serialization"]> => ({
  status: "CONFIRMED",
  sourceCardinality: "MULTI_SELECT",
  mode: "CONCAT_SELECTED_ITEMS",
  formula,
  delimiter,
  ordering: "SELECTED_ITEMS_ORDER",
  whitespace: "FORMULA_LITERAL",
  emptyValue: "EMPTY_STRING",
  escaping: "NONE",
  destination,
  downstreamConsumer,
});

const matrixEvidence: NonNullable<ProductManagementFormField["matrix"]> = {
  status: "PARTIAL",
  countrySources: {
    Thailand: "DB - MatrixProductManagement_TH",
    Philippines: "DB - MatrixProductManagement_PH",
    Vietnam: "DB - MatrixProductManagement_VN_MY_ID",
    Malaysia: "DB - MatrixProductManagement_VN_MY_ID",
    Indonesia: "DB - MatrixProductManagement_VN_MY_ID",
  },
  effectiveMatch: "REQUESTER_AS_MANAGER_ELSE_REQUESTER_MANAGER",
  activeApplied: false,
  departmentApplied: false,
  fallbackBehavior: "If no row has Manager equal to User().Email, filter Manager by Lower(Office365Users.ManagerV2(User().Email).mail)",
  blankBehavior: "No explicit guard for blank/error Manager lookup; no safe Portal policy established",
  duplicateRoleNameBehavior: "PRESERVED",
  ordering: "UNSORTED_FILTER_RESULT",
  authorityScope: "DROPDOWN_CANDIDATE_VISIBILITY_ONLY",
  ownerDecisionRequired: true,
};

const reuse = (
  businessMeaning: string,
  legacyField: string,
  sqlDestination: string,
): NonNullable<ProductManagementFormField["legacyFieldReuse"]> => ({
  businessMeaning,
  legacyField,
  flowUsage: `Get_item ${legacyField} is copied directly by Insert_row_(V2)_3`,
  sqlDestination,
  vstsUsage: "Business label/value appears through USR_PowerApp.Detail in Create_a_work_item_3 description; no topic-specific typed VSTS field",
  storageStatus: "LEGACY_STORAGE_CONFIRMED",
  businessMeaningStatus: "BUSINESS_MEANING_CONFIRMED",
  downstreamUsageStatus: "DOWNSTREAM_USAGE_CONFIRMED",
  ownerDecisionRequired: true,
});

const allAccountRoles: ProductManagementDerivedValueMetadata = {
  key: "allAccountRolesDetailFragment",
  status: "CONFIRMED",
  serialization: {
    status: "CONFIRMED",
    sourceCardinality: "DERIVED_LOOKUP",
    mode: "DERIVED_ACCOUNT_ROLES",
    formula: "With({roles: Filter(AccountRoleSource, Account = SelectedAccount)}, If(IsEmpty(roles), \"\", Left(Concat(roles, AccountRoleName & \", \"), Len(Concat(roles, AccountRoleName & \", \")) - 2)))",
    delimiter: ", ",
    ordering: "FILTER_RESULT_ORDER",
    whitespace: "FORMULA_LITERAL",
    emptyValue: "EMPTY_STRING",
    escaping: "NONE",
    destination: "USR_PowerApp.Detail -> SQL.Detail",
    downstreamConsumer: "Manager approval text and VSTS Create_a_work_item_3 description",
  },
  ownerDecisionRequired: false,
};

/**
 * Evidence-based registry from the offline Power Apps export. Source-closed
 * schemas can be CONFIRMED, but Product Management submission remains explicitly
 * disabled for every schema. Observed legacy behavior is not entitlement or
 * integration authority.
 */
export const productManagementSchemaRegistry: readonly ProductManagementSchemaRegistryEntry[] = [
  schema(productManagementTopics[0], "{CC}_สร้างAccountลูกค้า", [
    text("companyName", "Company Name", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "CompanyName(Product)", legacyLabel: "Company Name", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.CompanyName(Product); encoded in Detail -> SQL.Detail -> VSTS description", transformation: "English letters, digits, and spaces only" }),
    text("customerEmail", "Customer Email", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "Emailลูกค้า(Product)", legacyLabel: "Email ลูกค้า", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.Emailลูกค้า(Product) -> SQL.Email_Customer; also encoded in Detail", transformation: "Rejects more than one @ delimiter; otherwise preserves the raw text", serialization: rawText("DataCardValue18.Text is written directly and concatenated into Detail", "USR_PowerApp.Emailลูกค้า(Product) -> SQL.Email_Customer; also USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }),
    lookup("providerType", "Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "ProviderType(Product)", legacyLabel: "Name Provider Type", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.ProviderType(Product) -> SQL.EmailProviderType; also encoded in Detail" }),
    lookup("package", "Package", "package", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "Package(Product)", legacyLabel: "Package", legacyControl: "Classic/ComboBox", legacyBinding: "Selected.DisplayName", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - vw_ListPackageStandard aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.Package(Product); encoded in Detail -> SQL.Detail -> VSTS description" }),
    lookup("appName", "App Name", "appName", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "App Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned Sponsor App aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Concat each selected '[ AppID ] display' value with the exact ' , ' delimiter", serialization: selectedItems("Concat(App.SelectedItems, \"[ \" & AppID & \" ] \" & DisplayName, \" , \")", " , ", "USR_PowerApp.AppName(Product) -> SQL.AppName; also Detail", "SQL typed AppName and VSTS description through Detail") }),
    lookup("packageAddOn", "Package Add On", "packageAddOn", "CONFIRMED_OPTIONAL", "MULTIPLE", { legacyDataField: "PackageHid(Product)", legacyLabel: "Package Add On", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - vw_ListPackagHidden aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.PackageHid(Product) only; no Product Management SQL/VSTS mapping found", transformation: "Concat DisplayName values with the exact ' , ' delimiter", serialization: selectedItems("Concat(PackageAddOn.SelectedItems, DisplayName, \" , \")", " , ", "USR_PowerApp.PackageHid(Product) only", "No Product Management SQL parameter, Detail fragment, or VSTS field found") }),
  ], ["UNKNOWN_SUBMISSION_MAPPING"]),
  schema(productManagementTopics[1], "TH base; other {CC}_เพิ่ม Email เข้า Account(ลูกค้า)_{CC}", [
    text("customerEmail", "Customer Email", "CONFIRMED_REQUIRED", "UNKNOWN", { legacyDataField: "Emailลูกค้า(Product)", legacyLabel: "Email ลูกค้า", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.Emailลูกค้า(Product) -> SQL.Email_Customer; also encoded in Detail", transformation: "Raw text passthrough; no Split, Concat, Trim, validation, normalization, or escaping", serialization: rawText("DataCardValue18.Text is written directly and concatenated into Detail", "USR_PowerApp.Emailลูกค้า(Product) -> SQL.Email_Customer; also USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail", "PARTIAL") }),
    lookup("providerType", "Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "ProviderType(Product)", legacyLabel: "Name Provider Type", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.ProviderType(Product) -> SQL.EmailProviderType; also encoded in Detail" }),
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Concat AccountRoleName values with the exact ', ' delimiter", serialization: selectedItems("Concat(CustomerRole.SelectedItems, AccountRoleName, \", \")", ", ", "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also Detail", "SQL typed RoleName and VSTS description through Detail") }, ["account"]),
  ], ["UNKNOWN_MULTIPLICITY"]),
  schema(productManagementTopics[2], "{CC}_เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Concat AccountRoleName values with the exact ', ' delimiter", serialization: selectedItems("Concat(CustomerRole.SelectedItems, AccountRoleName, \", \")", ", ", "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also Detail", "SQL typed RoleName and VSTS description through Detail") }, ["account"]),
  ], []),
  schema(productManagementTopics[3], "TH base; other {CC}_เพิ่ม App เข้า Account(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("appName", "App Name", "appName", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "App Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned Sponsor App aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Concat each selected '[ AppID ] display' value with the exact ' , ' delimiter", serialization: selectedItems("Concat(App.SelectedItems, \"[ \" & AppID & \" ] \" & DisplayName, \" , \")", " , ", "USR_PowerApp.AppName(Product) -> SQL.AppName; also Detail", "SQL typed AppName and VSTS description through Detail") }),
  ], [], [allAccountRoles]),
  schema(productManagementTopics[4], "TH base; other {CC}_ขอสิทธิ์เข้า Role(พนักงาน)_{CC}", [
    lookup("internalRole", "Internal Role", "internalRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleInternal(Product)", legacyLabel: "Role Internal", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "TH, PH, or shared VN/MY/ID Matrix; effective routes use authenticated Manager fallback logic, not Department", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleInternal(Product) -> SQL.RoleInternal; also encoded in Detail", transformation: "Concat RoleName values with the exact ', ' delimiter", serialization: selectedItems("Concat(InternalRole.SelectedItems, RoleName, \", \")", ", ", "USR_PowerApp.RoleInternal(Product) -> SQL.RoleInternal; also Detail", "SQL typed RoleInternal and VSTS description through Detail"), matrix: matrixEvidence }, undefined, "AUTHENTICATED_USER_MANAGER_FALLBACK"),
  ], ["UNKNOWN_LOOKUP_AUTHORITY"]),
  schema(productManagementTopics[5], "TH base; other {CC}_เพิ่ม App เข้า Role(พนักงาน)_{CC}", [
    lookup("internalRole", "Internal Role", "internalRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "RoleInternal(Product)", legacyLabel: "Role Internal", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "TH, PH, or shared VN/MY/ID Matrix; effective routes use authenticated Manager fallback logic, not Department", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleInternal(Product) -> SQL.RoleInternal; also encoded in Detail", transformation: "Concat RoleName values with the exact ', ' delimiter", serialization: selectedItems("Concat(InternalRole.SelectedItems, RoleName, \", \")", ", ", "USR_PowerApp.RoleInternal(Product) -> SQL.RoleInternal; also Detail", "SQL typed RoleInternal and VSTS description through Detail"), matrix: matrixEvidence }, undefined, "AUTHENTICATED_USER_MANAGER_FALLBACK"),
    lookup("appName", "App Name", "appName", "CONFIRMED_OPTIONAL", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "App Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned Sponsor App aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Concat each selected '[ AppID ] display' value with the exact ' , ' delimiter; legacy submit guard does not require App", serialization: selectedItems("Concat(App.SelectedItems, \"[ \" & AppID & \" ] \" & DisplayName, \" , \")", " , ", "USR_PowerApp.AppName(Product) -> SQL.AppName; also Detail", "SQL typed AppName and VSTS description through Detail") }),
  ], ["UNKNOWN_LOOKUP_AUTHORITY", "LEGACY_REQUIREDNESS_ANOMALY"]),
  schema(productManagementTopics[6], "TH base; other {CC}_เพิ่ม Permission เข้า Role(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected.AccountRoleName", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail" }, ["account"]),
    text("featureList", "List Feature", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Feature", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Raw text is appended after the List Feature label; no list delimiter is interpreted", serialization: rawText("Detail = Topic + Account + Role + \"List Feature : \" + TextInput.Text", "USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }, "textarea"),
  ], []),
  schema(productManagementTopics[7], "TH base; other {CC}_เพิ่ม Package Add On(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("customerRole", "Customer Role", "customerRole", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "ProductName(Product)", legacyLabel: "Role Name", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - Account&Role_EX aliases filtered by Account", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.ProductName(Product) -> SQL.ProductName; also encoded in Detail", transformation: "Reuses ProductName(Product); Concat AccountRoleName values with the exact ', ' delimiter", serialization: selectedItems("Concat(CustomerRole.SelectedItems, AccountRoleName, \", \")", ", ", "USR_PowerApp.ProductName(Product) -> SQL.ProductName; also Detail", "SQL typed ProductName and VSTS description through Detail"), legacyFieldReuse: reuse("Customer Role for the selected Account", "ProductName(Product)", "dbo.UserRequest_ProductManagement.ProductName") }, ["account"]),
    lookup("packageAddOn", "Package Add On", "packageAddOn", "CONFIRMED_REQUIRED", "MULTIPLE", { legacyDataField: "AppName(Product)", legacyLabel: "Package Add On", legacyControl: "Classic/ComboBox", legacyBinding: "SelectedItems", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - vw_ListPackagHidden aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AppName(Product) -> SQL.AppName; also encoded in Detail", transformation: "Reuses AppName(Product); Concat Add-On DisplayName values with the exact ' , ' delimiter", serialization: selectedItems("Concat(PackageAddOn.SelectedItems, DisplayName, \" , \")", " , ", "USR_PowerApp.AppName(Product) -> SQL.AppName; also Detail", "SQL typed AppName and VSTS description through Detail"), legacyFieldReuse: reuse("Package Add On", "AppName(Product)", "dbo.UserRequest_ProductManagement.AppName") }),
  ], ["UNAPPROVED_LEGACY_FIELD_REUSE"]),
  schema(productManagementTopics[8], "{CC}_Create New Role สำหรับ Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    text("newRole", "Create Role Name", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Create Role Name", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail" }),
    text("featureList", "List Feature", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Feature", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Raw text is appended after the List Feature label; no list delimiter is interpreted", serialization: rawText("Detail = Topic + Account + CreateRole + \"List Feature : \" + TextInput.Text", "USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }, "textarea"),
  ], []),
  schema(productManagementTopics[9], "{CC}_เปลี่ยน Provider สำหรับ Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("providerType", "New Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Name Provider Type (New)", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Reuses RoleName(Product) for the new Provider Type", legacyFieldReuse: reuse("New Provider Type", "RoleName(Product)", "dbo.UserRequest_ProductManagement.RoleName") }),
    text("emailList", "List Email", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Email", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Raw text is appended after the List Email label; no list delimiter is interpreted", serialization: rawText("Detail = Topic + Account + NewProvider + \"List Email : \" + TextInput.Text", "USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }, "textarea"),
  ], ["UNAPPROVED_LEGACY_FIELD_REUSE"]),
  schema(productManagementTopics[10], "{CC}_Tranfer Owner Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    lookup("providerType", "New Provider Type", "providerType", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "RoleName(Product)", legacyLabel: "Name Provider Type (New)", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value", legacyDefault: "Select Providers Type sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded Provider Type choices", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.RoleName(Product) -> SQL.RoleName; also encoded in Detail", transformation: "Reuses RoleName(Product) for the new Provider Type", legacyFieldReuse: reuse("New Provider Type selected during Transfer Owner", "RoleName(Product)", "dbo.UserRequest_ProductManagement.RoleName") }),
    text("customerEmail", "Customer Email", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "Detail", legacyLabel: "Email ลูกค้า", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Raw text is appended after the Email label; no exported email-format validation", serialization: rawText("Detail = Topic + Account + NewProvider + \"Email : \" + TextInput.Text", "USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }),
  ], ["UNAPPROVED_LEGACY_FIELD_REUSE", "UNKNOWN_TARGET_EMAIL_SEMANTICS"]),
  schema(productManagementTopics[11], "{CC}_ลบ User ใน Account(ลูกค้า)", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    text("emailList", "List Email", "CONFIRMED_REQUIRED", "DELIMITED_TEXT", { legacyDataField: "Detail", legacyLabel: "List Email", legacyControl: "Classic/TextInput", legacyBinding: "Text", legacyDefault: "blank", legacyVisibility: "VISIBLE", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Raw text is appended after the List Email label; no list delimiter is interpreted", serialization: rawText("Detail = Topic + Account + \"List Email : \" + TextInput.Text", "USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }, "textarea"),
  ], []),
  schema(productManagementTopics[12], "{CC}_ขอเปิด_ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account", [
    lookup("account", "Account", "account", "CONFIRMED_REQUIRED", "SINGLE", { legacyDataField: "AccountName(Product)", legacyLabel: "Account Name", legacyControl: "Classic/ComboBox", legacyBinding: "Selected country account display column", legacyDefault: "blank", legacyVisibility: "VISIBLE", legacyLookupSource: "country-partitioned DB - AccountName_EX aliases", portalHandling: "ALLOW_EDIT", submitDestination: "USR_PowerApp.AccountName(Product) -> SQL.AccountName; also encoded in Detail" }),
    fixedChoice("notificationSetting", "Notification Setting", ["เปิด", "ปิด"], "CONFIRMED_REQUIRED", { legacyDataField: "Detail", legacyLabel: "Send Email BCC to Owner Account", legacyControl: "Classic/DropDown", legacyBinding: "Selected.Value through hidden TextInput", legacyDefault: "selection sentinel", legacyVisibility: "VISIBLE", legacyLookupSource: "hard-coded เปิด/ปิด choices", portalHandling: "ALLOW_EDIT", submitDestination: "encoded in USR_PowerApp.Detail -> SQL.Detail -> VSTS description", transformation: "Selected value is appended after the notification label; no dedicated typed SharePoint, SQL, or VSTS destination", serialization: rawText("Detail = Topic + Account + \"Send Email BCC to Owner Account : \" + Dropdown.Selected.Value", "USR_PowerApp.Detail -> SQL.Detail", "Manager approval and VSTS description through Detail") }),
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
      submissionEnabled: entry.submissionEnabled,
      ...(entry.derivedValues ? { derivedValues: entry.derivedValues } : {}),
    },
    fields: entry.fields,
  };
}
