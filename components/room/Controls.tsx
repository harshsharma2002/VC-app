// components/room/Controls.tsx
"use client";
import { MessageSquare } from "lucide-react";

type Props = {
    isMicOn: boolean;
    isCameraOn: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onLeave: () => void;
    onChatToggle: () => void;
    unreadCount: number;
};

export function Controls({
    isMicOn,
    isCameraOn,
    onToggleMic,
    onToggleCamera,
    onLeave,
    onChatToggle,
    unreadCount,
}: Props) {
    return (
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-900">
            <button
                onClick={onToggleMic}
                className={`px-4 py-2 rounded-full ${isMicOn ? "bg-gray-700" : "bg-red-600"} text-white`}
            >
                {isMicOn ? "Mute" : "Unmute"}
            </button>
            <button
                onClick={onToggleCamera}
                className={`px-4 py-2 rounded-full ${isCameraOn ? "bg-gray-700" : "bg-red-600"} text-white`}
            >
                {isCameraOn ? "Stop video" : "Start video"}
            </button>
            <button
                onClick={onLeave}
                className="px-4 py-2 rounded-full bg-red-600 text-white"
            >
                Leave
            </button>
            <button
                onClick={onChatToggle}
                className="relative p-3 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                aria-label="Toggle chat"
            >
                <MessageSquare size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
