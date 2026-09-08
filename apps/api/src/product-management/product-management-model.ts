import type {
  ProductManagementFormDefinition,
  ProductManagementFormField,
  ProductManagementFormSchemaMetadata,
  ProductManagementLookupName,
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

const text = (key: string, label: string, type: "text" | "textarea" = "text"): ProductManagementFormField => ({
  key,
  label,
  required: false,
  type,
});

const lookup = (
  key: string,
  label: string,
  name: ProductManagementLookupName,
  dependsOn?: readonly string[],
  serverResolvedBy?: ProductManagementFormField["serverResolvedBy"],
): ProductManagementFormField => ({
  key,
  label,
  required: false,
  type: "select",
  lookup: name,
  ...(dependsOn ? { dependsOn } : {}),
  ...(serverResolvedBy ? { serverResolvedBy } : {}),
});

const fixedChoice = (key: string, label: string, options: readonly string[]): ProductManagementFormField => ({
  key,
  label,
  required: false,
  type: "select",
  options,
});

function schema(
  topic: ProductManagementTopic,
  legacyScreenPattern: string,
  fields: readonly ProductManagementFormField[],
): ProductManagementSchemaRegistryEntry {
  return {
    topic,
    legacyScreenPattern,
    legacyFormPattern: "Form* (DataSource: USR_PowerApp)",
    lookupRequirements: fields.flatMap((field) => field.lookup ? [field.lookup] : []),
    implementationStatus: "PARTIAL",
    fields,
  };
}

/**
 * Evidence-based registry from the offline Power Apps export. All schemas remain
 * PARTIAL because requiredness, multiplicity, and reused submission-field meaning
 * have not been approved for the Portal.
 */
export const productManagementSchemaRegistry: readonly ProductManagementSchemaRegistryEntry[] = [
  schema(productManagementTopics[0], "{CC}_สร้างAccountลูกค้า", [
    text("companyName", "Company Name"),
    text("customerEmail", "Customer Email"),
    lookup("providerType", "Provider Type", "providerType"),
    lookup("package", "Package", "package"),
    lookup("appName", "App Name", "appName"),
    lookup("packageAddOn", "Package Add On", "packageAddOn"),
  ]),
  schema(productManagementTopics[1], "TH base; other {CC}_เพิ่ม Email เข้า Account(ลูกค้า)_{CC}", [
    text("customerEmail", "Customer Email"),
    lookup("providerType", "Provider Type", "providerType"),
    lookup("account", "Account", "account"),
    lookup("customerRole", "Customer Role", "customerRole", ["account"]),
  ]),
  schema(productManagementTopics[2], "{CC}_เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account"),
    lookup("customerRole", "Customer Role", "customerRole", ["account"]),
  ]),
  schema(productManagementTopics[3], "TH base; other {CC}_เพิ่ม App เข้า Account(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account"),
    lookup("appName", "App Name", "appName"),
  ]),
  schema(productManagementTopics[4], "TH base; other {CC}_ขอสิทธิ์เข้า Role(พนักงาน)_{CC}", [
    lookup("internalRole", "Internal Role", "internalRole", undefined, "AUTHENTICATED_USER_DEPARTMENT_OR_MANAGER"),
  ]),
  schema(productManagementTopics[5], "TH base; other {CC}_เพิ่ม App เข้า Role(พนักงาน)_{CC}", [
    lookup("internalRole", "Internal Role", "internalRole", undefined, "AUTHENTICATED_USER_DEPARTMENT_OR_MANAGER"),
    lookup("appName", "App Name", "appName"),
  ]),
  schema(productManagementTopics[6], "TH base; other {CC}_เพิ่ม Permission เข้า Role(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account"),
    lookup("customerRole", "Customer Role", "customerRole", ["account"]),
    text("requestDetail", "Request Detail", "textarea"),
  ]),
  schema(productManagementTopics[7], "TH base; other {CC}_เพิ่ม Package Add On(ลูกค้า)_{CC}", [
    lookup("account", "Account", "account"),
    lookup("customerRole", "Customer Role", "customerRole", ["account"]),
    lookup("packageAddOn", "Package Add On", "packageAddOn"),
  ]),
  schema(productManagementTopics[8], "{CC}_Create New Role สำหรับ Account(ลูกค้า)", [
    lookup("account", "Account", "account"),
    text("newRole", "New Role"),
  ]),
  schema(productManagementTopics[9], "{CC}_เปลี่ยน Provider สำหรับ Account(ลูกค้า)", [
    lookup("account", "Account", "account"),
    lookup("providerType", "New Provider Type", "providerType"),
  ]),
  schema(productManagementTopics[10], "{CC}_Tranfer Owner Account(ลูกค้า)", [
    lookup("account", "Account", "account"),
    lookup("providerType", "Provider Type", "providerType"),
    text("customerEmail", "Email"),
  ]),
  schema(productManagementTopics[11], "{CC}_ลบ User ใน Account(ลูกค้า)", [
    lookup("account", "Account", "account"),
    text("requestDetail", "User / Request Detail", "textarea"),
  ]),
  schema(productManagementTopics[12], "{CC}_ขอเปิด_ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account", [
    lookup("account", "Account", "account"),
    fixedChoice("notificationSetting", "Notification Setting", ["เปิด", "ปิด"]),
  ]),
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
    },
    fields: entry.fields,
  };
}
