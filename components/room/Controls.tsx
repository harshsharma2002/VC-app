// components/room/Controls.tsx
"use client";
import {
    MessageSquare,
    Monitor,
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    Users,
} from "lucide-react";

type Props = {
    isMicOn: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onLeave: () => void;
    onChatToggle: () => void;
    onParticipantsToggle: () => void; // ✅ NEW
    unreadCount: number;
    participantCount: number; // ✅ NEW
};

export function Controls({
    isMicOn,
    isCameraOn,
    isScreenSharing,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onLeave,
    onChatToggle,
    onParticipantsToggle,
    unreadCount,
    participantCount,
}: Props) {
    return (
        <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700">
            <button
                onClick={onToggleMic}
                className={`p-3 rounded-full transition-all ${
                    isMicOn
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                aria-label={isMicOn ? "Mute" : "Unmute"}
            >
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
                onClick={onToggleCamera}
                className={`p-3 rounded-full transition-all ${
                    isCameraOn
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                aria-label={isCameraOn ? "Stop video" : "Start video"}
            >
                {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button
                onClick={onToggleScreenShare}
                className={`p-3 rounded-full transition-all ${
                    isScreenSharing
                        ? "bg-blue-600 hover:bg-blue-500 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
                aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
                <Monitor size={20} />
            </button>

            <button
                onClick={onLeave}
                className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all"
                aria-label="Leave call"
            >
                <PhoneOff size={20} />
            </button>

            <div className="flex-1" />

            {/* ✅ NEW: Participants Toggle */}
            <button
                onClick={onParticipantsToggle}
                className="relative p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all"
                aria-label="Toggle participants"
            >
                <Users size={20} />
                <span className="absolute -top-1 -right-1 bg-gray-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {participantCount}
                </span>
            </button>

            <button
                onClick={onChatToggle}
                className="relative p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all"
                aria-label="Toggle chat"
            >
                <MessageSquare size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
