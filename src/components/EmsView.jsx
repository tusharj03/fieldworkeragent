import React, { useState, useMemo } from 'react';
import { MicrophoneButton } from './MicrophoneButton';
import { ReportCard } from './ReportCard';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import { RorkService } from '../services/rork';
import { PdfService } from '../services/pdf';
import { Activity, AlertCircle, UserCheck, UserX } from 'lucide-react';

export const EmsView = ({ user, activeTemplate, setActiveTemplate }) => {
    const {
        isRecording,
        transcriptSegments,
        activeSpeakers,
        startRecording,
        stopRecording,
        clearTranscript,
        audioUrl,
        error: voiceError
    } = useRealtimeTranscription();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);
    const [consentedSpeakers, setConsentedSpeakers] = useState(new Set());

    // Filter segments based on consent
    const visibleSegments = useMemo(() => {
        return transcriptSegments.filter(seg => consentedSpeakers.has(seg.speaker));
    }, [transcriptSegments, consentedSpeakers]);

    const fullTranscript = visibleSegments.map(s => s.text).join(' ');

    const toggleConsent = (speakerId) => {
        setConsentedSpeakers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(speakerId)) {
                newSet.delete(speakerId);
            } else {
                newSet.add(speakerId);
            }
            return newSet;
        });
    };

    const handleToggleRecording = () => {
        if (isRecording) {
            handleStopAndAnalyze();
        } else {
            setError(null);
            setReport(null);
            clearTranscript();
            setConsentedSpeakers(new Set());
            startRecording();
        }
    };

    const handleStopAndAnalyze = async () => {
        stopRecording();
        if (!fullTranscript.trim()) {
            setError("No consented speech detected. Please approve a speaker.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await RorkService.analyzeTranscript(fullTranscript, 'EMS', activeTemplate);

            const reportWithMeta = {
                ...result,
                id: Math.floor(Date.now() % 10000),
                timestamp: new Date().toISOString(),
                mode: 'EMS',
                userId: user.uid,
                templateUsed: activeTemplate?.title || 'Generative'
            };

            setReport(reportWithMeta);
            setActiveTemplate(null);

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
                            {activeTemplate ? `Active: ${activeTemplate.title}` : 'Ready to Report?'}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                            {activeTemplate
                                ? "Recording will be analyzed using this specific workflow."
                                : "Tap the microphone. New voices must be approved to be recorded."}
                        </p>
                    </div>
                )}

                {/* Speaker Management UI */}
                {isRecording && (
                    <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 animate-fade-in">
                        <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Detected Speakers</h3>
                        <div className="flex flex-wrap gap-3">
                            {activeSpeakers.length === 0 && <span className="text-slate-600 text-sm italic">Listening...</span>}
                            {activeSpeakers.map(speakerId => {
                                const isConsented = consentedSpeakers.has(speakerId);
                                return (
                                    <button
                                        key={speakerId}
                                        onClick={() => toggleConsent(speakerId)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${isConsented
                                            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                                            : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {isConsented ? <UserCheck size={14} /> : <UserX size={14} />}
                                        Voice {speakerId}
                                        <span className="ml-1 text-xs opacity-60">
                                            {isConsented ? 'Approved' : 'Unknown'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Transcript Area */}
                <div className={`
          glass-panel rounded-2xl p-6 md:p-8 transition-all duration-500
          ${transcriptSegments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}
        `}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Live Transcript (Consented Only)
                        </span>
                    </div>

                    <div className="space-y-4">
                        {transcriptSegments.map((seg, idx) => {
                            const text = seg.text.replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/g, '');
                            if (!text.trim() && seg.text.includes('[[PAUSE')) return null;

                            return (
                                <div key={idx} className={`inline gap-4 transition-all duration-300 ${!seg.isFinal ? 'opacity-50 italic' : 'opacity-100'}`}>
                                    <span className="text-xs font-bold text-slate-500 mr-2">V{seg.speaker}:</span>
                                    <span className="text-lg md:text-xl leading-relaxed text-slate-200 font-light">
                                        {text}
                                        {!seg.isFinal && <span className="inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse ml-2 align-middle" />}
                                    </span>
                                    {' '}
                                </div>
                            );
                        })}
                        {transcriptSegments.length === 0 && (
                            <div className="text-center py-4 text-slate-500 italic">
                                Audio detected but no speakers approved yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Analysis Loading */}
                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                        <div className="relative w-16 h-16 mb-6">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-lg font-medium text-slate-300">Analyzing Encounter...</p>
                        <p className="text-sm text-slate-500 mt-2">Extracting vitals, timeline, and key details</p>
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
                            onExport={() => PdfService.generateReport(report, fullTranscript)}
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
