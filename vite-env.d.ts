
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Polyfill process.env for GenAI SDK compatibility in Vite environment
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
