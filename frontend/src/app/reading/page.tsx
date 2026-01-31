'use client'

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useFile } from '@/context/FileContext';

const ReadingMachine = dynamic(() => import('@/components/ReadingMachine'), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Preparing your reading experience...</p>
        </div>
    )
});

export default function ReadingPage() {
    const { file } = useFile();
    const router = useRouter();

    useEffect(() => {
        if (!file) {
            router.push('/upload');
        }
    }, [file, router]);

    if (!file) {
        return null;
    }

    return (
        <div className="py-8">
            <header className="max-w-4xl mx-auto px-4 mb-8 flex items-center justify-between">
                <button
                    onClick={() => router.push('/upload')}
                    className="flex items-center space-x-2 text-slate-500 font-bold hover:text-slate-800 transition-colors"
                >
                    <span>←</span>
                    <span>Library</span>
                </button>
                <div className="text-center font-black text-2xl tracking-tight text-slate-900">
                    Cozy<span className="text-indigo-600">Reader</span>
                </div>
                <div className="w-20"></div> {/* Spacer */}
            </header>

            <ReadingMachine file={file} />
        </div>
    );
}
