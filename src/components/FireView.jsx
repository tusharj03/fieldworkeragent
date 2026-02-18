import React, { useState } from 'react';
import { MicrophoneButton } from './MicrophoneButton';
import { ReportCard } from './ReportCard';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { RorkService } from '../services/rork';
import { PdfService } from '../services/pdf';
import { Activity, AlertCircle } from 'lucide-react';

export const FireView = ({ user }) => {
    const {
        isRecording,
        transcript,
        startRecording,
        stopRecording,
        clearTranscript,
        audioUrl,
        error: voiceError
    } = useVoiceRecognition();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    const handleToggleRecording = () => {
        if (isRecording) {
            handleStopAndAnalyze();
        } else {
            setError(null);
            setReport(null);
            clearTranscript();
            startRecording();
        }
    };

    const handleStopAndAnalyze = async () => {
        stopRecording();
        if (!transcript.trim()) {
            setError("No speech detected. Please try again.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await RorkService.analyzeTranscript(transcript, 'FIRE');

            const reportWithMeta = {
                ...result,
                id: Math.floor(Date.now() % 10000),
                timestamp: new Date().toISOString(),
                mode: 'FIRE',
                userId: user.uid
            };

            setReport(reportWithMeta);

            const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            localStorage.setItem('saved_reports', JSON.stringify([reportWithMeta, ...savedReports]));

        } catch (err) {
            console.error(err);
            setError("Failed to analyze transcript. Please check your connection.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Welcome / Status */}
                {!report && !isAnalyzing && (
                    <div className="text-center py-12 animate-fade-in">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-glow">
                            Ready to Report?
                        </h2>
                        <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                            Tap the microphone to start recording your incident report.
                        </p>
                    </div>
                )}

                {/* Transcript Area */}
                <div className={`
          glass-panel rounded-2xl p-6 md:p-8 transition-all duration-500
          ${transcript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}
        `}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Transcript</span>
                        {isRecording && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                    </div>
                    <p className="text-lg md:text-xl leading-relaxed text-slate-200 font-light whitespace-pre-wrap">
                        {transcript}
                    </p>
                </div>

                {/* Analysis Loading */}
                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                        <div className="relative w-16 h-16 mb-6">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-lg font-medium text-slate-300">Analyzing Encounter...</p>
                        <p className="text-sm text-slate-500 mt-2">Extracting key details</p>
                    </div>
                )}

                {/* Error State */}
                {(error || voiceError) && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 animate-slide-up">
                        <AlertCircle size={20} />
                        <p>{error || voiceError}</p>
                    </div>
                )}

                {/* Report Result */}
                {report && !isAnalyzing && (
                    <div className="animate-slide-up">
                        <ReportCard
                            report={report}
                            audioUrl={audioUrl}
                            onExport={() => PdfService.generateReport(report, transcript)}
                        />
                    </div>
                )}

                {/* Explicit Spacer for Mic Button */}
                <div className="h-32 w-full" />
            </div>

            {/* Floating Action Button */}
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-20 pointer-events-none">
                <div className="max-w-4xl mx-auto flex justify-center pointer-events-auto">
                    <MicrophoneButton
                        isRecording={isRecording}
                        onClick={handleToggleRecording}
                        disabled={isAnalyzing}
                    />
                </div>
            </div>
        </>
    );
};
