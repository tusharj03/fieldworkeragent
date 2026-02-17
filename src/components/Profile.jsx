import React, { useState } from 'react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { User, Mail, Shield, Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export function Profile({ user, onBack }) {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ type: '', text: '' });

        try {
            await updateProfile(user, {
                displayName: displayName
            });
            setMsg({ type: 'success', text: 'Profile updated successfully.' });
        } catch (error) {
            console.error(error);
            setMsg({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        setMsg({ type: '', text: '' });
        try {
            await sendPasswordResetEmail(auth, user.email);
            setMsg({ type: 'success', text: `Password reset email sent to ${user.email}` });
        } catch (error) {
            console.error(error);
            setMsg({ type: 'error', text: 'Failed to send reset email.' });
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-3xl font-bold text-white">Account Settings</h2>
            </div>

            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">

                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border-4 border-slate-800 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-xl">
                        {user.email[0].toUpperCase()}
                    </div>
                    <p className="text-slate-400 text-sm font-medium">{user.displayName || 'Agent'}</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <User size={16} className="text-orange-500" />
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                            placeholder="Officer Name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <Mail size={16} className="text-blue-500" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-600 mt-2 ml-1">Email cannot be changed externally.</p>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <label className="block text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-red-500" />
                            Security
                        </label>
                        <button
                            type="button"
                            onClick={handlePasswordReset}
                            className="text-sm text-red-400 hover:text-red-300 hover:underline transition-colors flex items-center gap-2"
                        >
                            Send Password Reset Email
                        </button>
                    </div>

                    {msg.text && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} animate-fade-in`}>
                            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {msg.text}
                        </div>
                    )}

                    <div className="pt-6 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
