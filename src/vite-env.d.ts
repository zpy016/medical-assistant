/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOLC_AK: string;
  readonly VITE_VOLC_SK: string;
  readonly VITE_VOLC_REGION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
