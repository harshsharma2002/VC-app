// hooks/useMediaDevices.ts
"use client";
import { useState, useEffect, useRef } from "react";

export function useMediaDevices() {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

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
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            screenStreamRef.current = null;
        };
    }, []);

    const toggleMic = () => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track) {
            console.warn("[Media] No audio track found");
            return;
        }
        const nextEnabled = !track.enabled;
        track.enabled = nextEnabled;
        setIsMicOn(nextEnabled);
        console.log("[Media] Mic toggled:", nextEnabled ? "ON" : "OFF");
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
    };

    const startScreenShare = async (): Promise<MediaStream | null> => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false, // Screen audio is complex, start without it
            });

            screenStreamRef.current = displayStream;
            setScreenStream(displayStream);
            setIsScreenSharing(true);

            // Listen for user clicking browser's "Stop sharing" button
            displayStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            console.log("[Media] Screen sharing started");
            return displayStream;
        } catch (err) {
            console.error("[Media] Screen share failed:", err);
            setError("Could not start screen sharing");
            return null;
        }
    };

    const stopScreenShare = () => {
        if (!screenStreamRef.current) return;

        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setScreenStream(null);
        setIsScreenSharing(false);
        console.log("[Media] Screen sharing stopped");
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
        streamReady: streamReadyRef.current,
    };
}
