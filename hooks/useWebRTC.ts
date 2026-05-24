"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import type { Socket } from "socket.io-client";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export type RemoteStream = {
    socketId: string;
    displayName: string;
    stream: MediaStream;
    isMuted: boolean;
    isScreenShare: boolean;
};

export function useWebRTC(
    localStream: MediaStream | null,
    socketRef: React.RefObject<Socket | null>,
    streamReady: Promise<MediaStream>,
) {
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
    // Tracks when local tracks have been attached to each incoming peer connection.
    // handleOffer awaits this before creating an answer so the SDP includes our tracks.
    const tracksReadyMap = useRef<Map<string, Promise<void>>>(new Map());

    // Keep ref in sync with prop so createPeerConnection always gets current stream
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        const syncPeers = async () => {
            for (const pc of peerConnections.current.values()) {
                const senders = pc.getSenders();
                const tracks = localStream?.getTracks() ?? [];

                for (const sender of senders) {
                    const nextTrack = tracks.find((track) => track.kind === sender.track?.kind) ?? null;
                    if (sender.track !== nextTrack) {
                        await sender.replaceTrack(nextTrack);
                    }
                }

                if (localStream) {
                    for (const track of tracks) {
                        const alreadyAttached = senders.some((sender) => sender.track?.kind === track.kind);
                        if (!alreadyAttached) {
                            pc.addTrack(track, localStream);
                        }
                    }
                }
            }
        };

        void syncPeers();
    }, [localStream]);

    const removePeer = useCallback((socketId: string) => {
        const pc = peerConnections.current.get(socketId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(socketId);
        }
        tracksReadyMap.current.delete(socketId);
        setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(socketId);
            return next;
        });
    }, []);

    const attachLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
        let attached = false;

        stream.getTracks().forEach((track) => {
            const alreadyAttached = pc.getSenders().some((sender) => sender.track?.id === track.id);
            if (alreadyAttached) {
                return;
            }

            pc.addTrack(track, stream);
            attached = true;
        });

        return attached;
    }, []);

    const createPeerConnection = useCallback(
        (socketId: string, displayName: string): RTCPeerConnection => {
            const pc = new RTCPeerConnection(ICE_SERVERS);

            // Attach local tracks — localStreamRef is always current
            if (localStreamRef.current) {
                attachLocalTracks(pc, localStreamRef.current);
            }

            pc.ontrack = (event) => {
                const [remoteStream] = event.streams;
                setRemoteStreams((prev) => {
                    const next = new Map(prev);
                    next.set(socketId, {
                        socketId,
                        displayName,
                        stream: remoteStream,
                        isMuted: false,
                        isScreenShare: false,
                    });
                    return next;
                });
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current?.emit("signal:ice-candidate", {
                        targetSocketId: socketId,
                        candidate: event.candidate,
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                console.log(`[WebRTC] ${socketId} connection state:`, pc.connectionState);
                if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                    removePeer(socketId);
                }
            };

            pc.onicegatheringstatechange = () => {
                console.log(`[WebRTC] ${socketId} ICE gathering:`, pc.iceGatheringState);
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`[WebRTC] ${socketId} ICE connection:`, pc.iceConnectionState);
            };

            peerConnections.current.set(socketId, pc);
            return pc;
        },
        [removePeer],
    );

    // We joined — send offers to all existing participants.
    // Awaits streamReady so tracks are attached before the offer is created.
    const initiateOffers = useCallback(
        async (participants: Array<{ socketId: string; displayName: string }>) => {
            let readyStream: MediaStream | null = null;
            try {
                readyStream = await streamReady;
                localStreamRef.current = readyStream;
                console.log("[WebRTC] stream ready, initiating offers to", participants.length, "peers");
            } catch (err) {
                console.warn("[WebRTC] getUserMedia failed, continuing receive-only:", err);
            }

            for (const participant of participants) {
                const pc = createPeerConnection(participant.socketId, participant.displayName);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current?.emit("signal:offer", {
                    targetSocketId: participant.socketId,
                    sdp: offer,
                });
            }
        },
        [createPeerConnection, streamReady],
    );

    // Someone joined after us — create the peer connection immediately so
    // handleOffer can find it in the map, then attach tracks once stream is ready.
    const prepareForIncomingOffer = useCallback(
        (socketId: string, displayName: string) => {
            // PC must exist in the map before the offer arrives, so create it now.
            createPeerConnection(socketId, displayName);

            // Attach local tracks once getUserMedia resolves (may be after offer arrives).
            const tracksReady = streamReady
                .then((stream) => {
                    localStreamRef.current = stream;
                    const pc = peerConnections.current.get(socketId);
                    if (!pc) return;
                    const attached = attachLocalTracks(pc, stream);
                    if (attached) {
                        console.log("[WebRTC] tracks attached for incoming peer", socketId);
                    }
                })
                .catch((err) => {
                    console.warn("[WebRTC] getUserMedia failed, peer will be receive-only", socketId, err);
                });
            tracksReadyMap.current.set(socketId, tracksReady);
        },
        [attachLocalTracks, createPeerConnection, streamReady],
    );

    const handleOffer = useCallback(
        async (fromSocketId: string, sdp: RTCSessionDescriptionInit) => {
            const pc = peerConnections.current.get(fromSocketId);
            if (!pc) return;
            // Wait for local tracks to be attached before answering.
            // Without this, the SDP answer would omit our send tracks.
            const tracksReady = tracksReadyMap.current.get(fromSocketId);
            if (tracksReady) await tracksReady;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current?.emit("signal:answer", {
                targetSocketId: fromSocketId,
                sdp: answer,
            });
        },
        [],
    );

    const handleAnswer = useCallback(
        async (fromSocketId: string, sdp: RTCSessionDescriptionInit) => {
            const pc = peerConnections.current.get(fromSocketId);
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        [],
    );

    const handleIceCandidate = useCallback(
        async (fromSocketId: string, candidate: RTCIceCandidateInit) => {
            const pc = peerConnections.current.get(fromSocketId);
            if (!pc) return;
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        },
        [],
    );

    return {
        remoteStreams,
        initiateOffers,
        prepareForIncomingOffer,
        handleOffer,
        handleAnswer,
        handleIceCandidate,
        removePeer,
    };
}