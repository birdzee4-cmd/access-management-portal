import type {
  LegacyProductManagementFieldName,
  ProductManagementCompatibilityInput,
} from "./product-management-compatibility.js";
import { productManagementTopics } from "./product-management-model.js";

export interface ProductManagementCompatibilityFixture {
  readonly name: string;
  readonly input: ProductManagementCompatibilityInput;
  readonly expectedTopicFields: Readonly<Partial<Record<LegacyProductManagementFieldName, string>>>;
  readonly expectedDetail: string;
}

const serverContext = {
  source: "AUTHENTICATED_SERVER_CONTEXT",
  requesterDisplayName: "Synthetic Requester PM05",
  requesterEmail: "requester.pm05@example.invalid",
  department: "Synthetic Department PM05",
} as const;

const legacyConfiguration = {
  source: "APPROVED_SERVER_CONFIGURATION",
  company: "Synthetic Organization PM05",
  assignTo: "routing.pm05@example.invalid",
} as const;

const account = { stableKey: "synthetic-account-001", displayName: "Synthetic Account PM05" } as const;
const otherAccount = { stableKey: "synthetic-account-002", displayName: "Synthetic Other Account PM05" } as const;
const roleA = { stableKey: "synthetic-role-001", accountStableKey: account.stableKey, roleName: "Synthetic Customer Role A" } as const;
const roleB = { stableKey: "synthetic-role-002", accountStableKey: account.stableKey, roleName: "Synthetic Customer Role B" } as const;
const otherRole = { stableKey: "synthetic-role-003", accountStableKey: otherAccount.stableKey, roleName: "Synthetic Other Account Role" } as const;
const internalRole = { stableKey: "synthetic-internal-role-001", roleName: "Synthetic Internal Role", active: true, managerResolution: "RESOLVED" } as const;
const apps = [
  { stableKey: "synthetic-app-001", appId: "SYN-APP-001", displayName: "Synthetic App A" },
  { stableKey: "synthetic-app-002", appId: "SYN-APP-002", displayName: "Synthetic App B" },
] as const;
const serializedApps = "[ SYN-APP-001 ] Synthetic App A , [ SYN-APP-002 ] Synthetic App B , ";
const serializedRoles = "Synthetic Customer Role A, Synthetic Customer Role B, ";
const addOns = [
  { stableKey: "synthetic-addon-001", displayName: "Synthetic Add-On A" },
  { stableKey: "synthetic-addon-002", displayName: "Synthetic Add-On B" },
] as const;
const serializedAddOns = "Synthetic Add-On A , Synthetic Add-On B , ";

function base<T extends (typeof productManagementTopics)[number]>(topic: T) {
  return { country: "Thailand", topic, serverContext, legacyConfiguration } as const;
}

export const productManagementCompatibilityFixtures = [
  {
    name: "Create New Account",
    input: { ...base(productManagementTopics[0]), fields: { companyName: "Synthetic Company PM05", customerEmail: "customer.one@example.invalid", providerType: "Local Account", package: { stableKey: "synthetic-package-001", displayName: "Synthetic Package PM05" }, apps, packageAddOns: addOns } },
    expectedTopicFields: { "CompanyName(Product)": "Synthetic Company PM05", "Emailลูกค้า(Product)": "customer.one@example.invalid", "ProviderType(Product)": "Local Account", "Package(Product)": "Synthetic Package PM05", "AppName(Product)": serializedApps, "PackageHid(Product)": serializedAddOns },
    expectedDetail: `หัวข้อ: ${productManagementTopics[0]} \nCompany Name : Synthetic Company PM05 \nEmail (ลูกค้า) : customer.one@example.invalid \nProviders Type : Local Account \nPackage : Synthetic Package PM05 \nApp Name : ${serializedApps}`,
  },
  {
    name: "Add Customer Email",
    input: { ...base(productManagementTopics[1]), fields: { customerEmails: [" first.customer@example.invalid ", "second.customer@example.invalid"], providerType: "Office 365", account, customerRoles: [roleA, roleB] } },
    expectedTopicFields: { "Emailลูกค้า(Product)": "first.customer@example.invalid, second.customer@example.invalid", "ProviderType(Product)": "Office 365", "AccountName(Product)": account.displayName, "RoleName(Product)": serializedRoles },
    expectedDetail: `หัวข้อ: ${productManagementTopics[1]} \nEmail (ลูกค้า) : first.customer@example.invalid, second.customer@example.invalid \nProviders Type : Office 365 \nAccount Name : ${account.displayName} \nRole Name : ${serializedRoles}`,
  },
  {
    name: "Add Employee Email",
    input: { ...base(productManagementTopics[2]), fields: { account, customerRoles: [roleA, roleB] } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "RoleName(Product)": serializedRoles },
    expectedDetail: `หัวข้อ: ${productManagementTopics[2]} \nAccount Name : ${account.displayName} \nRole Name : ${serializedRoles}`,
  },
  {
    name: "Add App to Account",
    input: { ...base(productManagementTopics[3]), fields: { account, apps, accountRoleCandidates: [roleA, otherRole, roleB] } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "AppName(Product)": serializedApps },
    expectedDetail: `หัวข้อ: ${productManagementTopics[3]} \nAccount Name : ${account.displayName}\nApp Name : ${serializedApps}\nRole Name : Synthetic Customer Role A, Synthetic Customer Role B`,
  },
  {
    name: "Request Internal Role",
    input: { ...base(productManagementTopics[4]), fields: { internalRoles: [internalRole] } },
    expectedTopicFields: { "RoleInternal(Product)": "Synthetic Internal Role, " },
    expectedDetail: `หัวข้อ: ${productManagementTopics[4]} \nRole Internal : Synthetic Internal Role, `,
  },
  {
    name: "Add App to Internal Role",
    input: { ...base(productManagementTopics[5]), fields: { internalRoles: [internalRole], apps } },
    expectedTopicFields: { "RoleInternal(Product)": "Synthetic Internal Role, ", "AppName(Product)": serializedApps },
    expectedDetail: `หัวข้อ: ${productManagementTopics[5]} \nRole Internal : Synthetic Internal Role,  \nApp Name : ${serializedApps}`,
  },
  {
    name: "Add Permission",
    input: { ...base(productManagementTopics[6]), fields: { account, customerRole: roleA, featureList: "Feature-A; Feature-B\nkeep raw spacing" } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "RoleName(Product)": roleA.roleName },
    expectedDetail: `หัวข้อ: ${productManagementTopics[6]} \nAccount Name : ${account.displayName} \nRole Name : ${roleA.roleName} \nList Feature : Feature-A; Feature-B\nkeep raw spacing`,
  },
  {
    name: "Add Package Add-On",
    input: { ...base(productManagementTopics[7]), fields: { account, customerRoles: [roleA, roleB], packageAddOns: addOns } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "ProductName(Product)": serializedRoles, "AppName(Product)": serializedAddOns },
    expectedDetail: `หัวข้อ: ${productManagementTopics[7]} \nAccount Name : ${account.displayName} \nRole Name : ${serializedRoles} \nPackage Add On : ${serializedAddOns}`,
  },
  {
    name: "Create New Account Role",
    input: { ...base(productManagementTopics[8]), fields: { account, newRole: "Synthetic New Role", featureList: "feature-one, feature-two" } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "RoleName(Product)": "Synthetic New Role" },
    expectedDetail: `หัวข้อ: ${productManagementTopics[8]} \nAccount Name : ${account.displayName} \nCreate Role Name : Synthetic New Role \nList Feature : feature-one, feature-two`,
  },
  {
    name: "Change Provider",
    input: { ...base(productManagementTopics[9]), fields: { account, providerType: "SAML", emailList: "alpha@example.invalid; beta@example.invalid\nraw" } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "RoleName(Product)": "SAML" },
    expectedDetail: `หัวข้อ: ${productManagementTopics[9]} \nAccount Name : ${account.displayName} \nName Provider Type (New) : SAML \nList Email : alpha@example.invalid; beta@example.invalid\nraw`,
  },
  {
    name: "Transfer Owner",
    input: { ...base(productManagementTopics[10]), fields: { account, providerType: "Google", customerEmail: "customer.owner@example.invalid" } },
    expectedTopicFields: { "AccountName(Product)": account.displayName, "RoleName(Product)": "Google" },
    expectedDetail: `หัวข้อ: ${productManagementTopics[10]} \nAccount Name : ${account.displayName} \nName Provider Type (New) : Google \nEmail : customer.owner@example.invalid`,
  },
  {
    name: "Remove Account User",
    input: { ...base(productManagementTopics[11]), fields: { account, emailList: "remove.one@example.invalid ,  remove.two@example.invalid" } },
    expectedTopicFields: { "AccountName(Product)": account.displayName },
    expectedDetail: `หัวข้อ: ${productManagementTopics[11]} \nAccount Name : ${account.displayName} \nList Email : remove.one@example.invalid ,  remove.two@example.invalid`,
  },
  {
    name: "Notification",
    input: { ...base(productManagementTopics[12]), fields: { account, notificationSetting: "เปิด" } },
    expectedTopicFields: { "AccountName(Product)": account.displayName },
    expectedDetail: `หัวข้อ: ${productManagementTopics[12]} \nAccount Name : ${account.displayName} \nSend Email BCC to Owner Account : เปิด`,
  },
] as const satisfies readonly ProductManagementCompatibilityFixture[];
