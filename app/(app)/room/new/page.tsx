import { createRoom } from "@/server/actions/room";

export default function NewRoomPage() {
    return (
        <form
            action={async () => {
                "use server";
                await createRoom({ chatExpiryDays: 7 });
            }}
        >
            <button type="submit">Create room</button>
        </form>
    );
}
