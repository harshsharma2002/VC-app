// web/app/(app)/join/page.tsx
'use client'
import { useState } from 'react'
import { joinRoom } from '@/server/actions/room'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    try {
      await joinRoom({ code, displayName: displayName || undefined })
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Join a room</h1>
      <input
        type="text"
        placeholder="Room code"
        value={code}
        onChange={e => setCode(e.target.value)}
        className="border px-3 py-2 rounded w-64"
      />
      <input
        type="text"
        placeholder="Display name (optional)"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        className="border px-3 py-2 rounded w-64"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={handleJoin}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Join
      </button>
    </div>
  )
}