import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// route untuk handle callback dari supabase
export async function GET(request: Request) {
    // ambil url saat ini
    const requestUrl = new URL(request.url)
    // ambil code dari url
    const code = requestUrl.searchParams.get('code')

    // check code, kalo exist makae exchangeCodeForSession
    if (code) {
        const supabase = await createClient()
        await supabase.auth.exchangeCodeForSession(code)
    }

    return NextResponse.redirect(new URL('/chat',requestUrl.origin))
}
