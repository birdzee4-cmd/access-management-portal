import type {
  ProductManagementCountriesResponse,
  ProductManagementFormDefinition,
  ProductManagementLookupContext,
  ProductManagementLookupResponse,
  ProductManagementOption,
  ProductManagementTopicsResponse,
} from "@access-portal/contracts";
import {
  isSupportedProductManagementContext,
  mockProductManagementForm,
  productManagementCountries,
  productManagementTopics,
} from "./mock-product-management.js";

export type ProductManagementEnvironment = Readonly<Record<string, string | undefined>>;

export class ProductManagementMasterDataConfigurationError extends Error {
  readonly code = "PRODUCT_MANAGEMENT_MASTER_DATA_CONFIGURATION_ERROR";
  constructor(message: string) { super(message); this.name = "ProductManagementMasterDataConfigurationError"; }
}

export class ProductManagementMasterDataValidationError extends Error {
  readonly code = "INVALID_PRODUCT_MANAGEMENT_MASTER_DATA_REQUEST";
  constructor() { super("The Product Management master-data request is invalid."); this.name = "ProductManagementMasterDataValidationError"; }
}

export interface ProductManagementMasterDataAdapter {
  readonly source: "MOCK" | "REAL";
  countries(): Promise<readonly ProductManagementOption[]>;
  topics(country: string): Promise<readonly ProductManagementOption[]>;
  form(country: string, topic: string): Promise<ProductManagementFormDefinition>;
  lookup(name: string, context: ProductManagementLookupContext): Promise<readonly ProductManagementOption[]>;
}

const option = (value: string): ProductManagementOption => ({ value, label: value });
const supportedLookups = ["providerType", "package", "packageAddOn", "appName", "product", "account", "role"] as const;

export class MockProductManagementMasterDataAdapter implements ProductManagementMasterDataAdapter {
  readonly source = "MOCK" as const;
  async countries() { return productManagementCountries.map(option); }
  async topics(country: string) {
    if (!(productManagementCountries as readonly string[]).includes(country)) throw new ProductManagementMasterDataValidationError();
    return productManagementTopics.map(option);
  }
  async form(country: string, topic: string) {
    if (!isSupportedProductManagementContext(country, topic)) throw new ProductManagementMasterDataValidationError();
    return { ...mockProductManagementForm(country, topic), source: this.source };
  }
  async lookup(name: string, context: ProductManagementLookupContext) {
    if (!isSupportedProductManagementContext(context.country, context.topic) || !(supportedLookups as readonly string[]).includes(name)) throw new ProductManagementMasterDataValidationError();
    let values: readonly string[];
    switch (name) {
      case "providerType": values = ["Manufacturer", "Distributor"]; break;
      case "package":
        if (!context.providerType) throw new ProductManagementMasterDataValidationError();
        values = context.providerType === "Manufacturer" ? ["Core", "Premium"] : context.providerType === "Distributor" ? ["Partner"] : [];
        break;
      case "packageAddOn":
        if (!context.package) throw new ProductManagementMasterDataValidationError();
        values = context.package === "Core" ? ["Analytics", "Workflow"] : context.package === "Premium" ? ["Advanced Analytics"] : context.package === "Partner" ? ["Partner Connect"] : [];
        break;
      case "appName":
        if (!context.package) throw new ProductManagementMasterDataValidationError();
        values = context.package === "Core" ? ["Product Hub"] : context.package === "Premium" ? ["Product Studio"] : context.package === "Partner" ? ["Partner Portal"] : [];
        break;
      case "product": values = context.country === "Thailand" ? ["Synthetic TH Product"] : ["Synthetic VN Product"]; break;
      case "account":
        if (!context.appName) throw new ProductManagementMasterDataValidationError();
        values = context.appName ? [`${context.country} Synthetic Account`] : [];
        break;
      case "role":
        if (!context.appName) throw new ProductManagementMasterDataValidationError();
        values = ["Viewer", "Editor"];
        break;
      default: throw new ProductManagementMasterDataValidationError();
    }
    return values.map(option);
  }
}

export class ProductManagementMasterDataService {
  constructor(private readonly adapter: ProductManagementMasterDataAdapter) {}
  async countries(): Promise<ProductManagementCountriesResponse> { return { source: this.adapter.source, countries: await this.adapter.countries() }; }
  async topics(country: string): Promise<ProductManagementTopicsResponse> { return { source: this.adapter.source, country, topics: await this.adapter.topics(country) }; }
  async form(country: string, topic: string): Promise<ProductManagementFormDefinition> { return this.adapter.form(country, topic); }
  async lookup(name: string, context: ProductManagementLookupContext): Promise<ProductManagementLookupResponse> { return { source: this.adapter.source, lookup: name, options: await this.adapter.lookup(name, context) }; }
}

export function createProductManagementMasterDataService(environment: ProductManagementEnvironment): ProductManagementMasterDataService {
  const configured = environment.PRODUCT_MANAGEMENT_DATA_SOURCE?.trim().toLowerCase();
  const mode = configured || ((environment.APP_ENV === "development" || environment.NODE_ENV === "test") ? "mock" : "");
  if (mode === "mock") return new ProductManagementMasterDataService(new MockProductManagementMasterDataAdapter());
  if (mode === "real") throw new ProductManagementMasterDataConfigurationError("Real Product Management master-data source mapping is not configured.");
  throw new ProductManagementMasterDataConfigurationError("PRODUCT_MANAGEMENT_DATA_SOURCE must be mock or real.");
}
