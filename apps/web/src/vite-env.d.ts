/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_API_CLIENT_ID?: string;
  readonly VITE_ENTRA_REDIRECT_URI?: string;
  readonly VITE_ENTRA_API_SCOPE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PRODUCT_MANAGEMENT_MVP?: string;
  readonly VITE_ACCESS_MANAGEMENT_UI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
