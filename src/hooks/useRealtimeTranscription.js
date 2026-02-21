import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@deepgram/sdk';

export const useRealtimeTranscription = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcriptSegments, setTranscriptSegments] = useState([]); // Array of { speaker: number, text: string, isFinal: boolean }
    const [activeSpeakers, setActiveSpeakers] = useState(new Set());
    const [audioUrl, setAudioUrl] = useState(null);
    const [error, setError] = useState(null);

    const silenceTimerRef = useRef(null);

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

            // Start MediaRecorder IMMEDIATELY after getUserMedia to capture user gesture
            // This prevents Safari from blocking the recorder if connection.on('open') is too slow.
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            const audioChunks = [];
            const unsentChunks = []; // Buffer for chunks before connection is open

            mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    if (connection.getReadyState() === 1) { // 1 = OPEN
                        // If we have buffered chunks, send them first
                        while (unsentChunks.length > 0) {
                            const chunk = unsentChunks.shift();
                            connection.send(chunk);
                        }
                        connection.send(event.data);
                    } else {
                        // Queue it up
                        unsentChunks.push(event.data);
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

            connection.on('open', () => {
                setIsRecording(true);
                setError(null);

                // Flush any chunks that were recorded while opening
                while (unsentChunks.length > 0) {
                    const chunk = unsentChunks.shift();
                    connection.send(chunk);
                }
            });

            // Handle Silence / Pause Detection
            const insertPauseMarker = () => {
                setTranscriptSegments(prev => {
                    if (prev.length === 0) return prev;
                    const last = prev[prev.length - 1];
                    // Don't add if the last item is already a pause or interim
                    if (!last.isFinal || last.text.includes('[[PAUSE')) return prev;

                    const now = new Date();
                    const timeString = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const pauseText = `[[PAUSE ${timeString}]]`;

                    return [...prev, { speaker: last.speaker, text: pauseText, isFinal: true }];
                });
            };

            connection.on('UtteranceEnd', () => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(insertPauseMarker, 3000); // 3 seconds of silence for a marker
            });

            connection.on('Results', (data) => {
                if (!data.channel || !data.channel.alternatives || !data.channel.alternatives[0]) return;

                // Reset silence timer on any activity
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                const alt = data.channel.alternatives[0];
                const text = alt.transcript.trim(); // TRIM to prevent inconsistent spacing
                const isFinal = data.is_final;

                // Robust speaker detection
                // If words exist, take the first word's speaker.
                // If not, fallback to previous logical speaker or 0.
                const speaker = alt.words?.[0]?.speaker ?? 0;

                if (text.length > 0) {
                    setActiveSpeakers(prev => {
                        if (prev.has(speaker)) return prev;
                        const next = new Set(prev);
                        next.add(speaker);
                        return next;
                    });

                    setTranscriptSegments(prev => {
                        const newSegments = [...prev];
                        const lastIndex = newSegments.length - 1;

                        if (lastIndex >= 0) {
                            const lastSegment = newSegments[lastIndex];
                            // If the last one was a pause marker, we ALWAYS start a new actual text segment
                            if (lastSegment.text.includes('[[PAUSE')) {
                                newSegments.push({ speaker, text, isFinal });
                            } else if (!lastSegment.isFinal) {
                                // Overwrite the interim
                                newSegments[lastIndex] = { speaker, text, isFinal };
                            } else {
                                // Add new segment
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
                setError('Transcription error.');
            });

            connection.on('close', () => {
                setIsRecording(false);
            });

        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Could not access microphone.');
        }
    }, [apiKey]);

    // Compute flattened transcript with clean spacing
    const transcript = useMemo(() => {
        return transcriptSegments
            .map(s => s.text)
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ') // Ensure no double spaces
            .trim();
    }, [transcriptSegments]);

    const stopRecording = useCallback(() => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
        transcript,
        activeSpeakers: Array.from(activeSpeakers),
        audioUrl,
        error,
        startRecording,
        stopRecording,
        clearTranscript
    };
};
