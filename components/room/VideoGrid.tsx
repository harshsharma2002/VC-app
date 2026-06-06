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
    // Find all screen shares (including local)
    const screenSharers = remoteStreams.filter((rs) => rs.isScreenShare);
    const regularStreams = remoteStreams.filter((rs) => !rs.isScreenShare);
    
    const allScreenShares = [
        ...(isScreenSharing && screenStream
            ? [{ stream: screenStream, displayName: `${localDisplayName} (your screen)`, isLocal: true }]
            : []),
        ...screenSharers.map((rs) => ({
            stream: rs.stream,
            displayName: `${rs.displayName} (screen)`,
            isLocal: false,
        })),
    ];

    // Multiple screen shares: grid layout for screens + sidebar for cameras
    if (allScreenShares.length > 0) {
        const screenGridCols = allScreenShares.length === 1 ? "grid-cols-1" : "grid-cols-2";

        return (
            <div className="flex-1 flex gap-2 p-4 overflow-hidden">
                {/* Main screen share grid */}
                <div className={`flex-1 grid ${screenGridCols} gap-2`}>
                    {allScreenShares.map((screen, idx) => (
                        <div key={idx} className="bg-black rounded-lg overflow-hidden">
                            <VideoTile
                                stream={screen.stream}
                                displayName={screen.displayName}
                                muted={screen.isLocal}
                                isScreenShare
                            />
                        </div>
                    ))}
                </div>

                {/* Sidebar with camera feeds */}
                <div className="w-48 flex flex-col gap-2 overflow-y-auto">
                    {!isScreenSharing && (
                        <VideoTile stream={localStream} displayName={`${localDisplayName} (you)`} muted />
                    )}
                    {regularStreams.map((rs) => (
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