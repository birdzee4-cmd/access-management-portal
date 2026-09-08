import type {
  ProductManagementCountriesResponse,
  ProductManagementFormDefinition,
  ProductManagementLookupContext,
  ProductManagementLookupName,
  ProductManagementLookupResponse,
  ProductManagementOption,
  ProductManagementTopicsResponse,
} from "@access-portal/contracts";
import {
  isProductManagementCountry,
  isSupportedProductManagementContext,
  productManagementCountries,
  productManagementForm,
  productManagementTopics,
  type ProductManagementCountry,
} from "./product-management-model.js";

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
const supportedLookups = [
  "providerType",
  "package",
  "packageAddOn",
  "appName",
  "product",
  "account",
  "customerRole",
  "internalRole",
] as const satisfies readonly ProductManagementLookupName[];

const countryCode: Readonly<Record<ProductManagementCountry, string>> = {
  Thailand: "TH",
  Philippines: "PH",
  Vietnam: "VN",
  Malaysia: "MY",
  Indonesia: "ID",
};

const providerTypes = ["SAML", "Office 365", "Hotmail/Outlook", "Google", "Local Account"] as const;
const sharedProducts = ["Synthetic Shared Product A", "Synthetic Shared Product B"] as const;

function countryValues(country: ProductManagementCountry, kind: "Package" | "Package Add On" | "App" | "Account"): readonly string[] {
  const prefix = countryCode[country];
  return [`${prefix} Synthetic ${kind} A`, `${prefix} Synthetic ${kind} B`];
}

function internalRoleValues(country: ProductManagementCountry): readonly string[] {
  const prefix = country === "Thailand" ? "TH" : country === "Philippines" ? "PH" : "VN-MY-ID";
  return [`${prefix} Synthetic Internal Role A`, `${prefix} Synthetic Internal Role B`];
}

export class MockProductManagementMasterDataAdapter implements ProductManagementMasterDataAdapter {
  readonly source = "MOCK" as const;

  async countries() { return productManagementCountries.map(option); }

  async topics(country: string) {
    if (!isProductManagementCountry(country)) throw new ProductManagementMasterDataValidationError();
    return productManagementTopics.map(option);
  }

  async form(country: string, topic: string) {
    if (!isSupportedProductManagementContext(country, topic)) throw new ProductManagementMasterDataValidationError();
    return { ...productManagementForm(country, topic), source: this.source };
  }

  async lookup(name: string, context: ProductManagementLookupContext) {
    if (
      !isSupportedProductManagementContext(context.country, context.topic)
      || !isProductManagementCountry(context.country)
      || !(supportedLookups as readonly string[]).includes(name)
    ) {
      throw new ProductManagementMasterDataValidationError();
    }

    let values: readonly string[];
    switch (name as ProductManagementLookupName) {
      case "providerType":
        values = providerTypes;
        break;
      case "package":
        values = countryValues(context.country, "Package");
        break;
      case "packageAddOn":
        values = countryValues(context.country, "Package Add On");
        break;
      case "appName":
        values = countryValues(context.country, "App");
        break;
      case "product":
        values = sharedProducts;
        break;
      case "account":
        values = countryValues(context.country, "Account");
        break;
      case "customerRole": {
        if (!context.account) throw new ProductManagementMasterDataValidationError();
        const knownAccounts = countryValues(context.country, "Account");
        values = knownAccounts.includes(context.account)
          ? [`${countryCode[context.country]} Synthetic Customer Role A`, `${countryCode[context.country]} Synthetic Customer Role B`]
          : [];
        break;
      }
      case "internalRole":
        values = internalRoleValues(context.country);
        break;
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
