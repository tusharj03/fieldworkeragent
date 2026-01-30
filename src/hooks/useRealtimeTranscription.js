import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@deepgram/sdk';

export const useRealtimeTranscription = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcriptSegments, setTranscriptSegments] = useState([]); // Array of { speaker: number, text: string, isFinal: boolean }
    const [activeSpeakers, setActiveSpeakers] = useState(new Set());
    const [audioUrl, setAudioUrl] = useState(null);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const deepgramConnectionRef = useRef(null);
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;

    const startRecording = useCallback(async () => {
        if (!apiKey) {
            setError('Missing VITE_DEEPGRAM_API_KEY in .env');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const deepgram = createClient(apiKey);

            const connection = deepgram.listen.live({
                model: 'nova-2',
                language: 'en-US',
                smart_format: true,
                diarize: true,
                interim_results: true,
            });

            deepgramConnectionRef.current = connection;

            connection.on('open', () => {
                setIsRecording(true);
                setError(null);

                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;
                const audioChunks = [];

                mediaRecorder.addEventListener('dataavailable', (event) => {
                    if (event.data.size > 0) {
                        if (connection.getReadyState() === 1) { // 1 = OPEN
                            connection.send(event.data);
                        }
                        audioChunks.push(event.data);
                    }
                });

                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const url = URL.createObjectURL(audioBlob);
                    setAudioUrl(url);
                    stream.getTracks().forEach(track => track.stop());
                });

                mediaRecorder.start(100); // Send chunks every 100ms
            });

            connection.on('transcriptReceived', (packet) => {
                // Handle metadata or keep-alive if needed
            });

            connection.on('Results', (data) => {
                if (!data.channel || !data.channel.alternatives || !data.channel.alternatives[0]) return;

                const alt = data.channel.alternatives[0];
                const text = alt.transcript;
                const isFinal = data.is_final;

                // Deepgram gives words with speaker tags
                // For simplicity in this demo, we'll take the speaker of the first word as the "block speaker"
                // A more robust solution maps word-by-word.
                const speaker = alt.words && alt.words.length > 0 ? alt.words[0].speaker : 0; // Default to 0 if unknown

                if (text) {
                    setActiveSpeakers(prev => new Set(prev).add(speaker));

                    setTranscriptSegments(prev => {
                        // Logic to merge interim results or append new segments
                        // This is a naive implementation: just push everything. 
                        // In reality, we want to replace the LAST segment if it was not final, or append specific words.
                        // Simplified for prototype:

                        // If the last segment is from the same speaker and NOT final, update it.
                        const last = prev[prev.length - 1];
                        if (last && !last.isFinal && last.speaker === speaker) {
                            const newPrev = [...prev];
                            newPrev[newPrev.length - 1] = { speaker, text, isFinal };
                            return newPrev;
                        } else {
                            return [...prev, { speaker, text, isFinal }];
                        }
                    });
                }
            });

            connection.on('error', (err) => {
                console.error('Deepgram error:', err);
                setError('Connection to transcription service failed.');
            });

            connection.on('close', () => {
                setIsRecording(false);
            });

        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Could not access microphone.');
        }
    }, [apiKey]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (deepgramConnectionRef.current) {
            deepgramConnectionRef.current.finish();
            deepgramConnectionRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscriptSegments([]);
        setActiveSpeakers(new Set());
        setAudioUrl(null);
    }, []);

    return {
        isRecording,
        transcriptSegments,
        activeSpeakers: Array.from(activeSpeakers),
        audioUrl,
        error,
        startRecording,
        stopRecording,
        clearTranscript
    };
};
