import { createBrowserClient } from '@supabase/ssr'

// export function ngebuat + return client
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, // Read .env
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Read .env
    )
}
