// lib/validators/room.ts
import { z } from 'zod'

export const createRoomSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  chatExpiryDays: z.number().int().min(1).max(30).default(7),
})

export const joinRoomSchema = z.object({
  code: z.string().min(6).max(20),
  displayName: z.string().min(1).max(40).optional(),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>