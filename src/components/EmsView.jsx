import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneButton } from './MicrophoneButton';
import { ReportCard } from './ReportCard';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import { useLayoutEditor } from '../hooks/useLayoutEditor';
import { RorkService } from '../services/rork';
import { Activity, AlertCircle, Timer, Pill, ShieldAlert, CheckSquare, Layers, Play, Pause, ArrowLeft, Settings } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

export const EmsView = ({ user }) => {
    const {
        isRecording,
        transcriptSegments,
        startRecording,
        stopRecording,
        clearTranscript,
        error: voiceError
    } = useRealtimeTranscription({ ephemeral: true });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [insights, setInsights] = useState(null);
    const [error, setError] = useState(null);

    // Cognitive Tools State
    const [cprStartTime, setCprStartTime] = useState(null);
    const [epiStartTime, setEpiStartTime] = useState(null);
    const [showIntubation, setShowIntubation] = useState(false);
    const [showCrushProtocol, setShowCrushProtocol] = useState(false);
    const [liveTranslations, setLiveTranslations] = useState([]);

    // Timer text state
    const [cprTimeStr, setCprTimeStr] = useState('00:00');
    const [epiTimeStr, setEpiTimeStr] = useState('00:00');

    // Extracted Notes State
    const [notes, setNotes] = useState([]);

    // Layout Editor capability
    const { isEditingLayout, layoutOrder, saveLayout, toggleEditMode, handleDragEnd } = useLayoutEditor('ems');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const translatedIndicesRef = useRef(new Set());

    // All detected segments are ephemeral signals
    const visibleSegments = transcriptSegments;
    const fullTranscript = visibleSegments.map(s => s.text).join(' ');

    // -----------------------------------------------------
    // LIVE COGNITIVE PROCESSING ENGINE
    // -----------------------------------------------------

    // Parse the live signal for cognitive triggers
    useEffect(() => {
        if (!isRecording) return;

        const lowerTranscript = fullTranscript.toLowerCase();

        // Timer Triggers
        if (lowerTranscript.includes("starting cpr") && !cprStartTime) setCprStartTime(Date.now());
        if ((lowerTranscript.includes("epi given") || lowerTranscript.includes("epinephrine given")) && !epiStartTime) setEpiStartTime(Date.now());

        // Checklist / Protocol Triggers
        if (lowerTranscript.includes("intubate") || lowerTranscript.includes("intubation")) setShowIntubation(true);
        if (lowerTranscript.includes("crush syndrome") || lowerTranscript.includes("crushed")) setShowCrushProtocol(true);

        // Note to Self / Make a Note Trigger
        const noteMatches = fullTranscript.match(/(?:note to self|make a note|make a field note)[\s\S]*?(?:end note|$)/gi);
        if (noteMatches) {
            const extracted = noteMatches.map(m => m
                .replace(/(?:note to self|make a note|make a field note)/i, '')
                .replace(/end note/i, '')
                .replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/gi, '')
                .trim()
            ).filter(Boolean);

            if (JSON.stringify(extracted) !== JSON.stringify(notes)) {
                setNotes([...new Set(extracted)]);
            }
        }
    }, [fullTranscript, isRecording, cprStartTime, epiStartTime]);

    // Live Translation Effect
    useEffect(() => {
        if (!isRecording) return;

        transcriptSegments.forEach(async (seg, idx) => {
            if (!seg.isEnglish && seg.isFinal && !translatedIndicesRef.current.has(idx)) {
                translatedIndicesRef.current.add(idx);
                try {
                    const translation = await RorkService.translate(seg.text);
                    setLiveTranslations(prev => {
                        if (prev.some(t => t.original === seg.text)) return prev;
                        return [...prev.slice(-4), { original: seg.text, translated: translation, timestamp: new Date() }];
                    });
                } catch (e) {
                    console.error("Translation failed", e);
                    translatedIndicesRef.current.delete(idx);
                }
            }
        });
    }, [transcriptSegments, isRecording]);

    // Timer Ticks
    useEffect(() => {
        let interval;
        if (cprStartTime || epiStartTime) {
            interval = setInterval(() => {
                const now = Date.now();
                if (cprStartTime) {
                    const diff = now - cprStartTime;
                    const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
                    const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                    setCprTimeStr(`${mins}:${secs}`);
                }
                if (epiStartTime) {
                    const diff = now - epiStartTime;
                    const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
                    const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                    setEpiTimeStr(`${mins}:${secs}`);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cprStartTime, epiStartTime]);

    // -----------------------------------------------------

    const handleToggleProcessing = () => {
        if (isRecording) {
            handleStopAndAnalyze();
        } else {
            setError(null);
            setInsights(null);

            // Clear Cognitive Tools
            setCprStartTime(null);
            setEpiStartTime(null);
            setShowIntubation(false);
            setShowCrushProtocol(false);
            setLiveTranslations([]);
            setNotes([]);
            translatedIndicesRef.current.clear();

            clearTranscript();
            startRecording();
        }
    };

    const handleStopAndAnalyze = async () => {
        stopRecording();
        if (!fullTranscript.trim()) {
            setError("No speech signal detected.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await RorkService.analyzeTranscript(fullTranscript, 'EMS', null);

            const insightsMeta = {
                ...result,
                mode: 'EMS',
                notes: [...new Set([...(result.notes || []), ...notes])]
            };

            setInsights(insightsMeta);
            // Intentionally NEVER saving to localStorage for EMS - Ephemeral Only!

        } catch (err) {
            console.error(err);
            setError("Failed to analyze transcript. Please check your connection.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleStartNew = () => {
        setInsights(null);
        setCprStartTime(null);
        setEpiStartTime(null);
        setShowIntubation(false);
        setShowCrushProtocol(false);
        setLiveTranslations([]);
        setNotes([]);
        clearTranscript();
        startRecording();
    };

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Back to Start Button */}
                {insights && !isAnalyzing && (
                    <div className="flex justify-start mb-6 -mt-4 animate-fade-in">
                        <button
                            onClick={handleStartNew}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm group"
                        >
                            <div className="p-1 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
                                <ArrowLeft size={16} />
                            </div>
                            <span className="font-medium">Discard & Start New Processing</span>
                        </button>
                    </div>
                )}
                {/* Welcome / Status */}
                {!insights && !isAnalyzing && (
                    <div className="text-center py-12 animate-fade-in">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <h2 className="text-3xl md:text-4xl font-bold text-white text-glow flex items-center justify-center gap-3">
                                <Activity className="text-orange-500" />
                                {fullTranscript ? (isRecording ? 'Listening...' : 'Signal Paused') : 'Ready for Clarity Mode?'}
                            </h2>
                            {fullTranscript && (
                                <button
                                    onClick={insights ? handleStartNew : (isRecording ? stopRecording : startRecording)}
                                    title={isRecording ? "Pause Signal" : (insights ? "Start Over" : "Resume Signal")}
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
                            {fullTranscript
                                ? (isRecording ? 'Keep speaking to generate cognitive tools.' : 'Tap the microphone to resume processing, or start over.')
                                : 'Tap the microphone to start real-time signal processing. Data is never saved.'}
                        </p>

                        {/* Start Over Option (Only if we have content but aren't recording) */}
                        {fullTranscript.length > 0 && !isRecording && !insights && (
                            <button
                                onClick={handleStartNew}
                                className="mt-6 text-sm text-red-400 hover:text-red-300 underline decoration-red-500/30 hover:decoration-red-400 underline-offset-4 transition-all block mx-auto"
                            >
                                Discard & Start New Processing
                            </button>
                        )}

                        {/* Edit Layout Button */}
                        {fullTranscript.length > 0 && (
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

                {/* Speaker Management UI Removed */}

                {/* Live Cognitive Dashboard */}
                {(cprStartTime || epiStartTime || showIntubation || showCrushProtocol || liveTranslations.length > 0 || notes.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">

                        {/* Live Translation */}
                        {liveTranslations.length > 0 && (
                            <div className="md:col-span-2 glass-panel border-purple-500/30 bg-purple-500/5 rounded-2xl p-5 border-l-4 border-l-purple-500">
                                <div className="flex items-center gap-2 mb-3">
                                    <Layers size={16} className="text-purple-400" />
                                    <h3 className="text-purple-400 font-bold uppercase tracking-wider text-xs">Live Translation (EN)</h3>
                                </div>
                                <div className="space-y-3">
                                    {liveTranslations.map((tr, idx) => (
                                        <div key={idx} className="animate-slide-up bg-slate-900/40 p-3 rounded-lg">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Original: {tr.original}</div>
                                            <div className="text-base text-white font-medium">"{tr.translated}"</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timers */}
                        {(cprStartTime || epiStartTime) && (
                            <div className="glass-panel p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                <h3 className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
                                    <Timer size={14} /> Critical Timers
                                </h3>
                                <div className="space-y-4">
                                    {cprStartTime && (
                                        <div className="flex justify-between items-center bg-blue-950/40 p-3 rounded-lg border border-blue-500/10">
                                            <span className="text-sm font-medium text-slate-300 flex items-center gap-2"><Activity size={14} className="text-red-400" /> CPR In Progress</span>
                                            <span className={`text-xl font-mono font-bold ${parseInt(cprTimeStr.split(':')[0]) >= 2 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>{cprTimeStr}</span>
                                        </div>
                                    )}
                                    {epiStartTime && (
                                        <div className="flex justify-between items-center bg-blue-950/40 p-3 rounded-lg border border-blue-500/10">
                                            <span className="text-sm font-medium text-slate-300 flex items-center gap-2"><Pill size={14} className="text-emerald-400" /> Last Epi</span>
                                            <span className={`text-xl font-mono font-bold ${parseInt(epiTimeStr.split(':')[0]) >= 3 ? 'text-orange-400 animate-pulse' : 'text-blue-400'}`}>{epiTimeStr}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Intubation Checklist */}
                        {showIntubation && (
                            <div className="glass-panel p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                    <CheckSquare size={14} /> Intubation Prep
                                </h3>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-emerald-500/50" /> BVM & Suction Ready</li>
                                    <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-emerald-500/50" /> ET Tube & Stylet</li>
                                    <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-emerald-500/50" /> Laryngoscope working</li>
                                    <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-emerald-500/50" /> Bougie available</li>
                                </ul>
                            </div>
                        )}

                        {/* Protocols */}
                        {showCrushProtocol && (
                            <div className="glass-panel p-5 rounded-xl border border-orange-500/20 bg-orange-500/5 md:col-span-2">
                                <h3 className="text-orange-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                    <ShieldAlert size={14} /> Crush Protocol Reference
                                </h3>
                                <div className="text-sm text-slate-300 space-y-2 leading-relaxed bg-slate-900/40 p-4 rounded-lg">
                                    <p className="font-bold text-white">Prior to extrication (&gt; 1 hour crush):</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>IV NS 1L/hr for first hour, then 500 mL/hr</li>
                                        <li>Albuterol 5mg Nebulized (for hyperkalemia / K+ release)</li>
                                    </ul>
                                    <p className="font-bold text-white mt-3">Post extrication:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Maintain IV rates</li>
                                        <li>Consider Sodium Bicarbonate 1mEq/kg IV if peaked T-waves</li>
                                        <li>Do NOT start lactated ringers (contains Potassium)</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Live Field Notes */}
                        {notes.length > 0 && (
                            <div className="glass-panel p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 md:col-span-2">
                                <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                    <Layers size={14} /> Live Field Notes
                                </h3>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {notes.map((note, idx) => (
                                        <div key={idx} className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/10 text-yellow-100 text-sm">
                                            "{note}"
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Transcript Area & Action Items */}
                <div className={`transition-all duration-500 ${transcriptSegments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={layoutOrder} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col gap-6">
                                {layoutOrder.map((key) => {
                                    if (key === 'transcript') {
                                        return (
                                            <SortableItem key="transcript" id="transcript" isEditing={isEditingLayout}>
                                                <div className="glass-panel rounded-2xl p-6 md:p-8">
                                                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            Live Memory Buffer (Clears on stop)
                                                        </span>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {transcriptSegments.map((seg, idx) => {
                                                            const text = seg.text.replace(/\[\[PAUSE \d{2}:\d{2}:\d{2}\]\]/g, '');
                                                            if (!text.trim() && seg.text.includes('[[PAUSE')) return null;

                                                            return (
                                                                <div key={idx} className={`inline gap-4 transition-all duration-300 ${!seg.isFinal ? 'opacity-50 italic' : 'opacity-100'}`}>
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
                                                                Signal detected but parsing...
                                                            </div>
                                                        )}
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
                        <p className="text-lg font-medium text-slate-300">Generating Cognitive Clarity...</p>
                        <p className="text-sm text-slate-500 mt-2">Extracting structured focus points</p>
                    </div>
                )}

                {/* Error State */}
                {(error || voiceError) && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 animate-slide-up">
                        <AlertCircle size={20} />
                        <p>{error || voiceError}</p>
                    </div>
                )}

                {/* Ephemeral Insights Result */}
                {insights && !isAnalyzing && (
                    <div className="animate-slide-up pb-12">
                        <ReportCard
                            report={insights}
                            onActionComplete={(completedItem) => {
                                const updatedInsights = {
                                    ...insights,
                                    action_items: insights.action_items?.filter(i => i !== completedItem),
                                    actions_taken: [...(insights.actions_taken || []), completedItem]
                                };
                                setInsights(updatedInsights);
                            }}
                        />
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={handleStartNew}
                                className="px-8 py-3 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors font-medium cursor-pointer flex items-center gap-2"
                            >
                                <AlertCircle size={18} /> Wipe Memory Buffer
                            </button>
                        </div>
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
                        onClick={handleToggleProcessing}
                        disabled={isAnalyzing}
                        title={isRecording ? "Stop Processing & Analyze" : "Start Live Processing"}
                    />
                </div>
            </div>
        </>
    );
};
