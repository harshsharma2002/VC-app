// web/hooks/useSocket.ts
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
    onChatHistory: (history: ChatMessage[]) => void; // ← new
    onChatMessage: (msg: ChatMessage) => void;
};

export function useSocket(options: UseSocketOptions) {
    useEffect(() => {
        // Create socket with auth data
        console.log(process.env.NEXT_PUBLIC_SOCKET_URL!);
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
            withCredentials: true,
            auth: {
                sessionToken: options.sessionToken,
                guestId: options.guestId,
                displayName: options.displayName,
            },
        });

        // Populate the shared ref so useWebRTC can emit through it
        options.socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("room:join", { roomId: options.roomId });
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
        });

        socket.on("room:joined", (data) => {
            console.log(
                "Room joined, existing participants:",
                data.participants,
            );
            options.onRoomJoined(data);
        });

        socket.on("room:participant-joined", (data) => {
            console.log("Participant joined:", data);
            options.onParticipantJoined(data);
        });

        socket.on("room:participant-left", (data) => {
            console.log("Participant left:", data);
            options.onParticipantLeft(data);
        });

        socket.on("signal:offer", options.onOffer);
        socket.on("signal:answer", options.onAnswer);
        socket.on("signal:ice-candidate", options.onIceCandidate);
        socket.on("control:muted-by-creator", options.onMutedByCreator);
        socket.on("control:kicked", options.onKicked);
        socket.on("chat:history", options.onChatHistory);
        socket.on("chat:message", options.onChatMessage);

        socket.on("room:error", (data) => {
            console.error("Room error:", data.message);
        });

        return () => {
            socket.off("chat:history", options.onChatHistory);
            socket.off("chat:message", options.onChatMessage);
            socket.disconnect();
            options.socketRef.current = null;
        };
    }, [options.roomId]);
}
