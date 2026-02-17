import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'; // Added sendPasswordResetEmail
import { auth } from '../services/firebase';
import { LogIn, AlertCircle, UserPlus, ArrowRight, KeyRound, CheckCircle } from 'lucide-react'; // Added KeyRound, CheckCircle
import BeaconLogo from '../assets/beacon_logo.png';

export function Login({ onLoginSuccess }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState(''); // New success message state
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Optional: Update profile with name if you want to store it
                if (name) {
                    await updateProfile(userCredential.user, { displayName: name });
                }
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            onLoginSuccess();
        } catch (err) {
            console.error(err);
            let msg = 'Authentication failed. Please try again.';
            if (err.code === 'auth/email-already-in-use') msg = 'Email already in use. Please sign in.';
            if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
            if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg('Password reset email sent! Check your inbox.');
        } catch (err) {
            console.error(err);
            setError('Failed to send reset email. Verify the email address.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in relative overflow-hidden">

                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="text-center mb-10">

                        <img src={BeaconLogo} alt="Beacon" className="h-24 mx-auto mb-4 object-contain" />
                        <p className="text-slate-400">{isSignUp ? 'Create Agent Profile' : 'Secure Access Portal'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isSignUp && (
                            <div className="animate-slide-up">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required={isSignUp}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                    placeholder="Officer John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                placeholder="name@agency.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">Password</label>
                                {!isSignUp && (
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                                    >
                                        <KeyRound size={12} />
                                        Forgot Password?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                required={!successMsg} // Password not needed if just resetting
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/20 animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg text-sm border border-green-500/20 animate-fade-in">
                                <CheckCircle size={16} />
                                {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isSignUp ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-500/20'}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                                setSuccessMsg('');
                            }}
                            className="text-slate-400 text-sm hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto group"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Register Access'}
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-8">
                        Restricted System • Authorized Personnel Only
                        <br />
                        Beacon AI v2.5.0
                    </p>
                </div>
            </div>
        </div>
    );
}

