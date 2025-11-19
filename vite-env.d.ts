/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  // Standard Vite env variables (BASE_URL, MODE, etc.) are inherited from vite/client
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment the existing NodeJS namespace to support process.env.API_KEY
// This avoids "Cannot redeclare block-scoped variable 'process'" errors while ensuring type safety
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

declare module '*.svg' {
  const svgPath: string;
  export default svgPath;
}