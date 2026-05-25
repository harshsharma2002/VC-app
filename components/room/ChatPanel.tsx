'use client'

import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import type { ChatMessage } from '@/hooks/useChat'
import { X, Send } from 'lucide-react'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onClose: () => void
}

export function ChatPanel({ messages, onSend, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-700 w-80 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <span className="text-sm font-semibold text-zinc-100">Chat</span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-xs text-center mt-8">No messages yet</p>
        )}
        {messages.map(msg => (
          <div
            key={msg.messageId}
            className={`flex flex-col gap-0.5 ${msg.isSelf ? 'items-end' : 'items-start'}`}
          >
            {!msg.isSelf && (
              <span className="text-xs text-zinc-400 px-1">{msg.senderName}</span>
            )}
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm break-words ${
                msg.isSelf
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-zinc-700 text-zinc-100 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-zinc-500 px-1">
              {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-zinc-700 flex gap-2 items-center">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message…"
          maxLength={500}
          className="flex-1 bg-zinc-800 text-zinc-100 text-sm rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}