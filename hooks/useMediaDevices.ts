"use client";
import { useState, useEffect, useRef, useCallback } from "react";

function describeMediaError(err: unknown) {
    if (err instanceof Error) {
        return `${err.name}: ${err.message}`;
    }

    return "Unknown camera or microphone error";
}

export function useMediaDevices() {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);

    // null as unknown as Promise<MediaStream> is intentional —
    // the if block below initialises it exactly once before it can be read.
    const streamReadyRef = useRef<Promise<MediaStream>>(
        null as unknown as Promise<MediaStream>,
    );

    const applyStreamTracks = useCallback((tracks: MediaStreamTrack[]) => {
        const nextStream = new MediaStream(tracks.filter((track) => track.readyState !== "ended"));
        streamRef.current = nextStream;
        setStream(nextStream);
        return nextStream;
    }, []);

    const stopTrack = useCallback(
        (kind: "audio" | "video") => {
            const currentStream = streamRef.current;
            const track = currentStream?.getTracks().find((item) => item.kind === kind);
            if (!track) return;
            if (!currentStream) return;

            track.stop();
            applyStreamTracks(currentStream.getTracks().filter((item) => item !== track));
        },
        [applyStreamTracks],
    );

    const enableTrack = useCallback(
        async (kind: "audio" | "video") => {
            if (typeof window === "undefined" || !navigator.mediaDevices) {
                setError("Camera and microphone require HTTPS or localhost");
                return false;
            }

            try {
                const nextStream = await navigator.mediaDevices.getUserMedia({
                    audio: kind === "audio",
                    video: kind === "video",
                });
                const track = kind === "audio" ? nextStream.getAudioTracks()[0] : nextStream.getVideoTracks()[0];
                if (!track) {
                    throw new Error(`No ${kind} track returned from getUserMedia`);
                }

                const currentTracks = streamRef.current?.getTracks().filter((item) => item.kind !== kind) ?? [];
                applyStreamTracks([...currentTracks, track]);
                setError(null);
                return true;
            } catch (err) {
                setError(`Could not access camera or microphone: ${describeMediaError(err)}`);
                return false;
            }
        },
        [applyStreamTracks],
    );

    // Lazy-initialise once. The ref guard prevents a second getUserMedia call
    // on React Strict Mode's double-mount, which would throw NotReadableError.
    // typeof window guards against Node.js 18+ which has navigator but no mediaDevices.
    if (!streamReadyRef.current) {
        streamReadyRef.current = new Promise<MediaStream>((resolve, reject) => {
            if (typeof window === "undefined" || !navigator.mediaDevices) {
                reject(new Error("navigator.mediaDevices unavailable"));
                return;
            }
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((s) => {
                    streamRef.current = s;
                    setStream(s);
                    resolve(s);
                })
                .catch((err) => {
                    setError(
                        `Could not access camera or microphone: ${describeMediaError(err)}`,
                    );
                    reject(err);
                });
        });
        // Suppress unhandled rejection — callers (useWebRTC) handle it via try/catch.
        streamReadyRef.current.catch(() => {});
    }

    useEffect(() => {
        if (!navigator.mediaDevices) {
            setError("Camera and microphone require HTTPS or localhost");
        }
    }, []);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        };
    }, []);

    const toggleMic = () => {
        if (isMicOn) {
            stopTrack("audio");
            setIsMicOn(false);
            return;
        }

        void enableTrack("audio").then((success) => {
            if (success) {
                setIsMicOn(true);
            }
        });
    };

    const toggleCamera = () => {
        if (isCameraOn) {
            stopTrack("video");
            setIsCameraOn(false);
            return;
        }

        void enableTrack("video").then((success) => {
            if (success) {
                setIsCameraOn(true);
            }
        });
    };

    const forceMute = () => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.stop();
        applyStreamTracks(streamRef.current?.getTracks().filter((item) => item !== track) ?? []);
        setIsMicOn(false);
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
