"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Upload, BookOpen, Music, Headphones } from 'lucide-react';
import { useSoundPlayer } from '@/lib/hooks/useSoundPlayer';

// Configure the worker. Since we are in a Next.js environment, 
// using a CDN is often more reliable than manual worker configuration 
// unless we set up a custom webpack/turbopack rule.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function PDFReader() {
    const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [moodSections, setMoodSections] = useState<any[]>([]);
    const [isReading, setIsReading] = useState(false);
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [currentText, setCurrentText] = useState("");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const { playMood, soundState } = useSoundPlayer();

    useEffect(() => {
        if (isReading && moodSections.length > 0) {
            const current = moodSections[0];
            if (current?.audioUrl) {
                playMood(current.audioUrl, current.mood);
            }
        }
    }, [isReading, moodSections, playMood]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        try {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            setPdf(pdfDoc);
            setNumPages(pdfDoc.numPages);
            setCurrentPage(1);
            await renderPage(pdfDoc, 1);
        } catch (err) {
            console.error("Error loading PDF:", err);
        } finally {
            setLoading(false);
        }
    };

    const renderPage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNumber: number) => {
        try {
            // Cancel previous render if it exists
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            const page = await pdfDoc.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext('2d');
            if (!context) return;

            // Adjust for high DPI screens
            const ratio = window.devicePixelRatio || 1;
            canvas.height = viewport.height * ratio;
            canvas.width = viewport.width * ratio;
            canvas.style.height = `${viewport.height}px`;
            canvas.style.width = `${viewport.width}px`;
            context.scale(ratio, ratio);

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                canvas: canvas,
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;
            await renderTask.promise;

            // Extract text for the reader display
            const textContent = await page.getTextContent();
            const items = textContent.items as any[];

            // Sort items by position
            const sortedItems = [...items].sort((a, b) => {
                if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
                    return a.transform[4] - b.transform[4];
                }
                return b.transform[5] - a.transform[5];
            });

            let detectedParagraphs: string[] = [];
            let currentPara = "";
            let lastY = -1;

            sortedItems.forEach(item => {
                const itemY = item.transform[5];
                // If vertical gap is large, start a new paragraph
                if (lastY !== -1 && Math.abs(itemY - lastY) > 20) {
                    if (currentPara.trim()) detectedParagraphs.push(currentPara.trim());
                    currentPara = item.str;
                } else {
                    currentPara += (currentPara ? " " : "") + item.str;
                }
                lastY = itemY;
            });
            if (currentPara.trim()) detectedParagraphs.push(currentPara.trim());

            setParagraphs(detectedParagraphs);
            setCurrentText(detectedParagraphs[0] || ""); // Show first paragraph as "current"

            // Analyze mood for the extracted text
            analyzeMood(detectedParagraphs.join("\n"));
        } catch (err: any) {
            if (err.name === 'RenderingCancelledException') {
                console.log('Rendering cancelled');
            } else {
                console.error("Error rendering page:", err);
            }
        }
    };

    const analyzeMood = async (text: string) => {
        if (!text.trim()) return;
        setAnalyzing(true);
        setMoodSections([]);
        try {
            const response = await fetch('http://localhost:3500/mood/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (response.ok) {
                const data = await response.json();
                setMoodSections(data);
            }
        } catch (error) {
            console.error("Failed to analyze mood:", error);
        } finally {
            setAnalyzing(false);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            if (pdf) renderPage(pdf, newPage);
        }
    };

    const goToNextPage = () => {
        if (currentPage < numPages) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            if (pdf) renderPage(pdf, newPage);
        }
    };

    const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1 && val <= numPages) {
            setCurrentPage(val);
            if (pdf) renderPage(pdf, val);
        }
    };

    return (
        <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
            {/* Sidebar (Hidden on mobile) */}
            <aside className="hidden lg:flex flex-col w-80 border-r border-border bg-card/30 backdrop-blur-xl shrink-0">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center shadow-lg shadow-gold/20">
                        <BookOpen className="text-gold-foreground" size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Cozy Library</h1>
                        <p className="text-[10px] uppercase tracking-widest text-gold font-semibold">Mood Reader</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {pdf ? (
                        <>
                            <div className="space-y-4">
                                <h3 className="text-xs font-black tracking-widest text-gold uppercase flex items-center gap-2">
                                    <Music size={14} className="animate-pulse" />
                                    Text Stream
                                </h3>
                                <div className="space-y-4">
                                    {paragraphs.map((para, idx) => (
                                        <p
                                            key={idx}
                                            className={`text-sm leading-relaxed transition-all ${idx === 0 ? 'text-foreground font-semibold' : 'text-foreground/60'}`}
                                        >
                                            {para}
                                        </p>
                                    ))}
                                    {paragraphs.length === 0 && (
                                        <p className="text-sm italic text-muted-foreground">Extracting content...</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border">
                                <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4 space-y-2 text-xs">
                                    <p className="font-bold text-gold">Immersive Analysis</p>
                                    {analyzing ? (
                                        <>
                                            <p className="text-muted-foreground leading-relaxed">
                                                We're currently identifying the emotional landscape of your book to sync the music.
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                                <span className="text-blue-400 font-medium">Processing Chapter Sentiment</span>
                                            </div>
                                        </>
                                    ) : moodSections.length > 0 ? (
                                        <div className="space-y-3">
                                            <p className="text-muted-foreground leading-relaxed">
                                                Analysis complete. ({moodSections.length} mood changes detected)
                                            </p>
                                            <button
                                                onClick={() => setIsReading(true)}
                                                className="w-full bg-gold text-gold-foreground py-2 rounded-lg font-bold text-xs hover:brightness-110 active:scale-95 transition-all"
                                            >
                                                START READING
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground leading-relaxed">
                                            Waiting for analysis...
                                        </p>
                                    )}
                                </div>
                                {isReading && moodSections.length > 0 && (
                                    <div className="mt-4 p-4 border border-gold/20 rounded-2xl bg-black/40">
                                        <p className="text-xs text-gold font-bold mb-2">NOW PLAYING</p>
                                        <p className="text-sm font-medium text-white">{moodSections[0]?.mood || "Unknown Mood"}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <Headphones size={40} className="text-gold" />
                            <p className="text-sm italic">Waiting for a story to begin...</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border mt-auto">
                    <label className="flex items-center justify-center gap-2 cursor-pointer bg-gold text-gold-foreground w-full py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all font-bold text-sm shadow-lg shadow-gold/20">
                        <Upload size={16} />
                        <span>Change Book</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
            </aside>

            {/* Main Reader View */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
                {/* Navigation Bar (Always at top of reader) */}
                <header className="flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-md z-10 h-16 shrink-0">
                    <div className="flex-1 lg:hidden">
                        <div className="flex items-center gap-2 text-gold">
                            <BookOpen size={20} />
                            <span className="font-bold text-sm">Cozy Reader</span>
                        </div>
                    </div>

                    <div className="flex-[2] flex justify-center items-center">
                        {pdf && (
                            <div className="flex items-center bg-secondary/80 rounded-full px-3 py-1.5 border border-border shadow-sm ring-1 ring-black/5">
                                <button
                                    onClick={goToPrevPage}
                                    disabled={currentPage <= 1}
                                    className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex items-center px-4 border-x border-border/50 mx-2">
                                    <input
                                        type="number"
                                        value={currentPage}
                                        onChange={handlePageInput}
                                        className="w-10 text-center bg-transparent border-none font-bold text-primary focus:ring-0 outline-none text-sm"
                                    />
                                    <span className="text-muted-foreground font-medium mx-1 text-xs">/</span>
                                    <span className="text-muted-foreground font-medium text-xs">{numPages}</span>
                                </div>

                                <button
                                    onClick={goToNextPage}
                                    disabled={currentPage >= numPages}
                                    className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* <div className="flex-1 hidden sm:flex justify-end">
                        {pdf && (
                            <div className="text-[10px] px-2.5 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 font-extrabold uppercase tracking-widest">
                                Processing Live
                            </div>
                        )}
                    </div> */}
                </header>

                {/* Reader Canvas Area (Scalable & Scrollable) */}
                <div className="flex-1 overflow-auto bg-black/[0.03] p-4 md:p-8 flex justify-center items-start custom-scrollbar">
                    {!pdf && !loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 max-w-lg animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full"></div>
                                <div className="relative w-24 h-24 bg-card border border-border rounded-3xl flex items-center justify-center shadow-2xl">
                                    <BookOpen size={40} className="text-gold" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black tracking-tight">Begin your journey</h2>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    Select a PDF to transform your reading into a cinematic experience.
                                    Our AI will analyze the prose to curate the perfect atmospheric score.
                                </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer bg-gold text-gold-foreground px-8 py-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all font-black text-sm shadow-2xl shadow-gold/20 group">
                                <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
                                <span>IMPORT MANUSCRIPT</span>
                                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    ) : (
                        <div className={`relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] ring-1 ring-black/5 rounded-sm overflow-hidden bg-white transition-all duration-700 ${loading ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                            {loading && (
                                <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                                    <div className="w-10 h-10 border-3 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                                    <p className="text-gold text-xs font-black tracking-widest uppercase animate-pulse">Initializing Pages...</p>
                                </div>
                            )}
                            <canvas ref={canvasRef} className="max-w-full h-auto" />
                        </div>
                    )}
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--gold) / 0.5);
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
