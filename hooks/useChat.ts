"use client";
import {
    useState,
    useCallback,
    useRef,
    useEffect,
    type RefObject,
} from "react";
import type { Socket } from "socket.io-client";

export interface ChatMessage {
    messageId: string;
    senderId: string;
    senderName: string;
    text: string;
    sentAt: string;
    isSelf: boolean;
}

export function useChat(socketRef: RefObject<Socket | null>, roomId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const isOpenRef = useRef(false);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    // Called by useSocket when chat:history arrives (on join)
    const onChatHistory = useCallback((history: ChatMessage[]) => {
        setMessages(history);
    }, []);

    // Called by useSocket when chat:message arrives
    const onChatMessage = useCallback((msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
        if (!isOpenRef.current) setUnreadCount((prev) => prev + 1);
    }, []);

    const sendMessage = useCallback(
        (text: string) => {
            if (!socketRef.current || !text.trim()) return;
            socketRef.current.emit("chat:send", { roomId, text });
        },
        [socketRef, roomId],
    );

    const openChat = useCallback(() => {
        setIsOpen(true);
        setUnreadCount(0);
    }, []);

    const closeChat = useCallback(() => setIsOpen(false), []);

    return {
        messages,
        sendMessage,
        unreadCount,
        isOpen,
        openChat,
        closeChat,
        onChatHistory, // ← passed to useSocket
        onChatMessage, // ← passed to useSocket
    };
}
