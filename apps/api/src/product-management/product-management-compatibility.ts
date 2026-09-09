import {
  isProductManagementCountry,
  isProductManagementTopic,
  productManagementForm,
  type ProductManagementCountry,
  type ProductManagementTopic,
} from "./product-management-model.js";

export const legacyProductManagementFieldNames = [
  "ID_Employee",
  "Company_",
  "Department",
  "Sysytem_",
  "Topic_Request",
  "Title",
  "Country",
  "Type_ALL",
  "Sub_Type",
  "Impact_Case",
  "AssignTo",
  "Detail",
  "CompanyName(Product)",
  "Emailลูกค้า(Product)",
  "ProviderType(Product)",
  "Package(Product)",
  "AppName(Product)",
  "PackageHid(Product)",
  "AccountName(Product)",
  "RoleName(Product)",
  "RoleInternal(Product)",
  "ProductName(Product)",
] as const;

export type LegacyProductManagementFieldName = (typeof legacyProductManagementFieldNames)[number];
export type LegacyProductManagementPayload = Readonly<Partial<Record<LegacyProductManagementFieldName, string>>> & Readonly<{
  ID_Employee: string;
  Company_: string;
  Department: string;
  Sysytem_: "Product Management";
  Topic_Request: ProductManagementTopic;
  Title: string;
  Country: ProductManagementCountry;
  Type_ALL: "Product Management";
  Sub_Type: "Product Management";
  Impact_Case: "User Request";
  AssignTo: string;
  Detail: string;
}>;

export interface ProductManagementServerContext {
  readonly source: "AUTHENTICATED_SERVER_CONTEXT";
  readonly requesterDisplayName: string;
  readonly requesterEmail: string;
  readonly department: string;
}

export interface ProductManagementLegacyConfiguration {
  readonly source: "APPROVED_SERVER_CONFIGURATION";
  readonly company: string;
  readonly assignTo: string;
}

export interface StableSelection {
  readonly stableKey: string;
  readonly displayName: string;
}

export interface AppSelection extends StableSelection {
  readonly appId: string;
}

export interface AccountRoleSelection {
  readonly stableKey: string;
  readonly accountStableKey: string;
  readonly roleName: string;
}

export interface InternalRoleSelection {
  readonly stableKey: string;
  readonly roleName: string;
  readonly active: true | false | "UNKNOWN";
  readonly managerResolution: "RESOLVED" | "UNRESOLVED";
}

interface CompatibilityInputBase {
  readonly country: ProductManagementCountry;
  readonly serverContext: ProductManagementServerContext;
  readonly legacyConfiguration: ProductManagementLegacyConfiguration;
}

export type ProductManagementCompatibilityInput =
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.createAccount; fields: Readonly<{ companyName: string; customerEmail: string; providerType: string; package: StableSelection; apps: readonly AppSelection[]; packageAddOns: readonly StableSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.addCustomerEmail; fields: Readonly<{ customerEmails: readonly string[]; providerType: string; account: StableSelection; customerRoles: readonly AccountRoleSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.addEmployeeEmail; fields: Readonly<{ account: StableSelection; customerRoles: readonly AccountRoleSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.addAccountApp; fields: Readonly<{ account: StableSelection; apps: readonly AppSelection[]; accountRoleCandidates: readonly AccountRoleSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.requestInternalRole; fields: Readonly<{ internalRoles: readonly InternalRoleSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.addInternalRoleApp; fields: Readonly<{ internalRoles: readonly InternalRoleSelection[]; apps: readonly AppSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.addPermission; fields: Readonly<{ account: StableSelection; customerRole: AccountRoleSelection; featureList: string }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.addPackageAddOn; fields: Readonly<{ account: StableSelection; customerRoles: readonly AccountRoleSelection[]; packageAddOns: readonly StableSelection[] }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.createAccountRole; fields: Readonly<{ account: StableSelection; newRole: string; featureList: string }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.changeProvider; fields: Readonly<{ account: StableSelection; providerType: string; emailList: string }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.transferOwner; fields: Readonly<{ account: StableSelection; providerType: string; customerEmail: string }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.removeAccountUser; fields: Readonly<{ account: StableSelection; emailList: string }> }>)
  | (CompatibilityInputBase & Readonly<{ topic: typeof topics.notification; fields: Readonly<{ account: StableSelection; notificationSetting: "เปิด" | "ปิด" }> }>);

export interface ProductManagementCompatibilityValidation {
  readonly status: "PASS";
  readonly errors: readonly [];
}

export interface ProductManagementCompatibilityPreview {
  readonly mode: "DRY_RUN";
  readonly topic: ProductManagementTopic;
  readonly sourceContractStatus: "CONFIRMED";
  readonly mappedLegacyFields: Readonly<Partial<Record<LegacyProductManagementFieldName, string>>>;
  readonly omittedFields: readonly LegacyProductManagementFieldName[];
  readonly serializationWarnings: readonly string[];
  readonly compatibilityNotes: readonly string[];
  readonly validation: ProductManagementCompatibilityValidation;
  readonly submissionAllowed: false;
  readonly adapterEnabled: false;
  readonly portalApprovalCreated: false;
  readonly sideEffects: Readonly<{
    network: false;
    databaseWrite: false;
    legacyWrite: false;
    approvalTask: false;
    auditEvent: false;
    provisioningTask: false;
  }>;
}

export class ProductManagementCompatibilityError extends Error {
  readonly code = "PRODUCT_MANAGEMENT_COMPATIBILITY_VALIDATION_FAILED";
  constructor(readonly errors: readonly string[]) {
    super("Product Management compatibility validation failed.");
    this.name = "ProductManagementCompatibilityError";
  }
}

export class ProductManagementRuntimeSafetyError extends Error {
  readonly code = "PRODUCT_MANAGEMENT_RUNTIME_SAFETY_VIOLATION";
  constructor(message: string) {
    super(message);
    this.name = "ProductManagementRuntimeSafetyError";
  }
}

export interface ProductManagementRuntimeSafetyConfiguration {
  readonly dataSource: "MOCK";
  readonly submissionEnabled: false;
  readonly adapterEnabled: false;
}

export interface ProductManagementSubmissionAdapter {
  readonly mode: "DISABLED";
  submit(payload: LegacyProductManagementPayload): Promise<never>;
}

export class DisabledProductManagementSubmissionAdapter implements ProductManagementSubmissionAdapter {
  readonly mode = "DISABLED" as const;
  async submit(_payload: LegacyProductManagementPayload): Promise<never> {
    throw new ProductManagementRuntimeSafetyError("Product Management submission adapter is disabled.");
  }
}

type Environment = Readonly<Record<string, string | undefined>>;

export function readProductManagementRuntimeSafety(environment: Environment): ProductManagementRuntimeSafetyConfiguration {
  const source = environment.PRODUCT_MANAGEMENT_DATA_SOURCE?.trim().toLowerCase() || "mock";
  const submission = environment.PRODUCT_MANAGEMENT_SUBMISSION_ENABLED?.trim().toLowerCase() || "false";
  const realAdapter = environment.PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED?.trim().toLowerCase() || "false";
  if (source !== "mock") throw new ProductManagementRuntimeSafetyError("Real Product Management data source is not allowed for compatibility preview.");
  if (submission !== "false") throw new ProductManagementRuntimeSafetyError("Product Management submission must remain disabled.");
  if (realAdapter !== "false") throw new ProductManagementRuntimeSafetyError("A real Product Management adapter cannot be enabled in PM-05.");
  return { dataSource: "MOCK", submissionEnabled: false, adapterEnabled: false };
}

const topics = {
  createAccount: "Create New Account (ลูกค้าใหม่)",
  addCustomerEmail: "เพิ่ม Email เข้า Account(ลูกค้า)",
  addEmployeeEmail: "เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)",
  addAccountApp: "เพิ่ม App เข้า Account(ลูกค้า)",
  requestInternalRole: "ขอสิทธิ์เข้า Role(พนักงาน)",
  addInternalRoleApp: "เพิ่ม App เข้า Role(พนักงาน)",
  addPermission: "เพิ่ม Permission เข้า Role(ลูกค้า)",
  addPackageAddOn: "เพิ่ม Package Add On(ลูกค้า)",
  createAccountRole: "Create New Role สำหรับ Account(ลูกค้า)",
  changeProvider: "เปลี่ยน Provider สำหรับ Account(ลูกค้า)",
  transferOwner: "Tranfer Owner Account(ลูกค้า)",
  removeAccountUser: "ลบ User ใน Account(ลูกค้า)",
  notification: "ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account",
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const commonFieldNames = legacyProductManagementFieldNames.slice(0, 12);
const identityFields = new Set<LegacyProductManagementFieldName>(["ID_Employee", "Department", "Title", "AssignTo"]);

function nonBlank(value: unknown, field: string, errors: string[]): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field}:REQUIRED`);
    return false;
  }
  return true;
}

function exactKeys(value: unknown, expected: readonly string[], field: string, errors: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${field}:INVALID_OBJECT`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    errors.push(`${field}:UNKNOWN_OR_MISSING_FIELDS`);
    return false;
  }
  return true;
}

function validateStableSelection(value: unknown, field: string, errors: string[]): value is StableSelection {
  if (!exactKeys(value, ["stableKey", "displayName"], field, errors)) return false;
  return nonBlank(value.stableKey, `${field}.stableKey`, errors) && nonBlank(value.displayName, `${field}.displayName`, errors);
}

function validateStableSelections(value: unknown, field: string, required: boolean, errors: string[]): value is readonly StableSelection[] {
  if (!Array.isArray(value) || (required && value.length === 0)) {
    errors.push(`${field}:REQUIRED_ARRAY`);
    return false;
  }
  return value.every((item, index) => validateStableSelection(item, `${field}[${index}]`, errors));
}

function validateApps(value: unknown, field: string, errors: string[]): value is readonly AppSelection[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${field}:REQUIRED_ARRAY`);
    return false;
  }
  return value.every((item, index) => {
    const path = `${field}[${index}]`;
    if (!exactKeys(item, ["stableKey", "appId", "displayName"], path, errors)) return false;
    return nonBlank(item.stableKey, `${path}.stableKey`, errors)
      && nonBlank(item.appId, `${path}.appId`, errors)
      && nonBlank(item.displayName, `${path}.displayName`, errors);
  });
}

function validateAccountRoles(value: unknown, account: StableSelection, field: string, required: boolean, errors: string[], allowOtherAccounts = false): value is readonly AccountRoleSelection[] {
  if (!Array.isArray(value) || (required && value.length === 0)) {
    errors.push(`${field}:REQUIRED_ARRAY`);
    return false;
  }
  const seenKeys = new Set<string>();
  const seenNames = new Set<string>();
  return value.every((item, index) => {
    const path = `${field}[${index}]`;
    if (!exactKeys(item, ["stableKey", "accountStableKey", "roleName"], path, errors)) return false;
    const valid = nonBlank(item.stableKey, `${path}.stableKey`, errors)
      && nonBlank(item.accountStableKey, `${path}.accountStableKey`, errors)
      && nonBlank(item.roleName, `${path}.roleName`, errors);
    if (valid) {
      const role = item as unknown as AccountRoleSelection;
      if (!allowOtherAccounts && role.accountStableKey !== account.stableKey) errors.push(`${path}:ACCOUNT_MISMATCH`);
      if (seenKeys.has(role.stableKey)) errors.push(`${path}:DUPLICATE_STABLE_KEY`);
      const normalizedName = role.roleName.trim().toLocaleLowerCase("en-US");
      if (!allowOtherAccounts && seenNames.has(normalizedName)) errors.push(`${path}:DUPLICATE_ROLE_NAME_AMBIGUOUS`);
      seenKeys.add(role.stableKey);
      seenNames.add(normalizedName);
    }
    return valid;
  });
}

function validateInternalRoles(value: unknown, errors: string[]): value is readonly InternalRoleSelection[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("fields.internalRoles:REQUIRED_ARRAY");
    return false;
  }
  const seenKeys = new Set<string>();
  const seenNames = new Set<string>();
  return value.every((item, index) => {
    const path = `fields.internalRoles[${index}]`;
    if (!exactKeys(item, ["stableKey", "roleName", "active", "managerResolution"], path, errors)) return false;
    const valid = nonBlank(item.stableKey, `${path}.stableKey`, errors) && nonBlank(item.roleName, `${path}.roleName`, errors);
    if (item.active !== true) errors.push(`${path}:ACTIVE_NOT_TRUE`);
    if (item.managerResolution !== "RESOLVED") errors.push(`${path}:MANAGER_UNRESOLVED`);
    if (valid) {
      const role = item as unknown as InternalRoleSelection;
      if (seenKeys.has(role.stableKey)) errors.push(`${path}:DUPLICATE_STABLE_KEY`);
      const normalizedName = role.roleName.trim().toLocaleLowerCase("en-US");
      if (seenNames.has(normalizedName)) errors.push(`${path}:DUPLICATE_ROLE_NAME_AMBIGUOUS`);
      seenKeys.add(role.stableKey);
      seenNames.add(normalizedName);
    }
    return valid;
  });
}

function validateEmail(value: unknown, field: string, errors: string[]): value is string {
  if (!nonBlank(value, field, errors)) return false;
  if (!emailPattern.test(value)) {
    errors.push(`${field}:INVALID_EMAIL`);
    return false;
  }
  return true;
}

function validateEmailArray(value: unknown, errors: string[]): value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("fields.customerEmails:REQUIRED_ARRAY");
    return false;
  }
  const normalized = value.map((item) => typeof item === "string" ? item.trim() : item);
  normalized.forEach((item, index) => validateEmail(item, `fields.customerEmails[${index}]`, errors));
  const strings = normalized.filter((item): item is string => typeof item === "string");
  if (new Set(strings.map((item) => item.toLocaleLowerCase("en-US"))).size !== strings.length) {
    errors.push("fields.customerEmails:DUPLICATE_NORMALIZED_EMAIL");
  }
  return errors.length === 0;
}

function validateCommon(input: ProductManagementCompatibilityInput, errors: string[]): void {
  if (!isProductManagementCountry(input.country)) errors.push("country:UNSUPPORTED");
  if (!isProductManagementTopic(input.topic)) errors.push("topic:UNSUPPORTED");
  if (!exactKeys(input.serverContext, ["source", "requesterDisplayName", "requesterEmail", "department"], "serverContext", errors)) return;
  if (input.serverContext.source !== "AUTHENTICATED_SERVER_CONTEXT") errors.push("serverContext.source:UNTRUSTED");
  nonBlank(input.serverContext.requesterDisplayName, "serverContext.requesterDisplayName", errors);
  validateEmail(input.serverContext.requesterEmail, "serverContext.requesterEmail", errors);
  nonBlank(input.serverContext.department, "serverContext.department", errors);
  if (!exactKeys(input.legacyConfiguration, ["source", "company", "assignTo"], "legacyConfiguration", errors)) return;
  if (input.legacyConfiguration.source !== "APPROVED_SERVER_CONFIGURATION") errors.push("legacyConfiguration.source:UNTRUSTED");
  nonBlank(input.legacyConfiguration.company, "legacyConfiguration.company", errors);
  validateEmail(input.legacyConfiguration.assignTo, "legacyConfiguration.assignTo", errors);
}

function validateInput(input: ProductManagementCompatibilityInput): void {
  const errors: string[] = [];
  if (!exactKeys(input, ["country", "topic", "serverContext", "legacyConfiguration", "fields"], "request", errors)) throw new ProductManagementCompatibilityError(errors);
  validateCommon(input, errors);
  const fields: Record<string, unknown> = input.fields;
  switch (input.topic) {
    case topics.createAccount:
      if (exactKeys(fields, ["companyName", "customerEmail", "providerType", "package", "apps", "packageAddOns"], "fields", errors)) {
        nonBlank(fields.companyName, "fields.companyName", errors);
        validateEmail(fields.customerEmail, "fields.customerEmail", errors);
        nonBlank(fields.providerType, "fields.providerType", errors);
        validateStableSelection(fields.package, "fields.package", errors);
        validateApps(fields.apps, "fields.apps", errors);
        validateStableSelections(fields.packageAddOns, "fields.packageAddOns", false, errors);
      }
      break;
    case topics.addCustomerEmail:
      if (exactKeys(fields, ["customerEmails", "providerType", "account", "customerRoles"], "fields", errors)) {
        validateEmailArray(fields.customerEmails, errors);
        nonBlank(fields.providerType, "fields.providerType", errors);
        if (validateStableSelection(fields.account, "fields.account", errors)) validateAccountRoles(fields.customerRoles, fields.account, "fields.customerRoles", true, errors);
      }
      break;
    case topics.addEmployeeEmail:
      if (exactKeys(fields, ["account", "customerRoles"], "fields", errors) && validateStableSelection(fields.account, "fields.account", errors)) validateAccountRoles(fields.customerRoles, fields.account, "fields.customerRoles", true, errors);
      break;
    case topics.addAccountApp:
      if (exactKeys(fields, ["account", "apps", "accountRoleCandidates"], "fields", errors) && validateStableSelection(fields.account, "fields.account", errors)) {
        validateApps(fields.apps, "fields.apps", errors);
        validateAccountRoles(fields.accountRoleCandidates, fields.account, "fields.accountRoleCandidates", false, errors, true);
      }
      break;
    case topics.requestInternalRole:
      if (exactKeys(fields, ["internalRoles"], "fields", errors)) validateInternalRoles(fields.internalRoles, errors);
      break;
    case topics.addInternalRoleApp:
      if (exactKeys(fields, ["internalRoles", "apps"], "fields", errors)) {
        validateInternalRoles(fields.internalRoles, errors);
        validateApps(fields.apps, "fields.apps", errors);
      }
      break;
    case topics.addPermission:
      if (exactKeys(fields, ["account", "customerRole", "featureList"], "fields", errors) && validateStableSelection(fields.account, "fields.account", errors)) {
        validateAccountRoles([fields.customerRole], fields.account, "fields.customerRole", true, errors);
        nonBlank(fields.featureList, "fields.featureList", errors);
      }
      break;
    case topics.addPackageAddOn:
      if (exactKeys(fields, ["account", "customerRoles", "packageAddOns"], "fields", errors) && validateStableSelection(fields.account, "fields.account", errors)) {
        validateAccountRoles(fields.customerRoles, fields.account, "fields.customerRoles", true, errors);
        validateStableSelections(fields.packageAddOns, "fields.packageAddOns", true, errors);
      }
      break;
    case topics.createAccountRole:
      if (exactKeys(fields, ["account", "newRole", "featureList"], "fields", errors)) {
        validateStableSelection(fields.account, "fields.account", errors);
        nonBlank(fields.newRole, "fields.newRole", errors);
        nonBlank(fields.featureList, "fields.featureList", errors);
      }
      break;
    case topics.changeProvider:
      if (exactKeys(fields, ["account", "providerType", "emailList"], "fields", errors)) {
        validateStableSelection(fields.account, "fields.account", errors);
        nonBlank(fields.providerType, "fields.providerType", errors);
        nonBlank(fields.emailList, "fields.emailList", errors);
      }
      break;
    case topics.transferOwner:
      if (exactKeys(fields, ["account", "providerType", "customerEmail"], "fields", errors)) {
        validateStableSelection(fields.account, "fields.account", errors);
        nonBlank(fields.providerType, "fields.providerType", errors);
        nonBlank(fields.customerEmail, "fields.customerEmail", errors);
      }
      break;
    case topics.removeAccountUser:
      if (exactKeys(fields, ["account", "emailList"], "fields", errors)) {
        validateStableSelection(fields.account, "fields.account", errors);
        nonBlank(fields.emailList, "fields.emailList", errors);
      }
      break;
    case topics.notification:
      if (exactKeys(fields, ["account", "notificationSetting"], "fields", errors)) {
        validateStableSelection(fields.account, "fields.account", errors);
        if (fields.notificationSetting !== "เปิด" && fields.notificationSetting !== "ปิด") errors.push("fields.notificationSetting:UNSUPPORTED");
      }
      break;
    default:
      errors.push("topic:UNSUPPORTED");
  }
  if (isProductManagementCountry(input.country) && isProductManagementTopic(input.topic)
    && productManagementForm(input.country, input.topic).schema.implementationStatus !== "CONFIRMED") {
    errors.push("sourceContractStatus:NOT_CONFIRMED");
  }
  if (errors.length) throw new ProductManagementCompatibilityError(errors);
}

function concatTrailing(values: readonly string[], delimiter: string): string {
  return values.map((value) => `${value}${delimiter}`).join("");
}

function serializeApps(values: readonly AppSelection[]): string {
  return concatTrailing(values.map((value) => `[ ${value.appId} ] ${value.displayName}`), " , ");
}

function serializeRoles(values: readonly { readonly roleName: string }[]): string {
  return concatTrailing(values.map((value) => value.roleName), ", ");
}

function commonPayload(input: ProductManagementCompatibilityInput, detail: string): LegacyProductManagementPayload {
  return {
    ID_Employee: input.serverContext.requesterDisplayName,
    Company_: input.legacyConfiguration.company,
    Department: input.serverContext.department,
    Sysytem_: "Product Management",
    Topic_Request: input.topic,
    Title: input.serverContext.requesterEmail,
    Country: input.country,
    Type_ALL: "Product Management",
    Sub_Type: "Product Management",
    Impact_Case: "User Request",
    AssignTo: input.legacyConfiguration.assignTo,
    Detail: detail,
  };
}

export function serializeProductManagementCompatibilityPayload(input: ProductManagementCompatibilityInput): LegacyProductManagementPayload {
  validateInput(input);
  const first = `หัวข้อ: ${input.topic}`;
  switch (input.topic) {
    case topics.createAccount: {
      const f = input.fields;
      const apps = serializeApps(f.apps);
      const payload: LegacyProductManagementPayload = {
        ...commonPayload(input, [first, `Company Name : ${f.companyName}`, `Email (ลูกค้า) : ${f.customerEmail}`, `Providers Type : ${f.providerType}`, `Package : ${f.package.displayName}`, `App Name : ${apps}`].join(" \n")),
        "CompanyName(Product)": f.companyName,
        "Emailลูกค้า(Product)": f.customerEmail,
        "ProviderType(Product)": f.providerType,
        "Package(Product)": f.package.displayName,
        "AppName(Product)": apps,
        ...(f.packageAddOns.length ? { "PackageHid(Product)": concatTrailing(f.packageAddOns.map((value) => value.displayName), " , ") } : {}),
      };
      return payload;
    }
    case topics.addCustomerEmail: {
      const f = input.fields;
      const roles = serializeRoles(f.customerRoles);
      const emails = f.customerEmails.map((value) => value.trim()).join(", ");
      return {
        ...commonPayload(input, [first, `Email (ลูกค้า) : ${emails}`, `Providers Type : ${f.providerType}`, `Account Name : ${f.account.displayName}`, `Role Name : ${roles}`].join(" \n")),
        "Emailลูกค้า(Product)": emails,
        "ProviderType(Product)": f.providerType,
        "AccountName(Product)": f.account.displayName,
        "RoleName(Product)": roles,
      };
    }
    case topics.addEmployeeEmail: {
      const f = input.fields;
      const roles = serializeRoles(f.customerRoles);
      return {
        ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Role Name : ${roles}`].join(" \n")),
        "AccountName(Product)": f.account.displayName,
        "RoleName(Product)": roles,
      };
    }
    case topics.addAccountApp: {
      const f = input.fields;
      const apps = serializeApps(f.apps);
      const allRoles = f.accountRoleCandidates.filter((value) => value.accountStableKey === f.account.stableKey).map((value) => value.roleName).join(", ");
      return {
        ...commonPayload(input, `${first} \nAccount Name : ${f.account.displayName}\nApp Name : ${apps}\nRole Name : ${allRoles}`),
        "AccountName(Product)": f.account.displayName,
        "AppName(Product)": apps,
      };
    }
    case topics.requestInternalRole: {
      const f = input.fields;
      const roles = serializeRoles(f.internalRoles);
      return { ...commonPayload(input, [first, `Role Internal : ${roles}`].join(" \n")), "RoleInternal(Product)": roles };
    }
    case topics.addInternalRoleApp: {
      const f = input.fields;
      const roles = serializeRoles(f.internalRoles);
      const apps = serializeApps(f.apps);
      return { ...commonPayload(input, [first, `Role Internal : ${roles}`, `App Name : ${apps}`].join(" \n")), "RoleInternal(Product)": roles, "AppName(Product)": apps };
    }
    case topics.addPermission: {
      const f = input.fields;
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Role Name : ${f.customerRole.roleName}`, `List Feature : ${f.featureList}`].join(" \n")), "AccountName(Product)": f.account.displayName, "RoleName(Product)": f.customerRole.roleName };
    }
    case topics.addPackageAddOn: {
      const f = input.fields;
      const roles = serializeRoles(f.customerRoles);
      const addOns = concatTrailing(f.packageAddOns.map((value) => value.displayName), " , ");
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Role Name : ${roles}`, `Package Add On : ${addOns}`].join(" \n")), "AccountName(Product)": f.account.displayName, "ProductName(Product)": roles, "AppName(Product)": addOns };
    }
    case topics.createAccountRole: {
      const f = input.fields;
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Create Role Name : ${f.newRole}`, `List Feature : ${f.featureList}`].join(" \n")), "AccountName(Product)": f.account.displayName, "RoleName(Product)": f.newRole };
    }
    case topics.changeProvider: {
      const f = input.fields;
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Name Provider Type (New) : ${f.providerType}`, `List Email : ${f.emailList}`].join(" \n")), "AccountName(Product)": f.account.displayName, "RoleName(Product)": f.providerType };
    }
    case topics.transferOwner: {
      const f = input.fields;
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Name Provider Type (New) : ${f.providerType}`, `Email : ${f.customerEmail}`].join(" \n")), "AccountName(Product)": f.account.displayName, "RoleName(Product)": f.providerType };
    }
    case topics.removeAccountUser: {
      const f = input.fields;
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `List Email : ${f.emailList}`].join(" \n")), "AccountName(Product)": f.account.displayName };
    }
    case topics.notification: {
      const f = input.fields;
      return { ...commonPayload(input, [first, `Account Name : ${f.account.displayName}`, `Send Email BCC to Owner Account : ${f.notificationSetting}`].join(" \n")), "AccountName(Product)": f.account.displayName };
    }
  }
}

function expectedTopicFields(topic: ProductManagementTopic, payload: LegacyProductManagementPayload): readonly LegacyProductManagementFieldName[] {
  const optionalPackage = topic === topics.createAccount && payload["PackageHid(Product)"] !== undefined ? ["PackageHid(Product)" as const] : [];
  switch (topic) {
    case topics.createAccount: return ["CompanyName(Product)", "Emailลูกค้า(Product)", "ProviderType(Product)", "Package(Product)", "AppName(Product)", ...optionalPackage];
    case topics.addCustomerEmail: return ["Emailลูกค้า(Product)", "ProviderType(Product)", "AccountName(Product)", "RoleName(Product)"];
    case topics.addEmployeeEmail: return ["AccountName(Product)", "RoleName(Product)"];
    case topics.addAccountApp: return ["AccountName(Product)", "AppName(Product)"];
    case topics.requestInternalRole: return ["RoleInternal(Product)"];
    case topics.addInternalRoleApp: return ["RoleInternal(Product)", "AppName(Product)"];
    case topics.addPermission: return ["AccountName(Product)", "RoleName(Product)"];
    case topics.addPackageAddOn: return ["AccountName(Product)", "ProductName(Product)", "AppName(Product)"];
    case topics.createAccountRole: return ["AccountName(Product)", "RoleName(Product)"];
    case topics.changeProvider: return ["AccountName(Product)", "RoleName(Product)"];
    case topics.transferOwner: return ["AccountName(Product)", "RoleName(Product)"];
    case topics.removeAccountUser: return ["AccountName(Product)"];
    case topics.notification: return ["AccountName(Product)"];
  }
}

export function validateProductManagementCompatibilityPayload(input: ProductManagementCompatibilityInput, payload: LegacyProductManagementPayload): readonly string[] {
  const errors: string[] = [];
  const serialized = serializeProductManagementCompatibilityPayload(input);
  const allowed = new Set<string>(legacyProductManagementFieldNames);
  for (const key of Object.keys(payload)) if (!allowed.has(key)) errors.push(`${key}:UNKNOWN_LEGACY_FIELD`);
  const expected = new Set<LegacyProductManagementFieldName>([...commonFieldNames, ...expectedTopicFields(input.topic, serialized)]);
  for (const key of expected) if (typeof payload[key] !== "string" || payload[key]!.length === 0) errors.push(`${key}:MISSING`);
  for (const key of expected) if (payload[key] !== serialized[key]) errors.push(`${key}:SERIALIZATION_MISMATCH`);
  for (const key of legacyProductManagementFieldNames) if (!expected.has(key) && payload[key] !== undefined) errors.push(`${key}:FORBIDDEN_FOR_TOPIC`);
  if (payload.Sysytem_ !== "Product Management" || payload.Type_ALL !== "Product Management" || payload.Sub_Type !== "Product Management") errors.push("SYSTEM_CLASSIFICATION:MISMATCH");
  if (payload.Topic_Request !== input.topic || payload.Country !== input.country) errors.push("ROUTE_CONTEXT:MISMATCH");
  if (input.topic === topics.transferOwner && payload["Emailลูกค้า(Product)"] !== undefined) errors.push("Emailลูกค้า(Product):TRANSFER_OWNER_DETAIL_ONLY");
  if (input.topic === topics.notification && Object.keys(payload).some((key) => key !== "AccountName(Product)" && key.endsWith("(Product)"))) errors.push("NOTIFICATION:TYPED_FIELD_FORBIDDEN");
  return errors;
}

function sanitizePayload(payload: LegacyProductManagementPayload): Readonly<Partial<Record<LegacyProductManagementFieldName, string>>> {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
    const field = key as LegacyProductManagementFieldName;
    if (identityFields.has(field)) return [field, "[REDACTED_SERVER_CONTEXT]"];
    if (field === "Emailลูกค้า(Product)") return [field, "[REDACTED_EMAIL_LIST]"];
    return [field, value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")];
  })) as Readonly<Partial<Record<LegacyProductManagementFieldName, string>>>;
}

function warnings(input: ProductManagementCompatibilityInput): readonly string[] {
  const values = ["DRY_RUN_NOT_SUBMITTED"];
  if ([topics.addPermission, topics.createAccountRole, topics.changeProvider, topics.transferOwner, topics.removeAccountUser].includes(input.topic as never)) values.push("RAW_TEXT_PASSTHROUGH_NO_PARSING");
  if ([topics.addPackageAddOn, topics.changeProvider, topics.transferOwner].includes(input.topic as never)) values.push("OWNER_APPROVED_OVERLOADED_LEGACY_FIELD");
  if (input.topic === topics.createAccount) values.push("PACKAGE_ADD_ON_SHAREPOINT_ONLY");
  if (input.topic === topics.addAccountApp) values.push("ALL_ACCOUNT_ROLES_FILTER_ORDER_PRESERVED");
  if (input.topic === topics.notification) values.push("NOTIFICATION_DETAIL_ONLY");
  return values;
}

function notes(input: ProductManagementCompatibilityInput): readonly string[] {
  const values = [
    "Legacy Power Automate and Microsoft Teams retain Phase 1 approval ownership.",
    "Portal Product Management approval is not created.",
  ];
  if (input.topic === topics.addCustomerEmail) values.push("Canonical email array serialized with PM-05 comma-space adapter grammar v1.");
  if (input.topic === topics.transferOwner) values.push("Customer Email is carried through Detail only and grants no identity or ownership authority.");
  if (input.topic === topics.createAccount) values.push("PackageHid(Product) is intentionally omitted from Detail, SQL, approval, and VSTS compatibility paths.");
  return values;
}

export class ProductManagementCompatibilityPreviewService {
  private readonly safety: ProductManagementRuntimeSafetyConfiguration;
  constructor(environment: Environment = {}) {
    this.safety = readProductManagementRuntimeSafety(environment);
  }

  preview(input: ProductManagementCompatibilityInput): ProductManagementCompatibilityPreview {
    const payload = serializeProductManagementCompatibilityPayload(input);
    const validationErrors = validateProductManagementCompatibilityPayload(input, payload);
    if (validationErrors.length) throw new ProductManagementCompatibilityError(validationErrors);
    const present = new Set(Object.keys(payload));
    return {
      mode: "DRY_RUN",
      topic: input.topic,
      sourceContractStatus: "CONFIRMED",
      mappedLegacyFields: sanitizePayload(payload),
      omittedFields: legacyProductManagementFieldNames.filter((field) => !present.has(field)),
      serializationWarnings: warnings(input),
      compatibilityNotes: notes(input),
      validation: { status: "PASS", errors: [] },
      submissionAllowed: this.safety.submissionEnabled,
      adapterEnabled: this.safety.adapterEnabled,
      portalApprovalCreated: false,
      sideEffects: { network: false, databaseWrite: false, legacyWrite: false, approvalTask: false, auditEvent: false, provisioningTask: false },
    };
  }
}
