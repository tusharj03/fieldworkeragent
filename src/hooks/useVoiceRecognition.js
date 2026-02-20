import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isListeningDesired = useRef(false); // Track if user WANTS to be recording
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Browser does not support speech recognition.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let newFinal = '';
      let newInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newFinal += event.results[i][0].transcript;
        } else {
          newInterim += event.results[i][0].transcript;
        }
      }

      if (newFinal) {
        setFinalTranscript(prev => prev + (prev ? ' ' : '') + newFinal);
      }
      setInterimTranscript(newInterim);

      // --- SILENCE DETECTION LOGIC ---
      // Clear any existing timer because we just received speech
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // We only want to insert a pause if there isn't actively interim speech
      // AND we have some final transcript to attach it to.
      if (!newInterim) {
        silenceTimerRef.current = setTimeout(() => {
          setFinalTranscript(prev => {
            // Prevent duplicate pauses back-to-back
            if (prev && !prev.endsWith(' [PAUSE]')) {
              return prev + ' [PAUSE]';
            }
            return prev;
          });
        }, 5000); // 5 seconds of silence
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.');
        setIsRecording(false);
        isListeningDesired.current = false;
      } else {
        // For other errors (no-speech, network), we might want to ignore or just let onend handle restart
        // setError(`Error: ${event.error}`); 
      }
    };

    recognition.onend = () => {
      if (isListeningDesired.current) {
        // Auto-restart if we still want to be listening
        try {
          recognition.start();
        } catch (err) {
          console.error('Failed to restart recognition:', err);
          setIsRecording(false);
          isListeningDesired.current = false;
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (recognitionRef.current && !isRecording) {
      try {
        // Start Audio Recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);

          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        // Start Speech Recognition
        isListeningDesired.current = true;
        recognitionRef.current.start();
        setIsRecording(true);
        setError(null);
        setAudioUrl(null); // Clear previous recording
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('Could not access microphone for audio recording.');
      }
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      isListeningDesired.current = false;
      recognitionRef.current.stop();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);
    }
  }, [isRecording]);

  const clearTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setAudioUrl(null);
  }, []);

  return {
    isRecording,
    transcript: finalTranscript + (interimTranscript ? ' ' + interimTranscript : ''),
    audioUrl,
    error,
    startRecording,
    stopRecording,
    clearTranscript
  };
};
