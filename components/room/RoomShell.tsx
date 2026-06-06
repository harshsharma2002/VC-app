// components/room/RoomShell.tsx
"use client";
import { useEffect } from "react";
import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSocket } from "@/hooks/useSocket";
import { useChat } from "@/hooks/useChat";
import { VideoGrid } from "./VideoGrid";
import { Controls } from "./Controls";
import { ChatPanel } from "./ChatPanel";
import type { Socket } from "socket.io-client";

type Props = {
    roomId: string;
    sessionToken: string | null;
    guestId: string | null;
    displayName: string;
};

export function RoomShell({
    roomId,
    sessionToken,
    guestId,
    displayName,
}: Props) {
    const router = useRouter();

    const {
        stream,
        screenStream,
        error,
        isMicOn,
        isCameraOn,
        isScreenSharing,
        toggleMic,
        toggleCamera,
        startScreenShare,
        stopScreenShare,
        forceMute,
        streamReady,
    } = useMediaDevices();

    const socketRef = useRef<Socket | null>(null);

    const {
        remoteStreams,
        initiateOffers,
        prepareForIncomingOffer,
        handleOffer,
        handleAnswer,
        handleIceCandidate,
        removePeer,
        addScreenTrack,
        removeScreenTrack,
        handleScreenShareStarted,
        handleScreenShareStopped,
    } = useWebRTC(stream, socketRef, streamReady);

    const {
        messages,
        sendMessage,
        unreadCount,
        isOpen: chatOpen,
        openChat,
        closeChat,
        onChatHistory,
        onChatMessage,
    } = useChat(socketRef, roomId);

    const handleScreenShareToggle = useCallback(async () => {
        if (isScreenSharing) {
            console.log("[RoomShell] Stopping screen share");
            // Stop screen sharing
            stopScreenShare();

            // Remove screen track from all peers
            await removeScreenTrack();

            // Notify others
            socketRef.current?.emit("signal:screen-share-stopped");
        } else {
            console.log("[RoomShell] Starting screen share");
            // Start screen sharing
            const screenStream = await startScreenShare();
            if (!screenStream) {
                console.log("[RoomShell] Screen share cancelled by user");
                return;
            }

            // Add screen track to all peers
            await addScreenTrack(screenStream);

            // Notify others
            socketRef.current?.emit("signal:screen-share-started");
        }
    }, [
        isScreenSharing,
        stopScreenShare,
        startScreenShare,
        removeScreenTrack,
        addScreenTrack,
    ]);

    // Add this to RoomShell.tsx temporarily for debugging
    useEffect(() => {
        console.log("=== RoomShell State ===");
        console.log(
            "Local stream tracks:",
            stream
                ?.getTracks()
                .map((t) => `${t.kind} ${t.id} enabled=${t.enabled}`),
        );
        console.log(
            "Screen stream tracks:",
            screenStream?.getTracks().map((t) => `${t.kind} ${t.id}`),
        );
        console.log(
            "Remote streams:",
            Array.from(remoteStreams.values()).map((rs) => ({
                socketId: rs.socketId,
                displayName: rs.displayName,
                tracks: rs.stream.getTracks().map((t) => `${t.kind} ${t.id}`),
                isScreenShare: rs.isScreenShare,
            })),
        );
    }, [stream, screenStream, remoteStreams]);

    // WebRTC callbacks
    const onRoomJoined = useCallback(
        ({
            participants,
        }: {
            participants: Array<{ socketId: string; displayName: string }>;
        }) => {
            console.log(
                "[RoomShell] room:joined, participants:",
                participants.length,
            );
            if (participants.length > 0) initiateOffers(participants);
        },
        [initiateOffers],
    );

    const onParticipantJoined = useCallback(
        ({
            socketId,
            displayName: name,
        }: {
            socketId: string;
            displayName: string;
        }) => {
            console.log("[RoomShell] participant-joined:", socketId);
            prepareForIncomingOffer(socketId, name);
        },
        [prepareForIncomingOffer],
    );

    const onParticipantLeft = useCallback(
        ({ socketId }: { socketId: string }) => removePeer(socketId),
        [removePeer],
    );

    const onOffer = useCallback(
        ({
            fromSocketId,
            sdp,
        }: {
            fromSocketId: string;
            sdp: RTCSessionDescriptionInit;
        }) => {
            console.log("[RoomShell] received offer from:", fromSocketId);
            handleOffer(fromSocketId, sdp);
        },
        [handleOffer],
    );

    const onAnswer = useCallback(
        ({
            fromSocketId,
            sdp,
        }: {
            fromSocketId: string;
            sdp: RTCSessionDescriptionInit;
        }) => {
            console.log("[RoomShell] received answer from:", fromSocketId);
            handleAnswer(fromSocketId, sdp);
        },
        [handleAnswer],
    );

    const onIceCandidate = useCallback(
        ({
            fromSocketId,
            candidate,
        }: {
            fromSocketId: string;
            candidate: RTCIceCandidateInit;
        }) => {
            console.log("[RoomShell] received ICE from:", fromSocketId);
            handleIceCandidate(fromSocketId, candidate);
        },
        [handleIceCandidate],
    );

    const onMutedByCreator = useCallback(() => {
        console.log("[RoomShell] force muted by creator");
        forceMute();
    }, [forceMute]);

    const onKicked = useCallback(() => {
        router.push("/?kicked=true");
    }, [router]);

    // ✅ NEW: Screen share signaling callbacks
    const onScreenShareStarted = useCallback(
        ({ fromSocketId }: { fromSocketId: string }) => {
            console.log("[RoomShell] Screen share started by:", fromSocketId);
            handleScreenShareStarted(fromSocketId);
        },
        [handleScreenShareStarted],
    );

    const onScreenShareStopped = useCallback(
        ({ fromSocketId }: { fromSocketId: string }) => {
            console.log("[RoomShell] Screen share stopped by:", fromSocketId);
            handleScreenShareStopped(fromSocketId);
        },
        [handleScreenShareStopped],
    );

    useSocket({
        socketRef,
        sessionToken,
        guestId,
        displayName,
        roomId,
        onRoomJoined,
        onParticipantJoined,
        onParticipantLeft,
        onOffer,
        onAnswer,
        onIceCandidate,
        onMutedByCreator,
        onKicked,
        onChatHistory,
        onChatMessage,
        onScreenShareStarted, // ✅ NEW
        onScreenShareStopped, // ✅ NEW
    });

    return (
        <div className="flex h-screen overflow-hidden">
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {error && (
                    <div className="border-b border-amber-500/40 bg-amber-950 px-4 py-3 text-sm text-amber-100 shrink-0">
                        {error}. You can still join and receive other
                        participants.
                    </div>
                )}

                <VideoGrid
                    localStream={stream}
                    localDisplayName={displayName}
                    remoteStreams={Array.from(remoteStreams.values())}
                    isScreenSharing={isScreenSharing}
                    screenStream={screenStream}
                />

                <Controls
                    isMicOn={isMicOn}
                    isCameraOn={isCameraOn}
                    isScreenSharing={isScreenSharing}
                    onToggleMic={toggleMic}
                    onToggleCamera={toggleCamera}
                    onToggleScreenShare={handleScreenShareToggle} // ✅ NEW
                    onLeave={() => {
                        socketRef.current?.disconnect();
                        router.push("/");
                    }}
                    onChatToggle={chatOpen ? closeChat : openChat}
                    unreadCount={unreadCount}
                />
            </div>

            <div
                className={`transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 ${chatOpen ? "w-80" : "w-0"}`}
            >
                {chatOpen && (
                    <ChatPanel
                        messages={messages}
                        onSend={sendMessage}
                        onClose={closeChat}
                    />
                )}
            </div>
        </div>
    );
}
