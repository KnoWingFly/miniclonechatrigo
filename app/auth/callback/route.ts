import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// route untuk handle callback dari supabase
export async function GET(request: Request) {
    // ambil url saat ini
    const requestUrl = new URL(request.url)
    // ambil code dari url
    const code = requestUrl.searchParams.get('code')

    // check code, kalo exist make exchangeCodeForSession
    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                try {
                    await fetch(`${requestUrl.origin}/api/auth/sync-user`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                } catch (error) {
                    console.error('Failed to sync user after OAuth:', error)
              }
            }
        }
    }

    return NextResponse.redirect(new URL('/chat', requestUrl.origin))
}