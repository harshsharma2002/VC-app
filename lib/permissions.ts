// lib/permissions.ts
import type { Identity } from './identity'
import type { rooms } from './db/schema'

type Room = typeof rooms.$inferSelect

export type RoomPermissions = {
  isCreator: boolean
  canRecord: boolean   // authed creator only
  canKick: boolean     // any creator (authed or guest)
  canMute: boolean     // any creator (authed or guest)
}

export function getRoomPermissions(
  identity: Identity | null,
  room: Room
): RoomPermissions {
  if (!identity) {
    return { isCreator: false, canRecord: false, canKick: false, canMute: false }
  }

  const isCreator =
    (identity.type === 'authenticated' && room.creatorUserId === identity.userId) ||
    (identity.type === 'guest' && room.creatorGuestId === identity.guestId)

  return {
    isCreator,
    canRecord: isCreator && identity.type === 'authenticated',
    canKick: isCreator,     // guest creators can kick
    canMute: isCreator,     // guest creators can mute
  }
}