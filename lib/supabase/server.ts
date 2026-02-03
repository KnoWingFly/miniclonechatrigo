import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies() // async cookies dari next.js 15

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, // Read .env
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Read .env
        {
            cookies: {
                // buat return semua cookies
                getAll() {
                    return cookieStore.getAll()
                },
                // buat set cookies (looping)
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                    }
                },
            },
        }
    )
}
