import React from 'react';
import { Check, Circle } from 'lucide-react';

export const FireActionItems = ({ items, onToggle }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 h-full overflow-y-auto">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                Action Plan & Checklist
            </h3>
            <div className="space-y-2">
                {items.map((item, index) => (
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
    );
};
