'use client'

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { TextItem } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useSoundPlayer } from '@/lib/hooks/useSoundPlayer';
import { segmentTextByMood, MoodSegment } from '@/lib/moodSegmenter';

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

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function ReadingMachine({ file }: ReadingMachineProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageItems, setPageItems] = useState<TextItem[]>([]);
    const [lines, setLines] = useState<ReadingLine[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { soundState, playMood, togglePlay: toggleSound, setVolume } = useSoundPlayer();
    const [moodSegments, setMoodSegments] = useState<MoodSegment[]>([]);

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
        setMoodSegments(segmentTextByMood(extractedLines.map(l => l.text)));

        // If playing, start from top of the new page
        if (isPlaying) {
            setCurrentIndex(0);
        } else {
            setCurrentIndex(-1);
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
                setCurrentIndex(prev => {
                    const next = prev + 1;
                    if (next >= lines.length) {
                        if (pageNumber < (numPages || 0)) {
                            setPageNumber(p => p + 1);
                            return 0;
                        }
                        setIsPlaying(false);
                        return prev;
                    }
                    return next;
                });
            }, duration);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isPlaying, currentIndex, lines, speed, pageNumber, numPages]);

    // Handle mood transitions
    useEffect(() => {
        if (isPlaying && currentIndex >= 0 && moodSegments.length > 0) {
            const currentSegment = moodSegments.find(
                s => currentIndex >= s.startIndex && currentIndex <= s.endIndex
            );
            if (currentSegment && currentSegment.audioPath) {
                playMood(currentSegment.audioPath, currentSegment.mood);
            }
        }
    }, [currentIndex, isPlaying, moodSegments, playMood]);

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
                        className={`px-6 py-2 rounded-xl font-bold transition-all transform active:scale-95 ${isPlaying
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-100'
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            }`}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Start Reading'}
                    </button>

                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        {speedOptions.map(s => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${speed === s ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                {s}x
                            </button>
                        ))}
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
                        <span>Page {pageNumber} / {numPages || '?'}</span>
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
                    onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
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
            `}</style>
        </div>
    );
}
