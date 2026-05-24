// server/actions/room.ts
"use server";

import { db } from "@/lib/db";
import { rooms, roomParticipants } from "@/lib/db/schema";
import { getIdentity } from "@/lib/identity";
import { createRoomSchema, joinRoomSchema } from "@/lib/validators/room";
import { nanoid } from "nanoid";
import { eq, and, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function createRoom(rawInput: unknown) {
    const identity = await getIdentity();
    if (!identity) throw new Error("Could not establish identity");

    const data = createRoomSchema.parse(rawInput);

    const [room] = await db
        .insert(rooms)
        .values({
            code: nanoid(10),
            name: data.name ?? null,
            chatExpiryDays: data.chatExpiryDays,
            creatorUserId:
                identity.type === "authenticated" ? identity.userId : null,
            creatorGuestId: identity.type === "guest" ? identity.guestId : null,
        })
        .returning();

    redirect(`/room/${room.id}`);
}

export async function joinRoom(rawInput: unknown) {
    const identity = await getIdentity();
    if (!identity) throw new Error("Could not establish identity");

    const data = joinRoomSchema.parse(rawInput);

    const room = await db.query.rooms.findFirst({
        where: and(eq(rooms.code, data.code), eq(rooms.isActive, true)),
    });

    if (!room) throw new Error("Room not found or has ended");

    const displayName =
        data.displayName ??
        (identity.type === "authenticated"
            ? identity.name
            : `Guest-${identity.guestId.slice(0, 6)}`);

    await db
        .insert(roomParticipants)
        .values({
            roomId: room.id,
            userId: identity.type === "authenticated" ? identity.userId : null,
            guestId: identity.type === "guest" ? identity.guestId : null,
            displayName:
                data.displayName ??
                (identity.type === "authenticated"
                    ? identity.name
                    : `Guest-${identity.guestId.slice(0, 6)}`),
        })
        .onConflictDoNothing();

    redirect(`/room/${room.id}`);
}

export async function leaveRoom(roomId: string) {
    const identity = await getIdentity();
    if (!identity) return;

    // Mark participant as left
    await db
        .update(roomParticipants)
        .set({ leftAt: new Date() })
        .where(
            and(
                eq(roomParticipants.roomId, roomId),
                identity.type === "authenticated"
                    ? eq(roomParticipants.userId, identity.userId)
                    : eq(roomParticipants.guestId, identity.guestId),
                isNull(roomParticipants.leftAt),
            ),
        );

    // Check if room is now empty
    const activeParticipants = await db.query.roomParticipants.findMany({
        where: and(
            eq(roomParticipants.roomId, roomId),
            isNull(roomParticipants.leftAt),
        ),
    });

    // If nobody left, close the room
    if (activeParticipants.length === 0) {
        await db
            .update(rooms)
            .set({ isActive: false, endedAt: new Date() })
            .where(eq(rooms.id, roomId));
    }
}
