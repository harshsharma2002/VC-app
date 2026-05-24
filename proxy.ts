// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  // Skip auth API routes entirely
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return res
  }

  // Check for Better Auth session cookie
  // Better Auth sets 'better-auth.session_token' by default
  const hasSession = req.cookies.has('better-auth.session_token')

  // If not signed in, ensure guest cookie exists
  if (!hasSession) {
    const guestId = req.cookies.get('guest_id')?.value
    if (!guestId) {
      res.cookies.set('guest_id', uuidv4(), {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,  // 1 year
        path: '/',
      })
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}