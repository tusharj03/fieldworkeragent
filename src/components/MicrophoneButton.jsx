import React from 'react';
import { Mic, Square } from 'lucide-react';

export function MicrophoneButton({ isRecording, onClick, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        flex items-center justify-center rounded-full transition-all duration-300
        ${isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl'
                }
        text-white disabled:opacity-50 disabled:cursor-not-allowed
      `}
            style={{
                width: '80px',
                height: '80px',
                backgroundColor: isRecording ? 'var(--color-recording)' : 'var(--color-primary)'
            }}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
        >
            {isRecording ? (
                <Square size={32} fill="currentColor" />
            ) : (
                <Mic size={32} />
            )}
        </button>
    );
}
