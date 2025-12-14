import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Activity, Heart, Wind, Droplet } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-slate-400 text-xs font-mono mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm mb-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-200 font-medium">
                            {entry.name}: {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function VitalsChart({ vitalsData }) {
    const [activeTab, setActiveTab] = useState('cardio'); // 'cardio' | 'bp'

    if (!vitalsData || vitalsData.length === 0) return null;

    // Parse Data
    const formattedData = vitalsData.map(d => {
        const bpParts = d.bp ? d.bp.split('/') : [null, null];
        return {
            time: d.time,
            hr: parseInt(d.hr) || null,
            rr: parseInt(d.rr) || null,
            spo2: parseInt(d.spo2?.replace('%', '')) || null,
            systolic: parseInt(bpParts[0]) || null,
            diastolic: parseInt(bpParts[1]) || null,
        };
    }).reverse(); // Recharts usually likes chronological order

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id
                    ? 'bg-white/10 text-white shadow-lg border border-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/50">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} /> Vitals Trends
                </h3>
                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/5">
                    <TabButton id="cardio" label="Heart & Lungs" icon={Heart} />
                    <TabButton id="bp" label="Blood Pressure" icon={Activity} />
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {activeTab === 'cardio' ? (
                        <AreaChart data={formattedData}>
                            <defs>
                                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="time"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            <Area
                                type="monotone"
                                dataKey="hr"
                                name="Heart Rate"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorHr)"
                            />
                            <Area
                                type="monotone"
                                dataKey="spo2"
                                name="SpO2 %"
                                stroke="#0ea5e9"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorSpo2)"
                            />
                            <Line
                                type="monotone"
                                dataKey="rr"
                                name="Resp Rate"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 4 }}
                                strokeDasharray="5 5"
                            />
                        </AreaChart>
                    ) : (
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="time"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                domain={[40, 200]}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            <Line
                                type="monotone"
                                dataKey="systolic"
                                name="Systolic BP"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="diastolic"
                                name="Diastolic BP"
                                stroke="#a78bfa"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: '#a78bfa', r: 3 }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default VitalsChart;
