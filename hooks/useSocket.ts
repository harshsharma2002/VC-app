// hooks/useSocket.ts
"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { ChatMessage } from "./useChat";

type UseSocketOptions = {
    socketRef: React.RefObject<Socket | null>;
    sessionToken: string | null;
    guestId: string | null;
    displayName: string;
    roomId: string;
    onRoomJoined: (data: any) => void;
    onParticipantJoined: (data: any) => void;
    onParticipantLeft: (data: any) => void;
    onOffer: (data: any) => void;
    onAnswer: (data: any) => void;
    onIceCandidate: (data: any) => void;
    onMutedByCreator: () => void;
    onKicked: () => void;
    onChatHistory: (history: ChatMessage[]) => void;
    onChatMessage: (msg: ChatMessage) => void;
    onScreenShareStarted: (data: { fromSocketId: string }) => void; // ✅ NEW
    onScreenShareStopped: (data: { fromSocketId: string }) => void; // ✅ NEW
};

export function useSocket(options: UseSocketOptions) {
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
            withCredentials: true,
            auth: {
                sessionToken: options.sessionToken,
                guestId: options.guestId,
                displayName: options.displayName,
            },
        });

        options.socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("room:join", { roomId: options.roomId });
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
        });

        socket.on("room:joined", options.onRoomJoined);
        socket.on("room:participant-joined", options.onParticipantJoined);
        socket.on("room:participant-left", options.onParticipantLeft);
        socket.on("signal:offer", options.onOffer);
        socket.on("signal:answer", options.onAnswer);
        socket.on("signal:ice-candidate", options.onIceCandidate);
        socket.on("control:muted-by-creator", options.onMutedByCreator);
        socket.on("control:kicked", options.onKicked);
        socket.on("chat:history", options.onChatHistory);
        socket.on("chat:message", options.onChatMessage);
        socket.on("signal:screen-share-started", options.onScreenShareStarted);
        socket.on("signal:screen-share-stopped", options.onScreenShareStopped);

        socket.on("room:error", (data) => {
            console.error("Room error:", data.message);
        });

        return () => {
            socket.off("signal:screen-share-started", options.onScreenShareStarted);
            socket.off("signal:screen-share-stopped", options.onScreenShareStopped);
            socket.off("chat:history", options.onChatHistory);
            socket.off("chat:message", options.onChatMessage);
            socket.disconnect();
            options.socketRef.current = null;
        };
    }, [options.roomId]);
}