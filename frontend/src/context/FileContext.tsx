'use client'

import React, { createContext, useContext, useState } from 'react';

interface FileContextType {
    file: File | string | null;
    setFile: (file: File | string | null) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: React.ReactNode }) {
    const [file, setFile] = useState<File | string | null>(null);

    return (
        <FileContext.Provider value={{ file, setFile }}>
            {children}
        </FileContext.Provider>
    );
}

export function useFile() {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFile must be used within a FileProvider');
    }
    return context;
}
