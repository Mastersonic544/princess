/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GROQ_API_KEY: string;
    readonly VITE_UNSPLASH_ACCESS_KEY: string;
    readonly VITE_JAMENDO_CLIENT_ID: string;
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_DATABASE_URL: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_ADSENSE_PUBLISHER_ID: string;
    readonly VITE_ADMIN_EMAIL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
