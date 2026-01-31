'use client'

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import PDFUploader from './PDFUploader';

// Dynamically import the PDF viewer with SSR disabled
const PDFViewer = dynamic(() => import('./PDFViewer'), {
    ssr: false,
    loading: () => <p>Loading PDF viewer...</p>
});

export default function Test() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [searchText, setSearchText] = useState('');

    function onChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSearchText(event.target.value);
    }

    return (
        <div style={{ padding: '2rem' }}>
            <PDFUploader onFileSelect={setPdfFile} />

            {pdfFile ? (
                <>
                    <PDFViewer file={pdfFile} searchText={searchText} />
                    <div style={{ marginTop: '1rem' }}>
                        <label htmlFor="search">Search: </label>
                        <input
                            type="search"
                            id="search"
                            value={searchText}
                            onChange={onChange}
                        />
                    </div>
                </>
            ) : (
                <p style={{ color: '#666' }}>No PDF loaded. Click the button above to select a PDF file.</p>
            )}
        </div>
    );
}