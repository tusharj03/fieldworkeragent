import React, { useRef, useState, useEffect } from 'react';
import { Check, Circle } from 'lucide-react';

export const FireActionItems = ({ items, onToggle }) => {
    const listEndRef = useRef(null);
    const containerRef = useRef(null);
    const [isUserScrolled, setIsUserScrolled] = useState(false);

    // Auto-scroll when new items arrive
    useEffect(() => {
        if (!isUserScrolled && containerRef.current) {
            const { scrollHeight, clientHeight } = containerRef.current;
            containerRef.current.scrollTop = scrollHeight - clientHeight;
        }
    }, [items, isUserScrolled]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // If we are within 20px of the bottom, we consider it "at bottom"
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 20;
        setIsUserScrolled(!isNearBottom);
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 h-full overflow-hidden flex flex-col">
            <div className="p-4 shrink-0 border-b border-white/5 bg-slate-900/50">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Action Plan & Checklist
                </h3>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[150px] max-h-[500px]"
            >
                <div className="space-y-2">
                    {[...items].sort((a, b) => {
                        // Sort completed items first
                        if (a.isCompleted && !b.isCompleted) return -1;
                        if (!a.isCompleted && b.isCompleted) return 1;
                        return 0; // retain original order otherwise
                    }).map((item, index) => (
                        <button
                            key={item.id || index}
                            onClick={() => onToggle && onToggle(item.id)}
                            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left group ${item.isCompleted
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                } ${item.isNew ? 'animate-slide-in-right ring-1 ring-orange-500/50' : ''}`}
                        >
                            <div className={`mt-0.5 flex-shrink-0 transition-colors ${item.isCompleted
                                ? 'text-green-500'
                                : 'text-slate-500 group-hover:text-slate-400'
                                }`}>
                                {item.isCompleted ? <Check size={16} /> : <Circle size={16} />}
                            </div>
                            <span className={`text-sm font-medium leading-snug transition-colors ${item.isCompleted
                                ? 'text-green-400/80 line-through decoration-green-500/30'
                                : 'text-slate-200 group-hover:text-white'
                                }`}>
                                {item.text}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
