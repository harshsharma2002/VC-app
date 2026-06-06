// components/room/RoomShell.tsx
"use client";
import { useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSocket } from "@/hooks/useSocket";
import { useChat } from "@/hooks/useChat";
import { useParticipants } from "@/hooks/useParticipants";
import { VideoGrid } from "./VideoGrid";
import { Controls } from "./Controls";
import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
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
    const [isCreator, setIsCreator] = useState(false);

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

    const {
        participants,
        isOpen: participantsOpen,
        openPanel,
        closePanel,
        muteParticipant,
        kickParticipant,
        onRoomJoined: onParticipantsRoomJoined,
        onParticipantJoined: onParticipantsParticipantJoined,
        onParticipantLeft: onParticipantsParticipantLeft,
        onParticipantMuted,
    } = useParticipants(socketRef);

    const handleScreenShareToggle = useCallback(async () => {
        if (isScreenSharing) {
            console.log("[RoomShell] Stopping screen share");
            stopScreenShare();
            await removeScreenTrack();
            socketRef.current?.emit("signal:screen-share-stopped");
        } else {
            console.log("[RoomShell] Starting screen share");
            const screenStream = await startScreenShare();
            if (!screenStream) {
                console.log("[RoomShell] Screen share cancelled by user");
                return;
            }
            await addScreenTrack(screenStream);
            socketRef.current?.emit("signal:screen-share-started");
        }
    }, [
        isScreenSharing,
        stopScreenShare,
        startScreenShare,
        removeScreenTrack,
        addScreenTrack,
    ]);

    const onRoomJoined = useCallback(
        (data: {
            participants: Array<{ socketId: string; displayName: string }>;
            isCreator: boolean;
        }) => {
            console.log(
                "[RoomShell] room:joined, participants:",
                data.participants.length,
            );
            setIsCreator(data.isCreator);
            onParticipantsRoomJoined(data as any);
            if (data.participants.length > 0) initiateOffers(data.participants);
        },
        [initiateOffers, onParticipantsRoomJoined],
    );

    const onParticipantJoined = useCallback(
        (data: {
            socketId: string;
            displayName: string;
            isMuted: boolean;
            isCreator: boolean;
        }) => {
            console.log("[RoomShell] participant-joined:", data.socketId);
            onParticipantsParticipantJoined(data);
            prepareForIncomingOffer(data.socketId, data.displayName);
        },
        [prepareForIncomingOffer, onParticipantsParticipantJoined],
    );

    const onParticipantLeft = useCallback(
        (data: { socketId: string }) => {
            onParticipantsParticipantLeft(data);
            removePeer(data.socketId);
        },
        [removePeer, onParticipantsParticipantLeft],
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
        onScreenShareStarted,
        onScreenShareStopped,
        onParticipantMuted,
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
                    onToggleScreenShare={handleScreenShareToggle}
                    onLeave={() => {
                        socketRef.current?.disconnect();
                        router.push("/");
                    }}
                    onChatToggle={chatOpen ? closeChat : openChat}
                    onParticipantsToggle={
                        participantsOpen ? closePanel : openPanel
                    }
                    unreadCount={unreadCount}
                    participantCount={participants.length + 1}
                />
            </div>
            <div
                className={`transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 ${
                    participantsOpen ? "w-80" : "w-0"
                }`}
            >
                {participantsOpen && (
                    <ParticipantsPanel
                        localDisplayName={displayName}
                        isLocalCreator={isCreator}
                        participants={participants}
                        onMuteParticipant={muteParticipant}
                        onKickParticipant={kickParticipant}
                        onClose={closePanel}
                    />
                )}
            </div>

            {/* Chat Panel */}
            <div
                className={`transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 ${
                    chatOpen ? "w-80" : "w-0"
                }`}
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
