// hooks/useParticipants.ts
"use client";
import {
    useState,
    useCallback,
    useRef,
    useEffect,
    type RefObject,
} from "react";
import type { Socket } from "socket.io-client";

export type Participant = {
    socketId: string;
    displayName: string;
    isMuted: boolean;
    isCreator: boolean;
};

export function useParticipants(socketRef: RefObject<Socket | null>) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const onRoomJoined = useCallback(
        (data: { participants: Participant[]; isCreator: boolean }) => {
            console.log(
                "[Participants] Room joined with",
                data.participants.length,
                "participants",
            );
            setParticipants(data.participants);
        },
        [],
    );

    const onParticipantJoined = useCallback(
        (data: {
            socketId: string;
            displayName: string;
            isMuted: boolean;
            isCreator: boolean;
        }) => {
            console.log("[Participants] Participant joined:", data.displayName);
            setParticipants((prev) => [...prev, data]);
        },
        [],
    );

    const onParticipantLeft = useCallback((data: { socketId: string }) => {
        console.log("[Participants] Participant left:", data.socketId);
        setParticipants((prev) =>
            prev.filter((p) => p.socketId !== data.socketId),
        );
    }, []);

    const onParticipantMuted = useCallback((data: { socketId: string }) => {
        console.log("[Participants] Participant muted:", data.socketId);
        setParticipants((prev) =>
            prev.map((p) =>
                p.socketId === data.socketId ? { ...p, isMuted: true } : p,
            ),
        );
    }, []);

    const muteParticipant = useCallback(
        (targetSocketId: string) => {
            console.log("[Participants] Muting participant:", targetSocketId);
            socketRef.current?.emit("control:mute", { targetSocketId });
        },
        [socketRef],
    );

    const kickParticipant = useCallback(
        (targetSocketId: string) => {
            console.log("[Participants] Kicking participant:", targetSocketId);
            if (confirm("Are you sure you want to remove this participant?")) {
                socketRef.current?.emit("control:kick", { targetSocketId });
            }
        },
        [socketRef],
    );

    const openPanel = useCallback(() => setIsOpen(true), []);
    const closePanel = useCallback(() => setIsOpen(false), []);

    return {
        participants,
        isOpen,
        openPanel,
        closePanel,
        muteParticipant,
        kickParticipant,
        onRoomJoined,
        onParticipantJoined,
        onParticipantLeft,
        onParticipantMuted,
    };
}
