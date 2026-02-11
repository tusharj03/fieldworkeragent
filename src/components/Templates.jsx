import React, { useState, useEffect } from 'react';
import { FileText, Plus, ChevronRight, Activity, Heart, AlertTriangle, Stethoscope, Flame, Home, Truck, Biohazard, X, Save } from 'lucide-react';

export function Templates({ onSelectTemplate, mode = 'EMS' }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [customTemplates, setCustomTemplates] = useState([]);
    const [newTemplate, setNewTemplate] = useState({
        title: '',
        description: '',
        mode: mode
    });

    useEffect(() => {
        const saved = localStorage.getItem('custom_templates');
        if (saved) {
            setCustomTemplates(JSON.parse(saved));
        }
    }, []);

    const handleSaveTemplate = () => {
        if (!newTemplate.title || !newTemplate.description) return;

        const template = {
            id: `custom-${Date.now()}`,
            title: newTemplate.title,
            description: newTemplate.description,
            icon: FileText, // Default icon
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            mode: newTemplate.mode,
            isCustom: true
        };

        const updated = [template, ...customTemplates];
        setCustomTemplates(updated);
        localStorage.setItem('custom_templates', JSON.stringify(updated));
        setShowCreateModal(false);
        setNewTemplate({ title: '', description: '', mode: mode });
    };

    // EMS TEMPLATES
    const emsTemplates = [
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

    // FIRE TEMPLATES (NERIS)
    const fireTemplates = [
        {
            id: 'structure_fire',
            title: 'Structure Fire (NERIS)',
            description: 'NERIS-compliant workflow. Documents building type, specific actions taken, search results, and ventilation logic.',
            icon: Home,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: 'wildland',
            title: 'Wildland Interface',
            description: 'Track fuel types, weather conditions, containment percentage, and resource deployment.',
            icon: Flame,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        },
        {
            id: 'mva',
            title: 'MVA / Extrication',
            description: 'Motor vehicle accident logs including stabilization, tool usage (Jaws/Cutters), and patient access.',
            icon: Truck,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            id: 'hazmat',
            title: 'Hazmat Incident',
            description: 'Document chemical identification, hot/warm/cold zones, and decontamination procedures.',
            icon: Biohazard,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20'
        }
    ];

    const defaultTemplates = mode === 'FIRE' ? fireTemplates : emsTemplates;
    const relevantCustomTemplates = customTemplates.filter(t => t.mode === mode);

    // Merge custom templtaes first
    const currentTemplates = [...relevantCustomTemplates, ...defaultTemplates];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        {mode === 'FIRE' ? 'Fire Operations Templates' : 'EMS Clinical Templates'}
                    </h2>
                    <p className="text-slate-400 mt-1">Start a new report using a pre-configured workflow</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                    <Plus size={16} />
                    Create Template
                </button>
            </div>

            {/* Create Modal Overlay */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">New {mode} Template</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Template Title</label>
                                <input
                                    type="text"
                                    value={newTemplate.title}
                                    onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                    placeholder="e.g., Water Rescue, Lift Assist..."
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description / Instructions</label>
                                <textarea
                                    value={newTemplate.description}
                                    onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                    placeholder="Describe the workflow or specific data points this template should capture..."
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 h-32 resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveTemplate}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-lg hover:from-orange-400 hover:to-red-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                {currentTemplates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all cursor-pointer relative overflow-hidden"
                    >
                        {template.isCustom && (
                            <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">
                                Custom
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${template.bg} ${template.color} border ${template.border}`}>
                                {template.isCustom ? <FileText size={24} /> : <template.icon size={24} />}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2 group-hover:text-white transition-colors">
                                    {template.title}
                                </h3>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4 line-clamp-2">
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

            <div className={`mt-8 p-6 rounded-2xl bg-gradient-to-br ${mode === 'FIRE' ? 'from-red-950 to-orange-950' : 'from-slate-900 to-slate-950'} border border-white/5`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-slate-800/50 text-slate-400">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-200">AI Adaptive Mode ({mode})</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Don't see what you need? Just start speaking. The Field Agent automatically detects the context and formats the report accordingly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
