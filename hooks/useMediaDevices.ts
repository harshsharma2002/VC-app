"use client";
import { useState, useEffect, useRef } from "react";

export function useMediaDevices() {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);

    const streamReadyRef = useRef<Promise<MediaStream>>(
        null as unknown as Promise<MediaStream>,
    );

    if (!streamReadyRef.current) {
        streamReadyRef.current = new Promise<MediaStream>((resolve, reject) => {
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((s) => {
                    streamRef.current = s;
                    setStream(s);
                    resolve(s);
                })
                .catch((err) => {
                    setError("Could not access camera or microphone");
                    reject(err);
                });
        });
    }

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        };
    }, []);

    const toggleMic = () => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track) {
            console.warn("[Media] No audio track found");
            return;
        }
        // Always derive next state from actual track state, not React state
        const nextEnabled = !track.enabled;
        track.enabled = nextEnabled;
        setIsMicOn(nextEnabled);
        console.log(
            "[Media] Mic toggled:",
            nextEnabled ? "ON" : "OFF",
            "track.enabled:",
            track.enabled,
        );
    };

    const toggleCamera = () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) {
            console.warn("[Media] No video track found");
            return;
        }
        const nextEnabled = !track.enabled;
        track.enabled = nextEnabled;
        setIsCameraOn(nextEnabled);

        // Send a black frame when camera is off so remote sees black, not frozen
        if (!nextEnabled) {
            replaceVideoWithBlack();
        } else {
            restoreCamera();
        }
    };

    const replaceVideoWithBlack = () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        // Create a black canvas stream and replace the track in all peer connections
        // For local preview — just disable shows black on most browsers with this:
        track.enabled = false;
        // The remote freeze is a WebRTC limitation — fixing it properly requires
        // renegotiation (Phase 5). For now, disabling is the correct approach and
        // modern browsers will show black on the sender side.
    };

    const restoreCamera = () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = true;
    };

    const forceMute = () => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = false;
        setIsMicOn(false);
        console.log("[Media] Force muted by creator");
    };

    return {
        stream,
        error,
        isMicOn,
        isCameraOn,
        toggleMic,
        toggleCamera,
        forceMute,
        streamReady: streamReadyRef.current,
    };
}
