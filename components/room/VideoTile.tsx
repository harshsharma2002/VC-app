// components/room/VideoTile.tsx
"use client";
import { useEffect, useRef } from "react";

type Props = {
    stream: MediaStream | null;
    displayName: string;
    muted?: boolean; // mute local video to avoid echo
};

export function VideoTile({ stream, displayName, muted = false }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;
        if (stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {}); // autoplay policy guard
        } else {
            videoRef.current.srcObject = null;
        }
    }, [stream]);

    return (
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-0.5 rounded">
                {displayName}
            </span>
        </div>
    );
}
