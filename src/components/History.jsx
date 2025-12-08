import React, { useState, useEffect } from 'react';
import { Clock, FileText, ChevronRight, Search, Calendar, Trash2 } from 'lucide-react';

export function History({ onSelectReport, user, mode }) {
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadReports = () => {
            try {
                const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');

                // Filter by User ID and Mode
                // Note: Only show reports that belong to this user AND match the current mode (EMS/FIRE)
                const filtered = savedReports.filter(r => {
                    const matchesUser = r.userId === user.uid;
                    const reportMode = r.mode || 'EMS'; // Default to EMS for legacy reports
                    const matchesMode = reportMode === mode;
                    return matchesUser && matchesMode;
                });

                // Sort by timestamp descending
                const sorted = filtered.sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                setReports(sorted);
            } catch (e) {
                console.error("Failed to load reports:", e);
                setReports([]);
            }
        };

        loadReports();
    }, [user.uid, mode]);

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this report?')) {
            const allReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            const updatedAll = allReports.filter(r => r.id !== id);

            localStorage.setItem('saved_reports', JSON.stringify(updatedAll));

            // Re-filter locally to update UI
            const updatedLocal = reports.filter(r => r.id !== id);
            setReports(updatedLocal);
        }
    };

    const filteredReports = reports.filter(report =>
        report.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id?.toString().includes(searchTerm)
    );

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return 'Unknown Date';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        {mode === 'FIRE' ? 'Fire Incident History' : 'EMS Patient History'}
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Viewing records for user <span className="text-white font-medium">{user.email}</span>
                    </p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-sm font-medium px-2">
                        {reports.length} Records
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                    type="text"
                    placeholder="Search reports by content, ID, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600"
                />
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                {filteredReports.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/5 border-dashed">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} className="text-slate-600" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-300 mb-1">No Reports Found</h3>
                        <p className="text-slate-500">
                            {searchTerm ? "Try adjusting your search terms" : `Start your first ${mode} report`}
                        </p>
                    </div>
                ) : (
                    filteredReports.map((report) => (
                        <div
                            key={report.id || Math.random()}
                            onClick={() => onSelectReport(report)}
                            className="group relative bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-orange-500/30 rounded-xl p-5 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${mode === 'FIRE' ? 'bg-gradient-to-b from-red-500 to-orange-600' : 'bg-gradient-to-b from-orange-500 to-red-600'}`} />

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-slate-200 truncate">
                                            {report.category || 'Incident Report'}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${report.urgency?.toLowerCase() === 'high'
                                            ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            }`}>
                                            {report.urgency || 'Normal'}
                                        </span>
                                    </div>

                                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                                        {report.summary}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {formatDate(report.timestamp)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={12} />
                                            ID: #{report.id}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={(e) => handleDelete(e, report.id)}
                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete Report"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <ChevronRight size={20} className="text-slate-600 group-hover:text-orange-500 transition-colors mt-auto" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
