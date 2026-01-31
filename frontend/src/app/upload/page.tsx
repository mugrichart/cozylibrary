'use client'

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFile } from '@/context/FileContext';

export default function UploadPage() {
    const { setFile } = useFile();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            setFile(file);
            router.push('/reading');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-xl bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center space-y-8">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4">
                    📄
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Upload your book</h1>
                    <p className="text-slate-500 font-medium">Select a PDF to start your focused reading session</p>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />

                <div
                    onClick={() => inputRef.current?.click()}
                    className="group border-4 border-dashed border-slate-100 rounded-[2rem] p-12 hover:bg-slate-50 hover:border-indigo-100 transition-all cursor-pointer"
                >
                    <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 group-hover:bg-indigo-700 transition-all">
                        Select File
                    </button>
                    <p className="mt-6 text-sm text-slate-400 font-bold uppercase tracking-widest leading-none">
                        Drop PDF Here
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        onClick={() => router.push('/')}
                        className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}
