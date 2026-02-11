'use client'

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { TextItem } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useSoundPlayer } from '@/lib/hooks/useSoundPlayer';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
// import { segmentTextByMood, MoodSegment } from '@/lib/moodSegmenter'; // REMOVED

interface MoodSegment {
    startIndex: number;
    endIndex: number;
    mood: string;
    audioUrl?: string; // Add audioUrl
}

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

// Baseline: 200 Words Per Minute (Average human speed)
const BASE_WORDS_PER_MINUTE = 200;
const BASE_MS_PER_WORD = 60000 / BASE_WORDS_PER_MINUTE; // ~300ms
const MIN_LINE_DURATION = 800;

interface ReadingMachineProps {
    file: File | string;
}

interface ReadingLine {
    text: string;
    itemIndices: number[];
}



export default function ReadingMachine({ file }: ReadingMachineProps) {
    const { token, logout } = useAuth();
    const searchParams = useSearchParams();
    const bookId = searchParams.get('bookId');

    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageItems, setPageItems] = useState<TextItem[]>([]);

    // Load progress
    useEffect(() => {
        if (!bookId || !token) return;

        const loadProgress = async () => {
            try {
                const response = await fetch(`http://localhost:3500/books/${bookId}/progress`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.lastPage) setPageNumber(data.lastPage);
                }
            } catch (err) {
                console.error("Failed to load progress", err);
            }
        };
        loadProgress();
    }, [bookId, token]);

    // Save progress
    useEffect(() => {
        if (!bookId || !token || pageNumber === 1) return;

        const saveProgress = async () => {
            try {
                await fetch(`http://localhost:3500/books/${bookId}/progress`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ page: pageNumber })
                });
            } catch (err) {
                console.error("Failed to save progress", err);
            }
        };
        saveProgress();
    }, [pageNumber, bookId, token]);
    const [lines, setLines] = useState<ReadingLine[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pageNumberRef = useRef(pageNumber);

    // Keep ref in sync with state
    useEffect(() => {
        pageNumberRef.current = pageNumber;
    }, [pageNumber]);

    const { soundState, playMood, togglePlay: toggleSound, setVolume } = useSoundPlayer();
    const [moodCache, setMoodCache] = useState<Record<number, MoodSegment[]>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const pdfRef = useRef<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Debounce the page load analysis to prevent spam calls
    const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Extract text items and group into lines by EOL
    const onPageLoadSuccess = async (page: any) => {
        const textContent = await page.getTextContent();
        const items: TextItem[] = textContent.items.filter((item: any): item is TextItem => 'str' in item);
        setPageItems(items);

        // Group items into lines based on hasEOL
        const extractedLines: ReadingLine[] = [];
        let currentLineIndices: number[] = [];

        items.forEach((item, index) => {
            currentLineIndices.push(index);

            if (item.hasEOL) {
                const lineText = currentLineIndices.map(i => items[i].str).join('');
                if (lineText.trim().length > 0) {
                    extractedLines.push({
                        text: lineText.trim(),
                        itemIndices: [...currentLineIndices]
                    });
                }
                currentLineIndices = [];
            }
        });

        // Remaining items without EOL
        if (currentLineIndices.length > 0) {
            const lineText = currentLineIndices.map(i => items[i].str).join('');
            if (lineText.trim().length > 0) {
                extractedLines.push({
                    text: lineText.trim(),
                    itemIndices: [...currentLineIndices]
                });
            }
        }

        setLines(extractedLines);

        // Pre-fetch analysis for this page and next
        prefetchAnalysis(page.pageNumber);
        if (page.pageNumber < (numPages || 0)) {
            prefetchAnalysis(page.pageNumber + 1);
        }

        // If playing, start from top of the new page
        if (isPlaying) {
            setCurrentIndex(0);
        } else if (currentIndex < 0) {
            setCurrentIndex(-1);
        }
    };

    const prefetchAnalysis = async (pg: number) => {
        // Skip if already in cache or if PDF isn't loaded yet
        if (moodCache[pg] || !pdfRef.current) return;

        // If analyzing current page, show loading state
        if (pg === pageNumberRef.current) setIsAnalyzing(true);

        try {
            const page = await pdfRef.current.getPage(pg);
            const textContent = await page.getTextContent();
            const items = textContent.items.filter((item: any) => 'str' in item);

            // Group into lines for consistency with character mapping
            const pageLines: string[] = [];
            let currentLineText = '';
            items.forEach((item: any) => {
                currentLineText += item.str;
                if (item.hasEOL) {
                    if (currentLineText.trim()) pageLines.push(currentLineText.trim());
                    currentLineText = '';
                }
            });
            if (currentLineText.trim()) pageLines.push(currentLineText.trim());

            const textToAnalyze = pageLines.join('\n');
            const response = await fetch('http://localhost:3500/mood/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: textToAnalyze }),
            });

            if (response.status === 401) {
                console.error("Session expired. Logging out.");
                logout();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                const fullText = pageLines.join('\n');

                const mapped = data.map((d: any) => {
                    const charStart = fullText.indexOf(d.start);
                    const charEnd = fullText.indexOf(d.end) + d.end.length;

                    if (charStart === -1) return { startIndex: 0, endIndex: 0, mood: d.mood, audioUrl: d.audioUrl };

                    let currentLength = 0;
                    let startLine = 0;
                    let endLine = 0;

                    for (let i = 0; i < pageLines.length; i++) {
                        const lineLength = pageLines[i].length + 1;
                        if (currentLength <= charStart && charStart < currentLength + lineLength) startLine = i;
                        if (currentLength <= charEnd && charEnd <= currentLength + lineLength) endLine = i;
                        currentLength += lineLength;
                    }
                    return {
                        startIndex: startLine,
                        endIndex: Math.max(startLine, endLine),
                        mood: d.mood,
                        audioUrl: d.audioUrl
                    };
                });

                setMoodCache(prev => ({ ...prev, [pg]: mapped }));
                console.log(`Mood analysis for Page ${pg}:`, mapped);
            }
        } catch (e) {
            console.error(`Analysis failed for page ${pg}`, e);
        } finally {
            if (pg === pageNumberRef.current) setIsAnalyzing(false);
        }
    };

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pageNumber]);

    // Custom smooth scroll with controllable duration
    const smoothScrollTo = (targetY: number, duration: number = 600) => {
        const startY = window.scrollY;
        const difference = targetY - startY;
        const startTime = performance.now();

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            window.scrollTo(0, startY + difference * eased);

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };

        requestAnimationFrame(animateScroll);
    };

    // Keep the highlighted line in view as reading progresses
    useEffect(() => {
        if (currentIndex >= 0 && isPlaying) {
            requestAnimationFrame(() => {
                const mark = document.querySelector('.react-pdf__Page mark');
                if (mark) {
                    const rect = mark.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;

                    // Only scroll if the element is outside the comfortable zone (middle 60% of viewport)
                    const topThreshold = viewportHeight * 0.2;
                    const bottomThreshold = viewportHeight * 0.8;

                    if (rect.top < topThreshold || rect.bottom > bottomThreshold) {
                        // Calculate target scroll position to center the element
                        const elementCenter = window.scrollY + rect.top + rect.height / 2;
                        const targetY = elementCenter - viewportHeight / 2;
                        smoothScrollTo(targetY, 600); // 600ms gentle scroll
                    }
                }
            });
        }
    }, [currentIndex, isPlaying]);

    const togglePlayback = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (soundState.isPlaying) toggleSound();
        } else {
            setIsPlaying(true);
            if (currentIndex < 0) setCurrentIndex(0);
            if (!soundState.isPlaying) toggleSound();
        }
    };

    const getLineDuration = (lineText: string) => {
        const wordCount = lineText.split(/\s+/).filter(w => w.length > 0).length;
        const duration = Math.max(wordCount * BASE_MS_PER_WORD, MIN_LINE_DURATION);
        return duration / speed;
    };

    // Playback effect
    useEffect(() => {
        if (isPlaying && lines.length > 0 && currentIndex >= 0 && currentIndex < lines.length) {
            const currentLine = lines[currentIndex];
            const duration = getLineDuration(currentLine?.text || "");

            timeoutRef.current = setTimeout(() => {
                const isLastLine = currentIndex >= lines.length - 1;

                if (isLastLine) {
                    if (pageNumber < (numPages || 0)) {
                        console.log(`End of page ${pageNumber}. Transitioning to ${pageNumber + 1}`);
                        setPageNumber(p => p + 1);
                        setLines([]); // IMMEDIATELY clear lines to prevent effect from re-running with old page data
                        setCurrentIndex(-1); // Reset to waiting state
                    } else {
                        console.log("End of document reached.");
                        setIsPlaying(false);
                    }
                } else {
                    setCurrentIndex(prev => prev + 1);
                }
            }, duration);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isPlaying, currentIndex, lines, speed, pageNumber, numPages]);

    // Handle mood transitions
    useEffect(() => {
        const currentSegments = moodCache[pageNumber];
        if (isPlaying && currentIndex >= 0 && currentSegments && currentSegments.length > 0) {
            const currentSegment = currentSegments.find(
                s => currentIndex >= s.startIndex && currentIndex <= s.endIndex
            );
            if (currentSegment && currentSegment.audioUrl) {
                playMood(currentSegment.audioUrl, currentSegment.mood);
            }
        }
    }, [currentIndex, isPlaying, moodCache, pageNumber, playMood]);

    // INDEX-BASED HIGHLIGHTING: Check if current item belongs to the active line
    const textRenderer = useCallback((textItem: TextItem) => {
        if (currentIndex < 0 || !lines[currentIndex]) return textItem.str;

        // Find the index of this textItem in our stored items array
        const itemIndex = pageItems.findIndex(item =>
            item.str === textItem.str &&
            item.transform[4] === textItem.transform[4] &&
            item.transform[5] === textItem.transform[5]
        );

        const activeLineIndices = lines[currentIndex].itemIndices;

        if (activeLineIndices.includes(itemIndex)) {
            return `<mark style="background-color: rgba(100, 149, 237, 0.35); color: inherit; border-radius: 4px;">${textItem.str}</mark>`;
        }

        return textItem.str;
    }, [currentIndex, lines, pageItems]);

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 space-y-6">
            {/* Control Bar */}
            <div className="flex flex-wrap items-center justify-between w-full bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg sticky top-4 z-50 border border-slate-200 gap-4">
                <div className="flex items-center space-x-4 shrink-0">
                    <button
                        onClick={togglePlayback}
                        disabled={isAnalyzing}
                        className={`px-6 py-2 rounded-xl font-bold transition-all transform active:scale-95 ${isPlaying
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-100'
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            }`}
                    >
                        {isPlaying ? '⏸ Pause' : isAnalyzing ? 'Analyzing...' : '▶ Start Reading'}
                    </button>

                    <div className="flex flex-col items-center min-w-[210px] px-2 group/speed">
                        <div className="flex justify-between w-full px-[2px] mb-1">
                            {[0.5, 1.0, 1.5, 2.0, 2.5].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setSpeed(v)}
                                    className="flex flex-col items-center group/marker cursor-pointer"
                                    title={`Snap to ${v}x`}
                                >
                                    <div className={`w-px transition-all duration-300 ${Math.abs(speed - v) < 0.05 ? 'bg-indigo-600 h-2.5 w-0.5' : 'bg-slate-300 h-1.5 group-hover/marker:bg-slate-400'}`}></div>
                                    <span className={`text-[9px] mt-0.5 font-bold transition-colors ${Math.abs(speed - v) < 0.05 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {v.toFixed(1)}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full group">
                            <input
                                type="range"
                                min="0.5"
                                max="2.5"
                                step="0.01"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {/* Floating Tooltip */}
                            <div
                                className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg whitespace-nowrap z-60 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-indigo-600"
                                style={{ left: `${((speed - 0.5) / 2) * 100}%` }}
                            >
                                {speed.toFixed(2)}x
                            </div>
                            <div
                                className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-[9px] font-black text-indigo-500/60 uppercase tracking-tighter transition-opacity group-hover/speed:opacity-0"
                            >
                                Speed: {speed.toFixed(2)}x
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 bg-slate-100 rounded-xl px-3 py-1">
                        <span className="text-xs font-bold text-slate-400">VOL</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={soundState.volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-24 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                    {soundState.currentMood && (
                        <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                                {soundState.currentMood}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center space-x-4 text-slate-600 font-medium border-l pl-6">
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => { setPageNumber(p => p - 1); setIsPlaying(false); }}
                            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        >
                            ←
                        </button>
                        <div className="flex items-center space-x-2">
                            <span>Page</span>
                            <input
                                type="number"
                                value={pageNumber}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1 && val <= (numPages || 1)) {
                                        setPageNumber(val);
                                        setIsPlaying(false);
                                    }
                                }}
                                className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span>/ {numPages || '?'}</span>
                        </div>
                        <button
                            disabled={pageNumber >= (numPages || 0)}
                            onClick={() => { setPageNumber(p => p + 1); setIsPlaying(false); }}
                            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Viewer */}
            <div className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 min-h-[800px]">
                <Document
                    file={file}
                    onLoadSuccess={(pdf) => {
                        pdfRef.current = pdf;
                        setNumPages(pdf.numPages);
                    }}
                    className="flex justify-center"
                >
                    <Page
                        pageNumber={pageNumber}
                        onLoadSuccess={onPageLoadSuccess}
                        customTextRenderer={textRenderer}
                        renderAnnotationLayer={false}
                        renderTextLayer={true}
                        width={Math.min(typeof window !== 'undefined' ? window.innerWidth - 64 : 800, 800)}
                    />
                </Document>

                {isPlaying && currentIndex >= 0 && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-indigo-600/90 text-white px-6 py-2 rounded-full backdrop-blur-sm shadow-xl font-medium text-sm">
                        Focus Mode Active
                    </div>
                )}
            </div>

            <style jsx global>{`
                .react-pdf__Page mark {
                    background-color: rgba(100, 149, 237, 0.35) !important;
                    color: inherit !important;
                    padding: 2px 0;
                    border-radius: 4px;
                }

                /* Premium Slider Styling */
                input[type="range"].accent-indigo-600::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #4f46e5;
                    border: 3px solid white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
                    transition: all 0.2s ease;
                }

                input[type="range"].accent-indigo-600::-webkit-slider-thumb:hover {
                    transform: scale(1.15);
                    box-shadow: 0 6px 15px rgba(79, 70, 229, 0.4);
                }

                input[type="range"].accent-indigo-600::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    background: #4f46e5;
                    border: 3px solid white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
                }
            `}</style>
        </div>
    );
}
