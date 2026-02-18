import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneButton } from './MicrophoneButton';
import { ReportCard } from './ReportCard';
import { FireActionItems } from './FireActionItems';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { RorkService } from '../services/rork';
import { PdfService } from '../services/pdf';
import { Activity, AlertCircle, ArrowLeft } from 'lucide-react';

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
    const [report, setReport] = useState(() => {
        const saved = localStorage.getItem('fire_report');
        return saved ? JSON.parse(saved) : null;
    });

    const [actionItems, setActionItems] = useState([]);
    // Transcript State Management
    // ---------------------------
    // Track the ID of the current in-progress report
    const [currentReportId, setCurrentReportId] = useState(() => {
        const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        // Find ALL in-progress Fire reports
        const inProgressReports = savedReports.filter(r => r.mode === 'FIRE' && r.status === 'in_progress');

        if (inProgressReports.length === 0) return null;

        // If multiple exist, sort by timestamp descending (newest first)
        // Note: We use the first one as the source of truth, and will clean up others in the effect below
        inProgressReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return inProgressReports[0].id;
    });

    // Effect: Consolidate duplicates on mount
    // If multiple in-progress reports exist, keep only the latest one to prevent "forked" history
    useEffect(() => {
        if (currentReportId) {
            const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            const inProgressReports = savedReports.filter(r => r.mode === 'FIRE' && r.status === 'in_progress');

            if (inProgressReports.length > 1) {
                // Keep the one matching currentReportId (which we determined is the latest)
                const validReport = savedReports.find(r => r.id === currentReportId);
                const otherReports = savedReports.filter(r => r.id !== currentReportId && !(r.mode === 'FIRE' && r.status === 'in_progress'));

                // Reconstruct reports list: Valid active report + All non-duplicate reports
                const consolidatedReports = [validReport, ...otherReports].filter(Boolean);

                localStorage.setItem('saved_reports', JSON.stringify(consolidatedReports));
                console.log('Consolidated in-progress reports. Kept:', currentReportId);
            }
        }
    }, [currentReportId]);

    const [persistedTranscript, setPersistedTranscript] = useState(() => {
        return localStorage.getItem('fire_transcript') || '';
    });

    const [restoredTranscript, setRestoredTranscript] = useState(() => {
        // Load transcript from the current in-progress history item if available
        if (currentReportId) {
            const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            const report = savedReports.find(r => r.id === currentReportId);
            return report ? report.transcript : '';
        }
        return '';
    });

    const [error, setError] = useState(null);

    // Combine restored text (from previous session) with live text (from current session)
    const activeTranscript = [restoredTranscript, transcript].filter(Boolean).join(' ');

    // Effect: Persist in-progress transcript to HISTORY
    useEffect(() => {
        if (!report && activeTranscript) {
            const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            const now = new Date().toISOString();

            let updatedReports;

            // If we have a current report ID, update that specific report
            if (currentReportId) {
                updatedReports = savedReports.map(r => {
                    if (r.id === currentReportId) {
                        return {
                            ...r,
                            transcript: activeTranscript,
                            timestamp: now
                            // Keep status as 'in_progress'
                        };
                    }
                    return r;
                });
            } else {
                // Otherwise, create a new one and set the ID
                const newId = Date.now();
                setCurrentReportId(newId); // Update state so subsequent saves update this one

                const newReport = {
                    id: newId,
                    mode: 'FIRE',
                    status: 'in_progress',
                    transcript: activeTranscript,
                    category: 'In Progress Incident',
                    timestamp: now,
                    userId: user.uid
                };

                updatedReports = [newReport, ...savedReports];
            }

            localStorage.setItem('saved_reports', JSON.stringify(updatedReports));
        }
    }, [activeTranscript, report, currentReportId, user.uid]);

    // Refs for polling interval
    const activeTranscriptRef = useRef(activeTranscript);
    const actionItemsRef = useRef(actionItems);

    useEffect(() => {
        activeTranscriptRef.current = activeTranscript;
        actionItemsRef.current = actionItems;
    }, [activeTranscript, actionItems]);

    // Poll for Action Items Updates
    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(async () => {
            if (!activeTranscriptRef.current.trim()) return;

            try {
                // Use the ref to get the latest transcript without restarting the interval
                const updatedItems = await RorkService.updateActionItems(activeTranscriptRef.current, actionItemsRef.current);
                setActionItems(updatedItems);
            } catch (err) {
                console.error("Failed to update action items", err);
            }
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [isRecording]);





    const handleToggleRecording = () => {
        if (isRecording) {
            handleStopAndAnalyze();
        } else {
            // Start or Resume
            setError(null);

            // If we have a completed report, this is a "Start New" action
            if (report) {
                setReport(null);
                setPersistedTranscript('');
                setRestoredTranscript('');
                setCurrentReportId(null);

                localStorage.removeItem('fire_report');
                localStorage.removeItem('fire_transcript');

                clearTranscript();
            }
            startRecording();
            // Reset action items on new recording start
            setActionItems([]);
        }
    };

    const handleStartNew = () => {
        // If there was an in-progress report, remove it from history as we are discarding it
        if (currentReportId) {
            const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            const updatedReports = savedReports.filter(r => r.id !== currentReportId);
            localStorage.setItem('saved_reports', JSON.stringify(updatedReports));
        }

        setReport(null);
        setPersistedTranscript('');
        setRestoredTranscript('');
        setCurrentReportId(null);
        setError(null);

        localStorage.removeItem('fire_report');
        localStorage.removeItem('fire_transcript');

        clearTranscript();
        startRecording();
    };

    const handleBack = () => {
        setReport(null);
        setPersistedTranscript('');
        setRestoredTranscript('');
        setCurrentReportId(null);
        setError(null);

        localStorage.removeItem('fire_report');
        localStorage.removeItem('fire_transcript');

        clearTranscript();
    };

    const handleStopAndAnalyze = async () => {
        stopRecording();

        // Use the combined transcript (restored + new) for analysis
        if (!activeTranscript.trim()) {
            setError("No speech detected. Please try again.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await RorkService.analyzeTranscript(activeTranscript, 'FIRE');

            // Use existing ID if available, else new one
            const reportId = currentReportId || Math.floor(Date.now() % 10000);

            const reportWithMeta = {
                ...result,
                id: reportId,
                timestamp: new Date().toISOString(),
                mode: 'FIRE',
                userId: user.uid,
                status: 'completed' // Mark as completed
            };

            setReport(reportWithMeta);
            setPersistedTranscript(activeTranscript);

            // Update local storage for active report view
            localStorage.setItem('fire_report', JSON.stringify(reportWithMeta));
            localStorage.setItem('fire_transcript', activeTranscript);

            // Update the history item to COMPLETED
            const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            let updatedReports;

            if (currentReportId) {
                updatedReports = savedReports.map(r => {
                    if (r.id === currentReportId) {
                        return {
                            ...reportWithMeta,
                            status: 'completed'
                        };
                    }
                    return r;
                });
            } else {
                updatedReports = [reportWithMeta, ...savedReports];
            }

            localStorage.setItem('saved_reports', JSON.stringify(updatedReports));

        } catch (err) {
            console.error(err);
            setError("Failed to analyze transcript. Please check your connection.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Use the persisted transcript if we have a report (for correct display after reload)
    // Otherwise use the active (restored + live) transcript
    const displayTranscript = report ? persistedTranscript : activeTranscript;

    const handleToggleActionItem = (itemId) => {
        setActionItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, isCompleted: !item.isCompleted }
                : item
        ));
    };

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8 relative">
                {/* Back Button for Report View */}
                {report && !isAnalyzing && (
                    <div className="absolute -top-12 left-0 z-10">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group px-3 py-2 rounded-lg hover:bg-white/5"
                        >
                            <div className="p-1 rounded-full bg-slate-800/50 group-hover:bg-slate-700 transition-colors">
                                <ArrowLeft size={16} />
                            </div>
                            <span className="font-medium">Back to Start</span>
                        </button>
                    </div>
                )}

                {/* Welcome / Status */}
                {!report && !isAnalyzing && (
                    <div className="text-center py-12 animate-fade-in">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-glow">
                            {displayTranscript ? (isRecording ? 'Listening...' : 'Transcript Paused') : 'Ready to Report?'}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                            {displayTranscript
                                ? (isRecording ? 'Keep speaking to add to your report.' : 'Tap the microphone to resume, or start over.')
                                : 'Tap the microphone to start recording your incident report.'}
                        </p>

                        {/* Start Over Option (Only if we have content but aren't recording) */}
                        {displayTranscript && !isRecording && (
                            <button
                                onClick={handleStartNew}
                                className="mt-6 text-sm text-red-400 hover:text-red-300 underline decoration-red-500/30 hover:decoration-red-400 underline-offset-4 transition-all"
                            >
                                Discard & Start New Report
                            </button>
                        )}
                    </div>
                )}

                {/* Transcript Area & Action Items */}
                <div className={`
          transition-all duration-500
          ${displayTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}
        `}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Transcript Column */}
                        <div className={`${actionItems.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} glass-panel rounded-2xl p-6 md:p-8 transition-all duration-500`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {report ? 'Report Transcript' : 'Live Transcript'}
                                </span>
                                {isRecording && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                            </div>
                            <p className="text-lg md:text-xl leading-relaxed text-slate-200 font-light whitespace-pre-wrap">
                                {displayTranscript}
                            </p>
                        </div>

                        {/* Action Items Column - Only show if there are items */}
                        {actionItems.length > 0 && (
                            <div className="lg:col-span-1 animate-slide-in-right">
                                <FireActionItems
                                    items={actionItems}
                                    onToggle={handleToggleActionItem}
                                />
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
                            onExport={() => PdfService.generateReport(report, displayTranscript)}
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
