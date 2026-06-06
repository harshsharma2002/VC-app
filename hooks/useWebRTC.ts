// hooks/useWebRTC.ts
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
    const screenStreamRef = useRef<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
    const tracksReadyMap = useRef<Map<string, Promise<void>>>(new Map());
    const makingOffer = useRef<Map<string, boolean>>(new Map()); // ✅ Track ongoing offers
    const ignoreOffer = useRef<Map<string, boolean>>(new Map()); // ✅ Track if we should ignore offers

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    const removePeer = useCallback((socketId: string) => {
        const pc = peerConnections.current.get(socketId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(socketId);
        }
        tracksReadyMap.current.delete(socketId);
        makingOffer.current.delete(socketId);
        ignoreOffer.current.delete(socketId);
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
                console.log("[WebRTC] Track already attached:", track.kind, track.id);
                return;
            }

            console.log("[WebRTC] Adding track:", track.kind, track.id);
            pc.addTrack(track, stream);
            attached = true;
        });

        return attached;
    }, []);

    const createPeerConnection = useCallback(
        (socketId: string, displayName: string): RTCPeerConnection => {
            console.log("[WebRTC] Creating peer connection for:", socketId);
            const pc = new RTCPeerConnection(ICE_SERVERS);

            // Attach camera stream if available
            if (localStreamRef.current) {
                console.log("[WebRTC] Attaching local camera tracks");
                attachLocalTracks(pc, localStreamRef.current);
            }

            // Attach screen stream if available
            if (screenStreamRef.current) {
                console.log("[WebRTC] Attaching screen share tracks");
                attachLocalTracks(pc, screenStreamRef.current);
            }

            pc.ontrack = (event) => {
                console.log("[WebRTC] ontrack event from", socketId, event.track.kind);
                const [remoteStream] = event.streams;
                
                setRemoteStreams((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(socketId);
                    
                    const isScreenTrack = event.track.label.includes('screen') || 
                                         event.track.label.includes('window');
                    
                    next.set(socketId, {
                        socketId,
                        displayName: existing?.displayName ?? displayName,
                        stream: remoteStream,
                        isMuted: existing?.isMuted ?? false,
                        isScreenShare: existing?.isScreenShare ?? isScreenTrack,
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

            // ✅ FIXED: Perfect negotiation pattern
            pc.onnegotiationneeded = async () => {
                console.log(`[WebRTC] ⚡ Renegotiation needed for ${socketId}`);
                
                try {
                    makingOffer.current.set(socketId, true);
                    await pc.setLocalDescription();
                    console.log(`[WebRTC] Sending ${pc.localDescription?.type} to ${socketId}`);
                    socketRef.current?.emit("signal:offer", {
                        targetSocketId: socketId,
                        sdp: pc.localDescription,
                    });
                } catch (err) {
                    console.error("[WebRTC] Failed to create offer:", err);
                } finally {
                    makingOffer.current.set(socketId, false);
                }
            };

            peerConnections.current.set(socketId, pc);
            return pc;
        },
        [removePeer, attachLocalTracks, socketRef],
    );

    const addScreenTrack = useCallback(async (screenStream: MediaStream) => {
        console.log("[WebRTC] Adding screen track to all peers");
        screenStreamRef.current = screenStream;
        
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) {
            console.error("[WebRTC] No video track in screen stream!");
            return;
        }

        for (const [socketId, pc] of peerConnections.current.entries()) {
            console.log(`[WebRTC] Adding screen track to peer ${socketId}`);
            pc.addTrack(screenTrack, screenStream);
        }
    }, []);

    const removeScreenTrack = useCallback(async () => {
        console.log("[WebRTC] Removing screen track from all peers");
        
        if (!screenStreamRef.current) {
            console.warn("[WebRTC] No screen stream to remove");
            return;
        }

        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        if (!screenTrack) return;

        for (const [socketId, pc] of peerConnections.current.entries()) {
            const sender = pc.getSenders().find(s => s.track?.id === screenTrack.id);
            if (sender) {
                console.log(`[WebRTC] Removing screen sender from peer ${socketId}`);
                pc.removeTrack(sender);
            }
        }

        screenStreamRef.current = null;
    }, []);

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
                
                // ✅ Initial offer (only for existing participants when we join)
                try {
                    makingOffer.current.set(participant.socketId, true);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log(`[WebRTC] Sending initial offer to ${participant.socketId}`);
                    socketRef.current?.emit("signal:offer", {
                        targetSocketId: participant.socketId,
                        sdp: offer,
                    });
                } catch (err) {
                    console.error(`[WebRTC] Failed to create initial offer for ${participant.socketId}:`, err);
                } finally {
                    makingOffer.current.set(participant.socketId, false);
                }
            }
        },
        [createPeerConnection, streamReady, socketRef],
    );

    const prepareForIncomingOffer = useCallback(
        (socketId: string, displayName: string) => {
            const pc = createPeerConnection(socketId, displayName);

            const tracksReady = streamReady
                .then((stream) => {
                    localStreamRef.current = stream;
                    const currentPc = peerConnections.current.get(socketId);
                    if (!currentPc) return;
                    const attached = attachLocalTracks(currentPc, stream);
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

    // ✅ FIXED: Perfect negotiation pattern for handling offers
    const handleOffer = useCallback(
        async (fromSocketId: string, sdp: RTCSessionDescriptionInit) => {
            console.log("[WebRTC] Handling offer from", fromSocketId);
            const pc = peerConnections.current.get(fromSocketId);
            if (!pc) {
                console.error("[WebRTC] No peer connection found for", fromSocketId);
                return;
            }

            const tracksReady = tracksReadyMap.current.get(fromSocketId);
            if (tracksReady) {
                console.log("[WebRTC] Waiting for tracks to be ready...");
                await tracksReady;
            }

            // ✅ Perfect negotiation: resolve collisions
            const offerCollision =
                sdp.type === "offer" &&
                (makingOffer.current.get(fromSocketId) || pc.signalingState !== "stable");

            const polite = (socketRef.current?.id ?? "") < fromSocketId;
            ignoreOffer.current.set(fromSocketId, !polite && offerCollision);

            if (ignoreOffer.current.get(fromSocketId)) {
                console.log(`[WebRTC] Ignoring offer from ${fromSocketId} (impolite collision)`);
                return;
            }

            try {
                await pc.setRemoteDescription(sdp);
                
                if (sdp.type === "offer") {
                    await pc.setLocalDescription();
                    console.log("[WebRTC] Sending answer to", fromSocketId);
                    socketRef.current?.emit("signal:answer", {
                        targetSocketId: fromSocketId,
                        sdp: pc.localDescription,
                    });
                }
            } catch (err) {
                console.error(`[WebRTC] Failed to handle offer from ${fromSocketId}:`, err);
            }
        },
        [socketRef],
    );

    const handleAnswer = useCallback(
        async (fromSocketId: string, sdp: RTCSessionDescriptionInit) => {
            console.log("[WebRTC] Handling answer from", fromSocketId);
            const pc = peerConnections.current.get(fromSocketId);
            if (!pc) {
                console.warn(`[WebRTC] No peer connection for ${fromSocketId}, ignoring answer`);
                return;
            }

            try {
                await pc.setRemoteDescription(sdp);
                console.log(`[WebRTC] ✓ Remote description set for ${fromSocketId}`);
            } catch (err) {
                console.error(`[WebRTC] Failed to set remote description for ${fromSocketId}:`, err);
            }
        },
        [],
    );

    const handleIceCandidate = useCallback(
        async (fromSocketId: string, candidate: RTCIceCandidateInit) => {
            const pc = peerConnections.current.get(fromSocketId);
            if (!pc) return;
            
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                if (!ignoreOffer.current.get(fromSocketId)) {
                    console.error(`[WebRTC] Failed to add ICE candidate from ${fromSocketId}:`, err);
                }
            }
        },
        [],
    );

    const handleScreenShareStarted = useCallback((fromSocketId: string) => {
        console.log("[WebRTC] Screen share started by", fromSocketId);
        setRemoteStreams((prev) => {
            const next = new Map(prev);
            const existing = next.get(fromSocketId);
            if (existing) {
                next.set(fromSocketId, { ...existing, isScreenShare: true });
            }
            return next;
        });
    }, []);

    const handleScreenShareStopped = useCallback((fromSocketId: string) => {
        console.log("[WebRTC] Screen share stopped by", fromSocketId);
        setRemoteStreams((prev) => {
            const next = new Map(prev);
            const existing = next.get(fromSocketId);
            if (existing) {
                next.set(fromSocketId, { ...existing, isScreenShare: false });
            }
            return next;
        });
    }, []);

    return {
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
    };
}