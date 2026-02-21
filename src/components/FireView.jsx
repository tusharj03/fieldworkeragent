import React, { useState, useEffect, useRef } from 'react';
import { Mic, Info, Play, Pause, AlertCircle, Phone, ArrowLeft, RefreshCw, Layers, StickyNote, Activity, FileText, Download, ShieldAlert, CheckCircle, Flame, Car, Settings } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { MicrophoneButton } from './MicrophoneButton';
import { ReportCard } from './ReportCard';
import { FireActionItems } from './FireActionItems';
import { SortableItem } from './SortableItem';
import { RorkService } from '../services/rork.js';
import { PdfService } from '../services/pdf.js';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js';
import { useLayoutEditor } from '../hooks/useLayoutEditor.js';

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

    // Draggable Layout Mechanics
    const { isEditingLayout, layoutOrder, toggleEditMode, saveLayout, handleDragEnd } = useLayoutEditor('live');
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [actionItems, setActionItems] = useState([]);
    const [notes, setNotes] = useState([]);
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

    // Extract "Note to Self" items
    useEffect(() => {
        if (!activeTranscript) return;

        // Phrases that trigger a note
        // Case insensitive matching
        const triggerPhrases = [
            "note to self",
            "add note to self",
            "take a note",
            "important note",
            "make a note"
        ];

        const endPhrases = [
            "end note",
            "and note",
            "and no",
            "edge note",
            "end of note",
            "close note",
            "that's it"
        ];

        // We want to find all instances of these phrases and capture the text after them
        // until the end of the sentence or the next trigger phrase.
        // Simple heuristic: Text after trigger until '.' or '?' or newline

        const extractedNotes = [];
        const lowerTranscript = activeTranscript.toLowerCase();

        let lastIndex = 0;

        // Find all occurrences
        // This is a basic implementation - for production, might want more robust NLP or regex
        // We will scan the whole transcript to rebuild the notes list to avoid duplicates/state desync

        // Helper to find the first occurring trigger after a certain index
        const findNextTrigger = (startIndex) => {
            let nextTrigger = null;
            let minIndex = Infinity;

            triggerPhrases.forEach(phrase => {
                const idx = lowerTranscript.indexOf(phrase, startIndex);
                if (idx !== -1 && idx < minIndex) {
                    minIndex = idx;
                    nextTrigger = phrase;
                }
            });

            return nextTrigger ? { phrase: nextTrigger, index: minIndex } : null;
        };

        const findNextEndPhrase = (startIndex) => {
            let nextEnd = null;
            let minIndex = Infinity;

            endPhrases.forEach(phrase => {
                const idx = lowerTranscript.indexOf(phrase, startIndex);
                if (idx !== -1 && idx < minIndex) {
                    minIndex = idx;
                    nextEnd = phrase;
                }
            });

            return nextEnd ? { phrase: nextEnd, index: minIndex } : null;
        };

        let currentSearchIdx = 0;
        while (currentSearchIdx < lowerTranscript.length) {
            const match = findNextTrigger(currentSearchIdx);
            if (!match) break;

            // Found a trigger
            const startOfNote = match.index + match.phrase.length;

            // Find end of note (next punctuation or next trigger)
            const nextTriggerMatch = findNextTrigger(startOfNote);
            const nextEndPhraseMatch = findNextEndPhrase(startOfNote);
            const nextPeriod = lowerTranscript.indexOf('.', startOfNote);
            const nextQuestion = lowerTranscript.indexOf('?', startOfNote);
            const nextPauseMatch = lowerTranscript.substring(startOfNote).match(/\[\[pause \d{2}:\d{2}:\d{2}\]\]/);
            const nextPause = nextPauseMatch ? startOfNote + nextPauseMatch.index : -1;

            // Determine end index
            let endOfNote = lowerTranscript.length;

            if (nextTriggerMatch && nextTriggerMatch.index < endOfNote) {
                endOfNote = nextTriggerMatch.index;
            }
            // First valid terminator wins
            const nextEndPhraseIdx = nextEndPhraseMatch ? nextEndPhraseMatch.index : -1;
            const possibleEnds = [nextPeriod, nextQuestion, nextPause, nextEndPhraseIdx].filter(idx => idx !== -1);
            if (possibleEnds.length > 0) {
                const earliestEnd = Math.min(...possibleEnds);
                if (earliestEnd < endOfNote) {
                    // Include the punctuation if it was period/question, but not if it was [pause]
                    // If it's a pause, we take up to the pause start
                    endOfNote = earliestEnd;
                    if (earliestEnd === nextPeriod || earliestEnd === nextQuestion) {
                        endOfNote += 1;
                    }
                }
            }

            // Remove the [[PAUSE ...]] marker from the extracted note string itself just in case
            let noteContent = activeTranscript.substring(startOfNote, endOfNote).replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/gi, '').trim();

            // Only add if meaningful content
            if (noteContent && noteContent.length > 3) {
                // Check if it's already in our extracted list (dedupe within this loop)
                if (!extractedNotes.includes(noteContent)) {
                    extractedNotes.push(noteContent);
                }
            }

            currentSearchIdx = endOfNote;
        }

        // Update state if different
        if (JSON.stringify(extractedNotes) !== JSON.stringify(notes)) {
            setNotes(extractedNotes);
        }

    }, [activeTranscript]);

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
            setManualEvents([]);
            setNotes([]);
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
        clearTranscript();
        setNotes([]);
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
        setNotes([]);
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
            const result = await RorkService.analyzeTranscript(activeTranscript, 'FIRE', null, manualEvents);

            // Use existing ID if available, else new one
            const reportId = currentReportId || Math.floor(Date.now() % 10000);

            // 1. MERGE MANUAL EVENTS INTO TIMELINE
            if (manualEvents && manualEvents.length > 0) {
                const existingTimeline = result.timeline || [];
                const manualTimelineEvents = manualEvents.map(e => ({
                    time: e.time,
                    event: e.description
                }));
                const combinedTimeline = [...existingTimeline, ...manualTimelineEvents].sort((a, b) => {
                    return a.time.localeCompare(b.time);
                });
                result.timeline = combinedTimeline;
            }

            // 2. MERGE LIVE CHECKLIST ITEMS
            const liveUncompleted = actionItemsRef.current.filter(item => !item.isCompleted).map(item => item.text);
            const liveCompleted = actionItemsRef.current.filter(item => item.isCompleted).map(item => item.text);

            const aiActionItems = result.action_items || [];
            const mergedActionItems = [...new Set([...liveUncompleted, ...aiActionItems])];
            const mergedActionsTaken = [...new Set([...(result.actions_taken || []), ...liveCompleted])];

            const reportWithMeta = {
                ...result,
                action_items: mergedActionItems,
                actions_taken: mergedActionsTaken,
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
    // Strip [[PAUSE ...]] markers before rendering so the user never sees them
    const rawTranscript = report ? persistedTranscript : activeTranscript;
    const displayTranscript = rawTranscript.replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/g, '');

    const [manualEvents, setManualEvents] = useState([]);

    const handleToggleActionItem = (itemId) => {
        setActionItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newStatus = !item.isCompleted;
                // Record the event if it's being marked as completed
                if (newStatus) {
                    const event = {
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        description: `Action Completed: ${item.text}`
                    };
                    setManualEvents(prevEvents => [...prevEvents, event]);
                }
                return { ...item, isCompleted: newStatus };
            }
            return item;
        }));
    };

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8 relative">
                {/* Back Button for Report View */}
                {report && !isAnalyzing && (
                    <div className="mb-6">
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
                                className="mt-6 text-sm text-red-400 hover:text-red-300 underline decoration-red-500/30 hover:decoration-red-400 underline-offset-4 transition-all block mx-auto"
                            >
                                Discard & Start New Report
                            </button>
                        )}

                        {/* Edit Layout Button */}
                        {displayTranscript && (
                            <button
                                onClick={isEditingLayout ? saveLayout : toggleEditMode}
                                className={`mt-6 mx-auto flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isEditingLayout
                                    ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    }`}
                            >
                                <Settings size={14} className={isEditingLayout ? 'animate-spin-slow' : ''} />
                                {isEditingLayout ? 'Save Layout' : 'Edit Live Layout'}
                            </button>
                        )}
                    </div>
                )}

                {/* Transcript Area & Action Items */}
                <div className={`transition-all duration-500 ${displayTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={layoutOrder}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {layoutOrder.map(key => {
                                    if (key === 'transcript') {
                                        return (
                                            <SortableItem key="transcript" id="transcript" isEditing={isEditingLayout} className={`${actionItems.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                                <div className="glass-panel rounded-2xl p-6 md:p-8 h-full transition-all duration-500">
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
                                            </SortableItem>
                                        );
                                    }
                                    if (key === 'checklist' && actionItems.length > 0) {
                                        return (
                                            <SortableItem key="checklist" id="checklist" isEditing={isEditingLayout} className="lg:col-span-1 animate-slide-in-right">
                                                <FireActionItems items={actionItems} onToggle={handleToggleActionItem} />
                                            </SortableItem>
                                        );
                                    }
                                    if (key === 'notes' && notes.length > 0) {
                                        return (
                                            <SortableItem key="notes" id="notes" isEditing={isEditingLayout} className="lg:col-span-3 animate-slide-up">
                                                <div className="glass-panel p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 h-full">
                                                    <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                                        <StickyNote size={14} /> Live Field Notes
                                                    </h3>
                                                    <div className="grid md:grid-cols-2 gap-3">
                                                        {notes.map((note, idx) => (
                                                            <div key={idx} className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/10 text-yellow-100 text-sm">
                                                                "{note}"
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </SortableItem>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
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
                            onActionComplete={(completedItem) => {
                                // 1. Remove from action_items
                                // 2. Add to actions_taken
                                // 3. Persist
                                const updatedReport = {
                                    ...report,
                                    action_items: report.action_items.filter(i => i !== completedItem),
                                    actions_taken: [...(report.actions_taken || []), completedItem]
                                };

                                setReport(updatedReport);
                                localStorage.setItem('fire_report', JSON.stringify(updatedReport));

                                // Persist to history
                                const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
                                const updatedHistory = savedReports.map(r =>
                                    (r.id === report.id || r.id === currentReportId) ? { ...updatedReport, status: 'completed' } : r
                                );
                                localStorage.setItem('saved_reports', JSON.stringify(updatedHistory));
                            }}
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
