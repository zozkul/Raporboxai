import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req, res })
    await supabase.auth.getSession()
  } catch (e) {
    // session yoksa devam et
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
