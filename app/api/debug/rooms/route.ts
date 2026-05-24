// web/app/api/debug/rooms/route.ts
import { db } from '@/lib/db'
import { rooms } from '@/lib/db/schema'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    const allRooms = await db.select().from(rooms)
    console.log('All rooms:', allRooms)
    return NextResponse.json({ count: allRooms.length, rooms: allRooms })
  } catch (err) {
    console.error('Query error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}