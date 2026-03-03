import React, { useState } from 'react';
import { Check, X, ShieldAlert, ChevronDown, ChevronUp, BookOpen, AlertTriangle } from 'lucide-react';

export const ProgressiveActionItem = ({ item, onAccept, onDismiss }) => {
    const [showSource, setShowSource] = useState(false);

    // Provide default string fallback handling if item is just a string
    const isString = typeof item === 'string';
    const text = isString ? item : item.text;
    const trigger = isString ? null : item.trigger;
    const source = isString ? null : item.source;
    const isCompleted = isString ? false : item.isCompleted;
    const isNew = isString ? false : item.isNew;

    // String fallback for basic string action items
    if (isString) {
        return (
            <div className="w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left group bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600">
                <div className="flex-1">
                    <span className="text-sm font-medium leading-snug text-slate-200">
                        {text}
                    </span>
                </div>
                {onAccept && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onAccept(item)}
                            className="p-1.5 rounded-md hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Accept"
                        >
                            <Check size={16} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`w-full flex flex-col gap-2 p-3 rounded-lg transition-all text-left bg-slate-800/50 border border-slate-700/50 ${isNew ? 'animate-slide-in-right ring-1 ring-orange-500/50' : ''} ${isCompleted ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Top Row: Suggestion + Actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                    <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium leading-snug text-slate-100">
                        {text}
                    </span>
                </div>

                {/* Accept / Dismiss Buttons */}
                {!isCompleted && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => onDismiss(item)}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Dismiss Consideration"
                        >
                            <X size={16} />
                        </button>
                        <button
                            onClick={() => onAccept(item)}
                            className="p-1.5 rounded-md hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Accept Consideration"
                        >
                            <Check size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Middle Row: Trigger Summary */}
            {trigger && (
                <div className="flex items-center gap-2 text-xs text-slate-400 ml-6">
                    <ShieldAlert size={12} className="text-blue-400" />
                    <span className="italic whitespace-nowrap overflow-hidden text-ellipsis">Base: "{trigger}"</span>
                </div>
            )}

            {/* Bottom Row: Source Toggle */}
            {source && (
                <div className="ml-6 mt-1">
                    <button
                        onClick={() => setShowSource(!showSource)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <BookOpen size={10} />
                        {showSource ? 'Hide Protocol Source' : 'Show Protocol Source'}
                        {showSource ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {/* Collapsible Source Content */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSource ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50 text-xs text-slate-300 leading-relaxed font-mono">
                            {source}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
