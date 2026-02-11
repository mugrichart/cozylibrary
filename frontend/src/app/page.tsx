'use client'

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 text-center space-y-12">
      {/* Auth Header */}
      {!isLoading && (
        <div className="fixed top-8 right-8 z-50">
          {user ? (
            <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-sm">
              <Link href="/library" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Library</Link>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 leading-none">SIGNED IN AS</span>
                <span className="text-sm font-black text-slate-900">{user.name || user.email}</span>
              </div>
              <button
                onClick={logout}
                className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-inner"
                title="Log Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-md p-1.5 rounded-full border border-slate-200 shadow-sm">
              <Link href="/login" className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
              <Link href="/register" className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Sign Up</Link>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 max-w-3xl pt-12">
        <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-tight">
          Read with <span className="text-indigo-600">Precision</span> & <span className="text-indigo-600">Focus</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Experience the next generation of digital reading. Our smart highlighting guide flows with your natural pace, ensuring every word resonates.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        <Link
          href="/library"
          className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
        >
          My Library
        </Link>
        <button
          className="px-10 py-5 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold text-xl hover:bg-slate-50 transition-all active:scale-95"
        >
          How it Works
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-12">
        <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl">✨</div>
          <h3 className="text-xl font-bold text-slate-900">Line-by-Line Focus</h3>
          <p className="text-slate-500">Eliminate distractions with our geometric line-based highlighting engine.</p>
        </div>
        <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">⚡</div>
          <h3 className="text-xl font-bold text-slate-900">Adaptive Speed</h3>
          <p className="text-slate-500">Switch between 0.5x to 2x speed to match your current cognitive load.</p>
        </div>
        <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl">📖</div>
          <h3 className="text-xl font-bold text-slate-900">Premium Reader</h3>
          <p className="text-slate-500">A clean, distraction-free interface designed for deep long-form reading.</p>
        </div>
      </div>
    </div>
  );
}
