import React from 'react';
import { FileText, Plus, ChevronRight, Activity, Heart, AlertTriangle, Stethoscope } from 'lucide-react';

export function Templates({ onSelectTemplate }) {
    const templates = [
        {
            id: 'general',
            title: 'General Incident Report',
            description: 'Standard template for general incidents, safety observations, and daily logs.',
            icon: FileText,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            id: 'cardiac',
            title: 'Cardiac Arrest / CPR',
            description: 'Specialized workflow for cardiac events, including drug administration and shock delivery logs.',
            icon: Heart,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: 'trauma',
            title: 'Trauma Assessment',
            description: 'Focused on mechanism of injury, rapid trauma assessment, and vital sign trending.',
            icon: AlertTriangle,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        },
        {
            id: 'medical',
            title: 'Medical Transport',
            description: 'Routine medical transport logs including patient demographics and transfer of care details.',
            icon: Stethoscope,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Report Templates</h2>
                    <p className="text-slate-400 mt-1">Start a new report using a pre-configured workflow</p>
                </div>
                <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                    <Plus size={16} />
                    Create Template
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all cursor-pointer"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${template.bg} ${template.color} border ${template.border}`}>
                                <template.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2 group-hover:text-white transition-colors">
                                    {template.title}
                                </h3>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                    {template.description}
                                </p>
                                <div className="flex items-center text-xs font-medium text-slate-500 group-hover:text-orange-400 transition-colors uppercase tracking-wider gap-1">
                                    Use Template <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-slate-800/50 text-slate-400">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-200">AI Adaptive Mode</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Don't see what you need? Just start speaking. The Field Agent automatically detects the context and formats the report accordingly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
