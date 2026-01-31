'use client'

import React, { useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { TextItem } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the PDF.js worker (required for react-pdf v10+)
// Use version 5.4.296 to match the API version bundled in react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    file: string | File;
    searchText: string;
}

export default function PDFViewer({ file, searchText }: PDFViewerProps) {
    const textRenderer = useCallback(
        (textItem: TextItem) => {
            if (!searchText) return textItem.str;

            const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

            // Using the requested muted cornflower blue highlight
            return textItem.str.replace(
                regex,
                '<mark style="background-color: rgba(100, 149, 237, 0.3); color: inherit; border-radius: 2px;">$1</mark>'
            );
        },
        [searchText]
    );

    return (
        <div className="pdf-container">
            <style>{`
                .react-pdf__Page {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    margin-bottom: 2rem;
                    border-radius: 8px;
                    overflow: hidden;
                }
                /* Ensure custom styles apply to the mark tag */
                mark {
                    background-color: rgba(100, 149, 237, 0.3) !important;
                    color: inherit !important;
                    border-radius: 2px;
                    padding: 0 2px;
                }
            `}</style>

            <Document
                file={file}
                onLoadError={(error) => console.error('PDF load error:', error)}
            >
                <Page
                    pageNumber={1}
                    customTextRenderer={textRenderer}
                />
            </Document>
        </div>
    );
}
