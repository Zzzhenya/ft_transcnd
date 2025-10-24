// 'Type' declarations for Vite environment variables.
// This file provides type definitions for "import.meta.env" used in the project.
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_GATEWAY_BASE: string;
  readonly VITE_WS_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}