import React, { useState } from 'react';
import { FileText, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Activity, Clock, ShieldAlert, DollarSign, Share2, Download } from 'lucide-react';

export function ReportCard({ report, onExport }) {
    if (!report) return null;

    const getUrgencyColor = (urgency) => {
        switch (urgency?.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        }
    };

    const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);
        return (
            <div className="glass-panel rounded-xl overflow-hidden mb-4 transition-all duration-300">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/50 text-orange-500">
                            {Icon && <Icon size={18} />}
                        </div>
                        <h3 className="font-semibold text-slate-200 tracking-wide">{title}</h3>
                    </div>
                    <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={16} className="text-slate-500" />
                    </div>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 pt-0 border-t border-white/5">
                        <div className="pt-4">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Main Header Card */}
            <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <FileText size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-bold text-white tracking-tight">{report.category || 'Incident Report'}</h2>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {new Date(report.timestamp || Date.now()).toLocaleString()}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span>ID: #{report.id || Math.floor(new Date(report.timestamp || Date.now()).getTime() % 10000)}</span>
                            </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full font-semibold text-sm border ${getUrgencyColor(report.urgency)}`}>
                            {report.urgency || 'Normal'} Priority
                        </span>
                    </div>

                    <div className="bg-slate-900/40 rounded-xl p-5 border border-white/5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">EXECUTIVE SUMMARY</h3>
                        <p className="text-lg leading-relaxed text-slate-200 font-light">{report.summary}</p>
                    </div>
                </div>
            </div>

            {/* Structured Fields Grid */}
            {report.structured_fields && (
                <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(report.structured_fields).map(([section, fields]) => (
                        <div key={section} className="glass-panel rounded-xl p-5">
                            <h4 className="text-orange-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                {section}
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(fields).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-baseline text-sm group">
                                        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">{key}</span>
                                        <span className="font-medium text-slate-200 text-right">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Timelines Section */}
            <Section title="Clinical Timeline" icon={Activity}>
                <div className="space-y-8">
                    {report.vitals_timeline && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 pl-1">VITALS LOG</h4>
                            <div className="overflow-x-auto rounded-lg border border-white/5">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/60">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Time</th>
                                            <th className="px-4 py-3 font-medium">BP</th>
                                            <th className="px-4 py-3 font-medium">HR</th>
                                            <th className="px-4 py-3 font-medium">RR</th>
                                            <th className="px-4 py-3 font-medium">SpO2</th>
                                            <th className="px-4 py-3 font-medium">O2</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-slate-900/20">
                                        {report.vitals_timeline.map((row, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-mono text-orange-400">{row.time}</td>
                                                <td className="px-4 py-3 text-slate-200">{row.bp}</td>
                                                <td className="px-4 py-3 text-slate-200">{row.hr}</td>
                                                <td className="px-4 py-3 text-slate-200">{row.rr}</td>
                                                <td className="px-4 py-3 text-slate-200">{row.spo2}</td>
                                                <td className="px-4 py-3 text-slate-200">{row.o2}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {report.interventions_timeline && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 pl-1">INTERVENTIONS</h4>
                            <div className="space-y-3">
                                {report.interventions_timeline.map((row, i) => (
                                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-slate-900/30 border border-white/5 hover:border-white/10 transition-colors">
                                        <span className="font-mono text-xs text-orange-400 mt-1">{row.time}</span>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-200 text-sm">{row.intervention}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{row.dose}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Section>

            {/* Assessment Section */}
            <Section title="Clinical Assessment" icon={FileText}>
                <div className="grid md:grid-cols-2 gap-8">
                    {report.assessment && (
                        <div className="space-y-4">
                            {Object.entries(report.assessment).map(([key, value]) => (
                                <div key={key} className="relative pl-4 border-l-2 border-slate-700">
                                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">{key}</span>
                                    <p className="text-sm text-slate-300 leading-relaxed">{value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-6">
                        {report.opqrst && (
                            <div className="bg-slate-900/30 rounded-xl p-4 border border-white/5">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">OPQRST ANALYSIS</h4>
                                <div className="space-y-2">
                                    {report.opqrst.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
                                            <span className="text-slate-400 font-medium w-8">{item.field.charAt(0)}</span>
                                            <div className="flex-1 flex justify-between items-center">
                                                <span className="text-slate-200">{item.extracted}</span>
                                                {item.status === 'warning' && <AlertTriangle size={12} className="text-amber-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Section>

            {/* AI Assistant Section */}
            <Section title="Suggested Action Items by AI" icon={ShieldAlert}>
                <div className="grid md:grid-cols-3 gap-6">
                    {report.action_items && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500" /> Action Items
                            </h4>
                            <ul className="space-y-2">
                                {report.action_items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 group">
                                        <div className="w-4 h-4 rounded border border-slate-600 mt-0.5 shrink-0 group-hover:border-orange-500 transition-colors" />
                                        <span className="group-hover:text-slate-100 transition-colors">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {report.qa_qi_flags && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-500" /> QA Flags
                            </h4>
                            <ul className="space-y-2">
                                {report.qa_qi_flags.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-amber-200/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {report.billing_codes && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-500" /> Coding
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(report.billing_codes).map(([key, value]) => (
                                    <div key={key} className="bg-slate-900/50 p-2.5 rounded border border-white/5">
                                        <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">{key}</span>
                                        <span className="text-slate-200 font-mono text-xs">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Section>

            {/* Actions Footer */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                    onClick={onExport}
                    className="flex-1 btn-primary group"
                >
                    <Download size={18} className="group-hover:animate-bounce" />
                    Download Official PDF Packet
                </button>
                <button
                    onClick={async () => {
                        if (navigator.share) {
                            try {
                                await navigator.share({
                                    title: `Field Report - ${report.category}`,
                                    text: report.summary,
                                    url: window.location.href
                                });
                            } catch (err) {
                                console.error('Share failed:', err);
                            }
                        } else {
                            alert('Sharing is not supported on this device/browser.');
                        }
                    }}
                    className="px-6 py-3 rounded-xl glass-button flex items-center justify-center gap-2 font-semibold hover:bg-white/10"
                >
                    <Share2 size={18} />
                    Share via Secure Link
                </button>
            </div>
        </div>
    );
}
