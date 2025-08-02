/// <reference types="vite/client" />
/// <reference types="node" />

interface Window {
  fbAsyncInit: () => void;
  FB: any;
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FACEBOOK_APP_ID: string;
  readonly VITE_FACEBOOK_APP_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare var process: {
  env: {
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
};

declare var Buffer: {
  from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
};
