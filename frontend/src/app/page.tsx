'use client'

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 text-center space-y-12">
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-tight">
          Read with <span className="text-indigo-600">Precision</span> & <span className="text-indigo-600">Focus</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Experience the next generation of digital reading. Our smart highlighting guide flows with your natural pace, ensuring every word resonates.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        <Link
          href="/upload"
          className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
        >
          Start Reading Now
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
