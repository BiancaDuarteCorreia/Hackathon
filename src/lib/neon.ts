import { createClient } from '@neondatabase/neon-js';
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.disableWarningInBrowsers = true;

export const neonClient = createClient({
    auth: {
        url: import.meta.env.VITE_NEON_AUTH_URL,
        allowAnonymous: true,
    },
    dataApi: {
        url: import.meta.env.VITE_NEON_API_URL,
    },
});

const dbUrl = import.meta.env.VITE_DATABASE_URL;

if (!dbUrl) {
    console.error("VITE_DATABASE_URL não configurada! Verifique seu arquivo .env");
}

export const sql = neon(dbUrl || '');