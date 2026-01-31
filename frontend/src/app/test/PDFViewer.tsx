'use client'

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { TextItem } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

// Baseline: 200 Words Per Minute (Average human speed)
const WORDS_PER_MINUTE = 200;
const MS_PER_WORD = 60000 / WORDS_PER_MINUTE; // ~300ms
const MIN_LINE_DURATION = 800;

interface PDFViewerProps {
    file: string | File;
    searchText: string;
}

interface ReadingLine {
    text: string;
    itemIndices: number[];
}

export default function PDFViewer({ file, searchText: propSearchText }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageItems, setPageItems] = useState<TextItem[]>([]);
    const [lines, setLines] = useState<ReadingLine[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Extract text items and group into lines by EOL
    const extractPageText = async (pdfPage: any) => {
        const textContent = await pdfPage.getTextContent();
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

        // Don't forget any remaining items without EOL at the end
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
        console.log(`Page ${pageNumber}: Extracted ${extractedLines.length} lines from ${items.length} items`);

        setCurrentIndex(-1);
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const onPageLoadSuccess = (pdfPage: any) => {
        extractPageText(pdfPage);
    };

    const togglePlayback = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        } else {
            setIsPlaying(true);
            if (currentIndex < 0) setCurrentIndex(0);
        }
    };

    const reset = () => {
        setIsPlaying(false);
        setCurrentIndex(-1);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const goToPrevPage = () => {
        setPageNumber(prev => Math.max(prev - 1, 1));
        setIsPlaying(false);
    };

    const goToNextPage = () => {
        setPageNumber(prev => Math.min(prev + 1, numPages || prev));
        setIsPlaying(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevPage();
            if (e.key === 'ArrowRight') goToNextPage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [numPages]);

    const getLineDuration = (lineText: string) => {
        const wordCount = lineText.split(/\s+/).filter(w => w.length > 0).length;
        return Math.max(wordCount * MS_PER_WORD, MIN_LINE_DURATION);
    };

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
    }, [isPlaying, currentIndex, lines, pageNumber, numPages]);

    // INDEX-BASED HIGHLIGHTING: Check if current item belongs to the active line
    const textRenderer = useCallback((textItem: TextItem) => {
        // Manual search mode (prop-based)
        if (propSearchText) {
            const escaped = propSearchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            return textItem.str.replace(
                regex,
                '<mark style="background-color: rgba(100, 149, 237, 0.3); color: inherit; border-radius: 2px;">$1</mark>'
            );
        }

        // Reading guide mode: use index-based matching
        if (currentIndex < 0 || !lines[currentIndex]) return textItem.str;

        // Find the index of this textItem in our stored items array
        const itemIndex = pageItems.findIndex(item =>
            item.str === textItem.str &&
            item.transform[4] === textItem.transform[4] &&
            item.transform[5] === textItem.transform[5]
        );

        const activeLineIndices = lines[currentIndex].itemIndices;

        if (activeLineIndices.includes(itemIndex)) {
            return `<mark style="background-color: rgba(100, 149, 237, 0.35); color: inherit; border-radius: 2px;">${textItem.str}</mark>`;
        }

        return textItem.str;
    }, [propSearchText, currentIndex, lines, pageItems]);

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={togglePlayback}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isPlaying ? '#ff4d4f' : '#0070f3',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Start Reading Guide'}
                    </button>
                    <button
                        onClick={reset}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        ⟲ Reset
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        style={{ border: 'none', background: 'none', cursor: pageNumber <= 1 ? 'default' : 'pointer', fontSize: '1.2rem', opacity: pageNumber <= 1 ? 0.3 : 1 }}
                    >
                        ←
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', minWidth: '80px', textAlign: 'center' }}>
                        Page {pageNumber} / {numPages || '?'}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= (numPages || 0)}
                        style={{ border: 'none', background: 'none', cursor: pageNumber >= (numPages || 0) ? 'default' : 'pointer', fontSize: '1.2rem', opacity: pageNumber >= (numPages || 0) ? 0.3 : 1 }}
                    >
                        →
                    </button>
                </div>

                {lines.length > 0 && (
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>
                        Line {Math.max(currentIndex + 1, 0)} of {lines.length}
                        {currentIndex >= 0 && lines[currentIndex] && ` (~${Math.round(getLineDuration(lines[currentIndex].text) / 100) / 10}s)`}
                    </span>
                )}
            </div>

            <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
            >
                <Page
                    pageNumber={pageNumber}
                    onLoadSuccess={onPageLoadSuccess}
                    customTextRenderer={textRenderer}
                />
            </Document>

            <style>{`
                .react-pdf__Page { 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
                    margin-bottom: 2rem; 
                    border-radius: 8px;
                    overflow: hidden;
                    background-color: white;
                }
                mark {
                    background-color: rgba(100, 149, 237, 0.35) !important;
                    color: inherit !important;
                    padding: 0 2px;
                }
            `}</style>
        </div>
    );
}
