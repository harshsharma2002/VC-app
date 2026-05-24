// components/room/Controls.tsx
'use client'

type Props = {
  isMicOn: boolean
  isCameraOn: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onLeave: () => void
}

export function Controls({ isMicOn, isCameraOn, onToggleMic, onToggleCamera, onLeave }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-900">
      <button
        onClick={onToggleMic}
        className={`px-4 py-2 rounded-full ${isMicOn ? 'bg-gray-700' : 'bg-red-600'} text-white`}
      >
        {isMicOn ? 'Mute' : 'Unmute'}
      </button>
      <button
        onClick={onToggleCamera}
        className={`px-4 py-2 rounded-full ${isCameraOn ? 'bg-gray-700' : 'bg-red-600'} text-white`}
      >
        {isCameraOn ? 'Stop video' : 'Start video'}
      </button>
      <button
        onClick={onLeave}
        className="px-4 py-2 rounded-full bg-red-600 text-white"
      >
        Leave
      </button>
    </div>
  )
}