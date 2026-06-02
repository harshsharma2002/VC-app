// components/room/VideoGrid.tsx
import { VideoTile } from "./VideoTile";
import type { RemoteStream } from "@/hooks/useWebRTC";

type Props = {
    localStream: MediaStream | null;
    localDisplayName: string;
    remoteStreams: RemoteStream[];
    isScreenSharing?: boolean;
    screenStream?: MediaStream | null;
};

export function VideoGrid({
    localStream,
    localDisplayName,
    remoteStreams,
    isScreenSharing,
    screenStream,
}: Props) {
    // Find if anyone is screen sharing
    const screenSharer = remoteStreams.find((rs) => rs.isScreenShare);
    const regularStreams = remoteStreams.filter((rs) => !rs.isScreenShare);

    // If someone is screen sharing, show it large
    if (screenSharer) {
        return (
            <div className="flex-1 flex gap-2 p-4 overflow-hidden">
                {/* Main screen share view */}
                <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
                    <VideoTile
                        stream={screenSharer.stream}
                        displayName={`${screenSharer.displayName} (screen)`}
                        isScreenShare
                    />
                </div>

                {/* Sidebar with participant thumbnails */}
                <div className="w-48 flex flex-col gap-2 overflow-y-auto">
                    <VideoTile stream={localStream} displayName={`${localDisplayName} (you)`} muted />
                    {regularStreams.map((rs) => (
                        <VideoTile key={rs.socketId} stream={rs.stream} displayName={rs.displayName} />
                    ))}
                </div>
            </div>
        );
    }

    // If local user is screen sharing
    if (isScreenSharing && screenStream) {
        return (
            <div className="flex-1 flex gap-2 p-4 overflow-hidden">
                <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
                    <VideoTile stream={screenStream} displayName={`${localDisplayName} (your screen)`} muted isScreenShare />
                </div>
                <div className="w-48 flex flex-col gap-2 overflow-y-auto">
                    <VideoTile stream={localStream} displayName={`${localDisplayName} (camera)`} muted />
                    {remoteStreams.map((rs) => (
                        <VideoTile key={rs.socketId} stream={rs.stream} displayName={rs.displayName} />
                    ))}
                </div>
            </div>
        );
    }

    // Default grid layout (no screen sharing)
    const total = remoteStreams.length + 1;
    const gridCols =
        total <= 2 ? "grid-cols-1 md:grid-cols-2" : total <= 9 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-3 md:grid-cols-4";

    return (
        <div className={`flex-1 grid ${gridCols} gap-2 p-4 overflow-auto`}>
            <VideoTile stream={localStream} displayName={`${localDisplayName} (you)`} muted />
            {remoteStreams.map((rs) => (
                <VideoTile key={rs.socketId} stream={rs.stream} displayName={rs.displayName} />
            ))}
        </div>
    );
}