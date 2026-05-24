// app/api/debug/identity/route.ts (delete this before Phase 2)
import { getIdentity } from '@/lib/identity'
import { NextResponse } from 'next/server'

export async function GET() {
  const identity = await getIdentity()
  return NextResponse.json(identity)
}