'use client'

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFile } from '@/context/FileContext';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function UploadPage() {
    const { setFile } = useFile();
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !token) return;

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            setIsUploading(true);
            try {
                // Generate cover image from first page
                console.log('Starting cover generation...');
                const coverBlob = await generateCoverFromPDF(file);
                console.log('Cover generated:', coverBlob);

                const formData = new FormData();
                formData.append('file', file);
                if (coverBlob) {
                    formData.append('cover', coverBlob, 'cover.png');
                    console.log('Cover added to form data');
                } else {
                    console.warn('No cover blob generated');
                }

                const response = await fetch('http://localhost:3500/books/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });

                if (response.ok) {
                    const book = await response.json();
                    console.log('Book uploaded:', book);
                    setFile(file); // Keep local file for immediate rendering
                    router.push(`/reading?bookId=${book._id}`);
                } else {
                    console.error('Upload failed:', await response.text());
                }
            } catch (error) {
                console.error("Upload failed", error);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const generateCoverFromPDF = async (file: File): Promise<Blob | null> => {
        try {
            const pdfjs = await import('pdfjs-dist');

            // Set worker source
            pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) return null;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            return new Promise((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/png');
            });
        } catch (error) {
            console.error('Failed to generate cover:', error);
            return null;
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
                    onClick={() => !isUploading && inputRef.current?.click()}
                    className={`group border-4 border-dashed border-slate-100 rounded-4xl p-12 hover:bg-slate-50 hover:border-indigo-100 transition-all ${isUploading ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-indigo-600 font-bold">Generating cover & uploading...</p>
                        </div>
                    ) : (
                        <>
                            <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 group-hover:bg-indigo-700 transition-all">
                                Select File
                            </button>
                            <p className="mt-6 text-sm text-slate-400 font-bold uppercase tracking-widest leading-none">
                                Drop PDF Here
                            </p>
                        </>
                    )}
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
