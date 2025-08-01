/// <reference types="vite/client" />

interface Window {
  fbAsyncInit: () => void;
  FB: any; // Or specify a more detailed type if you have one
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
