'use client'

import React, { useRef } from 'react';

interface PDFUploaderProps {
    onFileSelect: (file: File) => void;
}

export default function PDFUploader({ onFileSelect }: PDFUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log('File selected:', file.name, file.type);
            // Check for PDF by MIME type or file extension
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                onFileSelect(file);
            } else {
                console.warn('Selected file is not a PDF:', file.type);
            }
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button
                onClick={handleClick}
                style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                }}
            >
                Load PDF from Device
            </button>
        </div>
    );
}
