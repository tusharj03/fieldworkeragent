import { useEffect } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

/**
 * Wrapper component that ONLY renders when Fire mode is active.
 * This ensures the underlying hook (which has no 'enabled' prop)
 * is completely unmounted when not needed, preventing conflicts.
 */
export const FireModeWrapper = ({ onUpdate }) => {
    const result = useVoiceRecognition();

    useEffect(() => {
        onUpdate(result);
    }, [result.transcript, result.isRecording, result.audioUrl, result.error, onUpdate]);

    return null; // Render nothing, just run the hook
};
