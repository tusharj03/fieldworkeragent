import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertTriangle, CheckCircle, ClipboardList, Info, ChevronDown, ChevronUp, Activity, Clock, ShieldAlert, DollarSign, Share2, Download, Flame, Home, Layers, Siren, Mic, Car, Settings } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { VitalsChart } from './VitalsChart';
import { SortableItem } from './SortableItem';
import { useLayoutEditor } from '../hooks/useLayoutEditor';

export function ReportCard({ report, onExport, audioUrl, onActionComplete }) {
    const topRef = useRef(null);

    useEffect(() => {
        if (topRef.current && report) {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [report]);

    if (!report) return null;

    const isFireMode = report.category?.toLowerCase().includes('fire') || report.category?.toLowerCase() === 'hazmat' || report.category?.toLowerCase() === 'rescue';
    const isMVA = report.category?.toLowerCase().includes('mva') || report.category?.toLowerCase().includes('vehicle');

    const getUrgencyColor = (urgency) => {
        switch (urgency?.toLowerCase()) {
            case 'critical': return 'text-red-500 border-red-500/50 bg-red-500/10';
            case 'high': return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
            case 'medium': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
            default: return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
        }
    };

    const stripNerisCode = (str) => {
        if (!str) return str;
        return str.replace(/^[A-Z0-9]+ - /, '');
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
                        <div className={`p-2 rounded-lg bg-slate-800/50 ${isFireMode ? 'text-red-500' : 'text-orange-500'}`}>
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

    const { isEditingLayout, layoutOrder, toggleEditMode, saveLayout, handleDragEnd } = useLayoutEditor('report');
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const renderPanels = {
        summary: (
            <SortableItem key="summary" id="summary" isEditing={isEditingLayout}>
                <div className="bg-slate-900/40 rounded-xl p-5 border border-white/5 backdrop-blur-sm mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">EXECUTIVE SUMMARY</h3>
                    <p className="text-lg leading-relaxed text-slate-200 font-light">{report.summary}</p>
                </div>
            </SortableItem>
        ),
        scene_info: (isFireMode && !isMVA && report.scene_info) ? (
            <SortableItem key="scene_info" id="scene_info" isEditing={isEditingLayout}>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="glass-panel rounded-xl p-5">
                        <h4 className="text-red-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Home size={14} /> Building & Structure
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4 text-sm border-b border-white/5 pb-2">
                                <span className="text-slate-400 shrink-0 mt-0.5">Type</span>
                                <span className="font-medium text-slate-200 text-right">{report.scene_info.type}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-sm border-b border-white/5 pb-2">
                                <span className="text-slate-400 shrink-0 mt-0.5">Construction</span>
                                <span className="font-medium text-slate-200 text-right">{report.scene_info.building}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-sm">
                                <span className="text-slate-400 shrink-0 mt-0.5">Exposures</span>
                                <span className="font-medium text-slate-200 text-right">{report.scene_info.exposures}</span>
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel rounded-xl p-5">
                        <h4 className="text-orange-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Flame size={14} /> Fire Conditions
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4 text-sm border-b border-white/5 pb-2">
                                <span className="text-slate-400 shrink-0 mt-0.5">Smoke</span>
                                <span className="font-medium text-slate-200 text-right">{report.scene_info.smoke_conditions}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-sm">
                                <span className="text-slate-400 shrink-0 mt-0.5">Flames</span>
                                <span className="font-medium text-slate-200 text-right">{report.scene_info.flame_conditions}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </SortableItem>
        ) : null,
        mva_info: (isFireMode && isMVA && report.mva_info) ? (
            <SortableItem key="mva_info" id="mva_info" isEditing={isEditingLayout}>
                <div className="glass-panel rounded-xl p-5 mb-6">
                    <h4 className="text-blue-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Car size={14} /> Motor Vehicle Accident Details
                    </h4>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Vehicles Involved</span>
                            <p className="font-medium text-slate-200 text-sm">{report.mva_info.vehicles_involved}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Extrication Required</span>
                            <p className="font-medium text-slate-200 text-sm">{report.mva_info.extrication}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Traffic Impact</span>
                            <p className="font-medium text-slate-200 text-sm">{report.mva_info.traffic_conditions}</p>
                        </div>
                    </div>
                </div>
            </SortableItem>
        ) : null,
        patient_info: (!isFireMode && report.patient_info) ? (
            <SortableItem key="patient_info" id="patient_info" isEditing={isEditingLayout}>
                <div className="glass-panel rounded-xl p-5 mb-6">
                    <h4 className="text-orange-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Patient Info
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-baseline text-sm group border-b border-white/5 pb-2">
                            <span className="text-slate-400">Name</span>
                            <span className="font-medium text-slate-200">{report.patient_info.name}</span>
                        </div>
                        <div className="flex justify-between items-baseline text-sm group border-b border-white/5 pb-2">
                            <span className="text-slate-400">Age</span>
                            <span className="font-medium text-slate-200">{report.patient_info.age}</span>
                        </div>
                        <div className="flex justify-between items-baseline text-sm group border-b border-white/5 pb-2">
                            <span className="text-slate-400">Sex</span>
                            <span className="font-medium text-slate-200">{report.patient_info.sex}</span>
                        </div>
                        <div className="flex justify-between items-baseline text-sm group">
                            <span className="text-slate-400">Mental Status</span>
                            <span className="font-medium text-slate-200 text-right max-w-[60%] leading-tight">{report.patient_info.mental_status}</span>
                        </div>
                    </div>
                </div>
            </SortableItem>
        ) : null,
        chief_complaint: (!isFireMode && report.chief_complaint) ? (
            <SortableItem key="chief_complaint" id="chief_complaint" isEditing={isEditingLayout}>
                <div className="glass-panel rounded-xl p-5 mb-6">
                    <h4 className="text-orange-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Chief Complaint
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Primary</span>
                            <p className="text-lg font-medium text-white leading-tight">{report.chief_complaint.primary}</p>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Secondary</span>
                            <p className="text-sm text-slate-300 leading-relaxed">{report.chief_complaint.secondary}</p>
                        </div>
                    </div>
                </div>
            </SortableItem>
        ) : null,
        timeline: (report.vitals_timeline || report.interventions_timeline || report.timeline) ? (
            <SortableItem key="timeline" id="timeline" isEditing={isEditingLayout}>
                <Section title={isFireMode ? "Fireground Timeline" : "Clinical Timeline"} icon={Clock}>
                    <div className="space-y-8">
                        {/* FIRE TIMELINE */}
                        {isFireMode && report.timeline && (
                            <div className="relative pl-4 border-l-2 border-slate-800 space-y-6">
                                {report.timeline.map((event, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900" />
                                        <span className="font-mono text-sm text-red-400 block mb-1">{event.time}</span>
                                        <p className="text-slate-200 text-sm">{event.event}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* EMS TIMELINES */}
                        {!isFireMode && report.vitals_timeline && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 pl-1">VITALS VISUALIZATION</h4>
                                <div className="mb-6">
                                    <VitalsChart vitalsData={report.vitals_timeline} />
                                </div>

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

                        {!isFireMode && report.interventions_timeline && (
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
            </SortableItem>
        ) : null,
        actions: (report.actions_taken || report.hazards || report.action_items || report.qa_flags) ? (
            <SortableItem key="actions" id="actions" isEditing={isEditingLayout}>
                <Section title={isFireMode ? "Operations & Hazards" : "Suggested Follow-up Items"} icon={ShieldAlert}>
                    <div className="grid md:grid-cols-2 gap-8 relative">
                        {/* FIRST COLUMN */}
                        <div>
                            {isFireMode ? (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                            <Activity size={14} /> Actions Taken
                                        </h4>
                                        <ul className="space-y-2">
                                            {report.actions_taken?.map((action, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                                    <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                                                    <span>{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {report.action_items && report.action_items.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                                <ClipboardList size={14} className="text-slate-500" /> Suggested Action Items
                                            </h4>
                                            <ul className="space-y-1">
                                                {report.action_items.map((item, i) => (
                                                    <li key={i} className="group">
                                                        <button
                                                            onClick={() => onActionComplete && onActionComplete(item)}
                                                            className={`w-full text-left flex items-start gap-2.5 text-sm transition-all ${onActionComplete ? 'cursor-pointer hover:bg-emerald-500/10 py-1.5 px-2 -ml-2 rounded-lg' : ''}`}
                                                            disabled={!onActionComplete}
                                                        >
                                                            <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${onActionComplete ? 'border-slate-600 group-hover:border-emerald-500 group-hover:bg-emerald-500/20' : 'border-slate-600'}`}>
                                                                {onActionComplete && <CheckCircle size={10} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                            </div>
                                                            <span className={`transition-colors ${onActionComplete ? 'text-slate-300 group-hover:text-emerald-100' : 'text-slate-300'}`}>{item}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                        <ClipboardList size={14} className="text-slate-500" /> Action Items
                                    </h4>
                                    <ul className="space-y-1">
                                        {report.action_items?.map((item, i) => (
                                            <li key={i} className="group">
                                                <button
                                                    onClick={() => onActionComplete && onActionComplete(item)}
                                                    className={`w-full text-left flex items-start gap-2.5 text-sm transition-all ${onActionComplete ? 'cursor-pointer hover:bg-emerald-500/10 py-1.5 px-2 -ml-2 rounded-lg' : ''}`}
                                                    disabled={!onActionComplete}
                                                >
                                                    <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${onActionComplete ? 'border-slate-600 group-hover:border-emerald-500 group-hover:bg-emerald-500/20' : 'border-slate-600'}`}>
                                                        {onActionComplete && <CheckCircle size={10} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                    </div>
                                                    <span className={`transition-colors ${onActionComplete ? 'text-slate-300 group-hover:text-emerald-100' : 'text-slate-300'}`}>{item}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Divider for desktop */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -ml-px" />

                        {/* SECOND COLUMN */}
                        <div>
                            {isFireMode ? (
                                <div className="space-y-6">
                                    {report.hazards && report.hazards.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                                <AlertTriangle size={14} /> Identified Hazards
                                            </h4>
                                            <ul className="space-y-3">
                                                {report.hazards.map((hazard, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300 bg-red-500/5 border border-red-500/10 p-3 rounded-lg">
                                                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                                        <span>{hazard}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {report.qa_flags && report.qa_flags.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                                                <ShieldAlert size={14} className="text-amber-500" /> QA Flags
                                            </h4>
                                            <ul className="space-y-2">
                                                {report.qa_flags.map((flag, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                                        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                        <span>{flag}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                report.qa_flags && report.qa_flags.length > 0 ? (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <ShieldAlert size={14} className="text-amber-500" /> QA Flags
                                        </h4>
                                        <ul className="space-y-2">
                                            {report.qa_flags.map((flag, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                    <span>{flag}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="space-y-3 opacity-50">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <ShieldAlert size={14} className="text-slate-600" /> QA Flags
                                        </h4>
                                        <p className="text-sm text-slate-500 italic">No flags detected.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </Section>
            </SortableItem>
        ) : null,
        assessment: (!isFireMode && report.assessment) ? (
            <SortableItem key="assessment" id="assessment" isEditing={isEditingLayout}>
                <Section title="Clinical Assessment" icon={FileText}>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {Object.entries(report.assessment).map(([key, value]) => (
                                <div key={key} className="relative pl-4 border-l-2 border-slate-700">
                                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">{key}</span>
                                    <p className="text-sm text-slate-300 leading-relaxed">{value}</p>
                                </div>
                            ))}
                        </div>
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
            </SortableItem>
        ) : null,
        neris: (isFireMode && report.neris_data) ? (
            <SortableItem key="neris" id="neris" isEditing={isEditingLayout}>
                <div className="pt-6 border-t border-white/5 space-y-3 mb-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Layers size={14} className="text-purple-400" /> NERIS Classifications
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col justify-center group hover:border-purple-500/30 transition-colors">
                            <span className="text-xs text-slate-500 font-medium mb-1">Incident Type</span>
                            <span className="text-sm font-medium text-slate-300 leading-tight">
                                {stripNerisCode(report.neris_data.incident_type)}
                            </span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col justify-center group hover:border-purple-500/30 transition-colors">
                            <span className="text-xs text-slate-500 font-medium mb-1">Property Use</span>
                            <span className="text-sm font-medium text-slate-300 leading-tight">
                                {stripNerisCode(report.neris_data.property_use)}
                            </span>
                        </div>
                    </div>
                </div>
            </SortableItem>
        ) : null
    };

    return (
        <div ref={topRef} className="max-w-4xl mx-auto space-y-6 flex flex-col pt-4">
            {/* Header Toolbar (Above the Report Card) */}
            <div className="flex justify-end mb-2 w-full">
                <button
                    onClick={isEditingLayout ? saveLayout : toggleEditMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isEditingLayout
                        ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                >
                    <Settings size={14} className={isEditingLayout ? 'animate-spin-slow' : ''} />
                    {isEditingLayout ? 'Save Layout' : 'Edit Report Layout'}
                </button>
            </div>

            {/* Main Header Card */}
            <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    {isFireMode ? <Flame size={120} /> : <FileText size={120} />}
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
                </div>
            </div>

            {/* Draggable Panels */}
            <div className="w-full">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={layoutOrder}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-6">
                            {layoutOrder.map(key => renderPanels[key])}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                    onClick={onExport}
                    className={`flex-1 btn-primary group ${isFireMode ? 'bg-gradient-to-r from-red-600 to-orange-600 border-red-500/20' : ''}`}
                >
                    <Download size={18} className="group-hover:animate-bounce" />
                    Download Official PDF Packet
                </button>

                {audioUrl && (
                    <a
                        href={audioUrl}
                        download={`recording-${report.id || 'session'}.webm`}
                        className="px-6 py-3 rounded-xl glass-button flex items-center justify-center gap-2 font-semibold hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                        <Mic size={18} />
                        Download Original Recording
                    </a>
                )}

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
