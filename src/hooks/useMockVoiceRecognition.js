import { useState, useEffect, useRef, useCallback } from 'react';

// This mock must match the hook order/count of the real useVoiceRecognition.js exactly.
export const useVoiceRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isListeningDesired = useRef(false);

    // No-op useEffect
    useEffect(() => {
        // Do nothing
        return () => { };
    }, []);

    const startRecording = useCallback(async () => {
        // Mock start
        console.log("Mock start recording called (should not happen in FIRE mode)");
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        // Mock stop
    }, [isRecording]);

    const clearTranscript = useCallback(() => {
        setFinalTranscript('');
        setInterimTranscript('');
        setAudioUrl(null);
    }, []);

    return {
        isRecording,
        transcript: '',
        audioUrl,
        error,
        startRecording,
        stopRecording,
        clearTranscript
    };
};
