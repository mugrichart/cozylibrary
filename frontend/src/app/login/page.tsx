'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3500/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                login(data.access_token, data.user);
            } else {
                const errData = await response.json();
                setError(errData.message || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please check if the server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-linear-to-br from-indigo-500 via-purple-500 to-rose-400">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-indigo-100/70 font-medium">Continue your cozy reading journey</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-rose-500/20 border border-rose-500/50 text-rose-100 px-4 py-3 rounded-xl text-sm font-medium animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-indigo-100 uppercase tracking-widest pl-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-indigo-100 uppercase tracking-widest pl-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-indigo-100/60 font-medium">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-white font-bold hover:underline decoration-2 underline-offset-4">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
