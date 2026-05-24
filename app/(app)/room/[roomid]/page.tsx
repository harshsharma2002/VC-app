// app/(app)/room/[roomId]/page.tsx
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { RoomShell } from "@/components/room/RoomShell";

export default async function RoomPage({
    params,
}: {
    params: Promise<{ roomid: string }>; // ← Promise, not a plain object
}) {
    const { roomid } = await params; // ← await it first

    console.log("Room ID:", roomid);

    const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, roomid))
        .limit(1);

    console.log("Room:", room);

    if (!room || !room.isActive) redirect("/");

    const session = await auth.api.getSession({ headers: await headers() });
    const cookieStore = await cookies();

    const sessionToken = session
        ? (cookieStore.get("better-auth.session_token")?.value ?? null)
        : null;
    const guestId = !session
        ? (cookieStore.get("guest_id")?.value ?? null)
        : null;
    const displayName = session?.user.name ?? `Guest-${guestId?.slice(0, 6)}`;

    return (
        <>
            <p>Room code: {room.code}</p>
            <RoomShell
                roomId={roomid}
                sessionToken={sessionToken}
                guestId={guestId}
                displayName={displayName}
            />
        </>
    );
}
