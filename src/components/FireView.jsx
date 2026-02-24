import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Info, Play, Pause, AlertCircle, Phone, ArrowLeft, RefreshCw, Layers, StickyNote, Activity, FileText, Download, ShieldAlert, CheckCircle, Flame, Car, Settings } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { MicrophoneButton } from './MicrophoneButton';
import { ReportCard } from './ReportCard';
import { FireActionItems } from './FireActionItems';
import { SortableItem } from './SortableItem';
import { RorkService } from '../services/rork.js';
import { PdfService } from '../services/pdf.js';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription.js';
import { useLayoutEditor } from '../hooks/useLayoutEditor.js';

export const FireView = ({ user }) => {
    const {
        isRecording,
        transcript,
        transcriptSegments,
        startRecording,
        stopRecording,
        clearTranscript,
        audioUrl,
        error: voiceError
    } = useRealtimeTranscription();

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
    const [liveTranslations, setLiveTranslations] = useState([]);
    const translatedIndicesRef = useRef(new Set());
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

    // Effect: Clear translated indices on reset
    useEffect(() => {
        if (transcriptSegments.length === 0) {
            translatedIndicesRef.current.clear();
            setLiveTranslations([]);
        }
    }, [transcriptSegments.length]);

    // Combine restored text (from previous session) with live text (from current session)
    const activeTranscript = useMemo(() => {
        return [restoredTranscript, transcript].filter(Boolean).join(' ');
    }, [restoredTranscript, transcript]);

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

    // Refs for polling interval to prevent stale closure issues in the background loop
    const activeTranscriptRef = useRef(activeTranscript);
    const actionItemsRef = useRef(actionItems);

    useEffect(() => {
        activeTranscriptRef.current = activeTranscript;
        actionItemsRef.current = actionItems;
    }, [activeTranscript, actionItems]);

    // Extract "Note to Self" items via useMemo for performance
    const extractedNotes = useMemo(() => {
        if (!activeTranscript) return [];

        const triggerPhrases = [
            "note to self",
            "add note to self",
            "take a note",
            "important note",
            "make a note"
        ];

        const endPhrases = [
            "end note",
            "end the note",
            "and note",
            "and no",
            "edge note",
            "end of note",
            "close note",
            "finish note",
            "finished note",
            "that's it",
            "that is it",
            "stop note"
        ];

        const foundNotes = [];
        const lowerTranscript = activeTranscript.toLowerCase();

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
            let startOfNote = match.index + match.phrase.length;

            // Skip immediate punctuation/spaces that Deepgram might add after the trigger itself
            while (startOfNote < lowerTranscript.length && /^[.\s,!?:]/.test(lowerTranscript[startOfNote])) {
                startOfNote++;
            }

            const nextTriggerMatch = findNextTrigger(startOfNote);
            const nextEndPhraseMatch = findNextEndPhrase(startOfNote);
            const nextPauseMatch = lowerTranscript.substring(startOfNote).match(/\[\[pause \d{2}:\d{2}:\d{2}\]\]/);
            const nextPause = nextPauseMatch ? startOfNote + nextPauseMatch.index : -1;

            let endOfNote = lowerTranscript.length;
            let endOfContent = lowerTranscript.length;

            if (nextTriggerMatch && nextTriggerMatch.index < endOfNote) {
                endOfNote = nextTriggerMatch.index;
                endOfContent = nextTriggerMatch.index;
            }

            const nextEndPhraseIdx = nextEndPhraseMatch ? nextEndPhraseMatch.index : -1;
            const possibleEnds = [nextPause, nextEndPhraseIdx].filter(idx => idx !== -1);

            if (possibleEnds.length > 0) {
                const earliestEnd = Math.min(...possibleEnds);
                if (earliestEnd < endOfNote) {
                    endOfContent = earliestEnd;
                    endOfNote = earliestEnd;

                    // If we terminated on an end phrase, consume the phrase in the transcript 
                    // but keep it OUT of the content.
                    if (earliestEnd === nextEndPhraseIdx) {
                        endOfNote += nextEndPhraseMatch.phrase.length;
                    }
                }
            }
            let noteContent = activeTranscript.substring(startOfNote, endOfContent).replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/gi, '').replace(/\[\[TIME \d{2}:\d{2}:\d{2}\]\]/gi, '').trim();
            if (noteContent && noteContent.length > 3) {
                if (!foundNotes.includes(noteContent)) {
                    foundNotes.push(noteContent);
                }
            }
            currentSearchIdx = endOfNote;
        }
        return foundNotes;
    }, [activeTranscript]);

    // Sync extraction to state if needed for other components or just use directly
    useEffect(() => {
        if (JSON.stringify(extractedNotes) !== JSON.stringify(notes)) {
            setNotes(extractedNotes);
        }
    }, [extractedNotes, notes]);

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
        }, 8000); // Slightly more frequent polling
        return () => clearInterval(interval);
    }, [isRecording]);

    // Live Translation Effect
    useEffect(() => {
        if (!isRecording) return;

        transcriptSegments.forEach(async (seg, idx) => {
            if (!seg.isEnglish && seg.isFinal && !translatedIndicesRef.current.has(idx)) {
                // Mark synchronously to prevent race conditions calling translate multiple times
                translatedIndicesRef.current.add(idx);
                console.log("Triggering translation for:", seg.text);

                try {
                    const translation = await RorkService.translate(seg.text);
                    console.log("Translation success:", translation);

                    setLiveTranslations(prev => {
                        // Extra safeguard against duplicate UI rendering of the same sentence
                        if (prev.some(t => t.original === seg.text)) return prev;
                        return [...prev.slice(-4), { original: seg.text, translated: translation, timestamp: new Date() }];
                    });
                } catch (e) {
                    console.error("Translation failed", e);
                    // On failure, remove from tracking so it can be retried on next render
                    translatedIndicesRef.current.delete(idx);
                }
            }
        });
    }, [transcriptSegments, isRecording]);

    // Translation auto-clear effect
    useEffect(() => {
        if (liveTranslations.length > 0) {
            const timer = setTimeout(() => {
                setLiveTranslations(prev => prev.slice(1));
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [liveTranslations]);





    const resumeFromReport = () => {
        // Set everything back to "live" mode
        setRestoredTranscript(persistedTranscript);
        setReport(null);
        setError(null);
        localStorage.removeItem('fire_report');
        // We don't clear the transcript, we resume it
        startRecording();
    };

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
                status: 'completed', // Mark as completed
                templateUsed: 'Generative'
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

    const rawTranscript = report ? persistedTranscript : activeTranscript;
    const displayTranscript = rawTranscript.replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/g, '').replace(/\[\[TIME \d{2}:\d{2}:\d{2}\]\]/g, '');

    // --- Auto-Scroll Logic for Transcript ---
    const transcriptScrollRef = useRef(null);
    const [isTranscriptUserScrolled, setIsTranscriptUserScrolled] = useState(false);

    useEffect(() => {
        // Only trigger auto-scroll if the user hasn't scrolled up
        if (!isTranscriptUserScrolled && transcriptScrollRef.current) {
            const { scrollHeight, clientHeight } = transcriptScrollRef.current;
            transcriptScrollRef.current.scrollTop = scrollHeight - clientHeight;
        }
    }, [displayTranscript, isTranscriptUserScrolled]);

    const handleTranscriptScroll = () => {
        if (!transcriptScrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = transcriptScrollRef.current;
        // Check if we are relatively close to the bottom (within 20px)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 20;
        setIsTranscriptUserScrolled(!isNearBottom);
    };

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
                {!isAnalyzing && (
                    <div className="text-center py-12 animate-fade-in">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <h2 className="text-3xl md:text-4xl font-bold text-white text-glow">
                                {report
                                    ? 'Incident Report'
                                    : (displayTranscript ? (isRecording ? 'Listening...' : 'Transcript Paused') : 'Ready to Report?')}
                            </h2>
                            {(displayTranscript || report) && (
                                <button
                                    onClick={report ? resumeFromReport : (isRecording ? stopRecording : startRecording)}
                                    title={isRecording ? "Pause" : (report ? "Resume Recording" : "Resume")}
                                    className="p-3 rounded-full bg-transparent border border-white/20 text-white/50 hover:text-white transition-all backdrop-blur-sm hover:border-white/40 hover:scale-105 flex items-center justify-center"
                                >
                                    {isRecording ? (
                                        <Pause size={20} fill="currentColor" />
                                    ) : (
                                        <Play size={20} fill="currentColor" className="ml-0.5" />
                                    )}
                                </button>
                            )}
                        </div>
                        <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                            {report
                                ? "Report generated from transcript. Click Play to add more detail."
                                : (displayTranscript
                                    ? (isRecording ? 'Keep speaking to add to your report.' : 'Tap the microphone to resume, or start over.')
                                    : 'Tap the microphone to start recording your incident report.')}
                        </p>

                        {/* Start Over Option (Only if we have content but aren't recording) */}
                        {displayTranscript && !isRecording && !report && (
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
                                {/* Live Translation Panel */}
                                {liveTranslations.length > 0 && (
                                    <div className="lg:col-span-3 animate-fade-in mb-2">
                                        <div className="glass-panel border-purple-500/30 bg-purple-500/5 rounded-2xl p-5 border-l-4 border-l-purple-500">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Layers size={16} className="text-purple-400" />
                                                <h3 className="text-purple-400 font-bold uppercase tracking-wider text-xs">Live Translation (EN)</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {liveTranslations.map((tr, idx) => (
                                                    <div key={idx} className="animate-slide-up">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 opacity-50">Original: {tr.original}</div>
                                                        <div className="text-lg text-white font-medium leading-tight">"{tr.translated}"</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {layoutOrder.map(key => {
                                    if (key === 'checklist' && actionItems.length > 0) {
                                        return (
                                            <SortableItem key="checklist" id="checklist" isEditing={isEditingLayout} className="lg:col-span-3 animate-slide-in-right">
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
                        title={isRecording ? "Stop & Analyze" : "Start/Resume Recording"}
                    />
                </div>
            </div>
        </>
    );
};
