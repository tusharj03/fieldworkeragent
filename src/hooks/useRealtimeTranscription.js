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
                utterance_end_ms: 1000,
                vad_events: true,
                filler_words: false,
                punctuate: true,
            });

            deepgramConnectionRef.current = connection;

            connection.on('open', () => {
                setIsRecording(true);
                setError(null);

                // Use 250ms chunks for lower latency streaming
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

                mediaRecorder.start(250);
            });

            connection.on('Results', (data) => {
                if (!data.channel || !data.channel.alternatives || !data.channel.alternatives[0]) return;

                const alt = data.channel.alternatives[0];
                const text = alt.transcript;
                const isFinal = data.is_final;

                // Robust speaker detection
                // If words exist, take the first word's speaker.
                // If not, fallback to previous logical speaker or 0.
                const speaker = alt.words?.[0]?.speaker ?? 0;

                if (text && text.trim().length > 0) {
                    setActiveSpeakers(prev => new Set(prev).add(speaker));

                    setTranscriptSegments(prev => {
                        const newSegments = [...prev];
                        const lastIndex = newSegments.length - 1;

                        if (lastIndex >= 0) {
                            const lastSegment = newSegments[lastIndex];

                            // Critical Fix:
                            // If the last segment was NOT final (interim), we ALWAYS overwrite it with the new incoming result.
                            // This handles corrections, speaker re-assignment, and text updates properly.
                            // We do NOT append a new segment unless the previous one was finalized.
                            if (!lastSegment.isFinal) {
                                newSegments[lastIndex] = {
                                    speaker,
                                    text,
                                    isFinal
                                };
                            } else {
                                // Previous was final, so this is a new utterance.
                                newSegments.push({ speaker, text, isFinal });
                            }
                        } else {
                            // First segment ever
                            newSegments.push({ speaker, text, isFinal });
                        }
                        return newSegments;
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
