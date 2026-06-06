// components/room/ParticipantsPanel.tsx
"use client";
import { Users, UserX, Volume2, VolumeX, Crown } from "lucide-react";
import type { RemoteStream } from "@/hooks/useWebRTC";

type Participant = {
    socketId: string;
    displayName: string;
    isMuted: boolean;
    isCreator: boolean;
};

type Props = {
    localDisplayName: string;
    isLocalCreator: boolean;
    participants: Participant[];
    onMuteParticipant: (socketId: string) => void;
    onKickParticipant: (socketId: string) => void;
    onClose: () => void;
};

export function ParticipantsPanel({
    localDisplayName,
    isLocalCreator,
    participants,
    onMuteParticipant,
    onKickParticipant,
    onClose,
}: Props) {
    return (
        <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-700 w-80 shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-zinc-400" />
                    <span className="text-sm font-semibold text-zinc-100">
                        Participants ({participants.length + 1})
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-zinc-100 transition-colors text-xl"
                    aria-label="Close participants"
                >
                    ×
                </button>
            </div>

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {/* Local User */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isLocalCreator && (
                            <Crown size={14} className="text-yellow-500 flex-shrink-0" />
                        )}
                        <span className="text-sm text-zinc-100 truncate">
                            {localDisplayName} (you)
                        </span>
                    </div>
                </div>

                {/* Remote Participants */}
                {participants.map((p) => (
                    <div
                        key={p.socketId}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 hover:bg-zinc-750 transition-colors"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {p.isCreator && (
                                <Crown size={14} className="text-yellow-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-zinc-100 truncate">
                                {p.displayName}
                            </span>
                            {p.isMuted && (
                                <VolumeX size={14} className="text-red-400 flex-shrink-0" />
                            )}
                        </div>

                        {/* Admin Controls */}
                        {isLocalCreator && !p.isCreator && (
                            <div className="flex items-center gap-1 ml-2">
                                <button
                                    onClick={() => onMuteParticipant(p.socketId)}
                                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    aria-label="Mute participant"
                                    title="Mute"
                                >
                                    <VolumeX size={16} />
                                </button>
                                <button
                                    onClick={() => onKickParticipant(p.socketId)}
                                    className="p-1.5 rounded hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
                                    aria-label="Kick participant"
                                    title="Remove"
                                >
                                    <UserX size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}