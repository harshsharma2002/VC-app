import { VideoTile } from './VideoTile'
import type { RemoteStream } from '@/hooks/useWebRTC'

type Props = {
    localStream: MediaStream | null
    localDisplayName: string
    remoteStreams: RemoteStream[]
}

export function VideoGrid({ localStream, localDisplayName, remoteStreams }: Props) {
    const total = remoteStreams.length + 1  // +1 for local

    const gridCols =
        total <= 2 ? 'grid-cols-1 md:grid-cols-2' :
        total <= 9 ? 'grid-cols-2 md:grid-cols-3' :
        'grid-cols-3 md:grid-cols-4'

    return (
        <div className={`flex-1 grid ${gridCols} gap-2 p-4 overflow-auto`}>
            <VideoTile stream={localStream} displayName={`${localDisplayName} (you)`} muted />
            {remoteStreams.map(rs => (
                <VideoTile key={rs.socketId} stream={rs.stream} displayName={rs.displayName} />
            ))}
        </div>
    )
}