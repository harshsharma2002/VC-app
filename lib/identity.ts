// lib/identity.ts
import { auth } from './auth'
import { headers, cookies } from 'next/headers'

export type AuthedIdentity = {
  type: 'authenticated'
  userId: string
  name: string
  canRecord: true
}

export type GuestIdentity = {
  type: 'guest'
  guestId: string
  name: null         // assigned at room join time
  canRecord: false
}

export type Identity = AuthedIdentity | GuestIdentity

export async function getIdentity(): Promise<Identity | null> {
  // Better Auth reads session from request headers
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session?.user) {
    return {
      type: 'authenticated',
      userId: session.user.id,
      name: session.user.name ?? 'User',
      canRecord: true,
    }
  }

  // Fall through to guest
  const cookieStore = await cookies()
  const guestId = cookieStore.get('guest_id')?.value
  if (!guestId) return null   // middleware should prevent this, but be safe

  return {
    type: 'guest',
    guestId,
    name: null,
    canRecord: false,
  }
}