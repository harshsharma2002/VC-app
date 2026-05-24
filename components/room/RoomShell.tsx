"use client";
import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSocket } from "@/hooks/useSocket";
import { VideoGrid } from "./VideoGrid";
import { Controls } from "./Controls";
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
        error,
        isMicOn,
        isCameraOn,
        toggleMic,
        toggleCamera,
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
    } = useWebRTC(stream, socketRef, streamReady);

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
            if (participants.length > 0) {
                initiateOffers(participants);
            }
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
        ({ socketId }: { socketId: string }) => {
            removePeer(socketId);
        },
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
    });

    return (
        <div className="flex flex-col h-screen">
            {error ? (
                <div className="border-b border-amber-500/40 bg-amber-950 px-4 py-3 text-sm text-amber-100">
                    {error}. You can still join and receive other participants.
                </div>
            ) : null}
            <VideoGrid
                localStream={stream}
                localDisplayName={displayName}
                remoteStreams={Array.from(remoteStreams.values())}
            />
            <Controls
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onLeave={() => {
                    socketRef.current?.disconnect();
                    router.push("/");
                }}
            />
        </div>
    );
}
