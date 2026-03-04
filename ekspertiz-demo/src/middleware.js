import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Korumalı rotalar
  const protectedRoutes = ['/dashboard', '/rapor']
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Giriş yapmışsa auth sayfasına gitmesin
  if (pathname === '/auth' && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/rapor/:path*', '/auth']
}
