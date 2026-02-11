'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFile } from '@/context/FileContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Book {
    _id: string;
    title: string;
    s3Url: string;
    coverImageUrl?: string;
    createdAt: string;
}

export default function LibraryPage() {
    const { token, user, isLoading: authLoading } = useAuth();
    const { setFile } = useFile();
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!token) return;

        const fetchBooks = async () => {
            try {
                const response = await fetch('http://localhost:3500/books', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setBooks(data);
                }
            } catch (err) {
                console.error("Failed to fetch books", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBooks();
    }, [token]);

    const handleOpenBook = async (book: Book) => {
        try {
            // Fetch the file and convert to File object or just use URL if ReadingMachine supports it
            const response = await fetch(book.s3Url);
            const blob = await response.blob();
            const file = new File([blob], `${book.title}.pdf`, { type: 'application/pdf' });
            setFile(file);
            router.push(`/reading?bookId=${book._id}`);
        } catch (err) {
            console.error("Failed to open book", err);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6">
            <div className="max-w-6xl mx-auto space-y-12">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Library</h1>
                        <p className="text-slate-500 font-medium">Continue where you left off</p>
                    </div>
                    <Link
                        href="/upload"
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        + Upload New
                    </Link>
                </header>

                {books.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 space-y-6">
                        <div className="text-6xl">📚</div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">Your shelf is empty</h2>
                            <p className="text-slate-500">Upload your first PDF to begin your sensory reading journey.</p>
                        </div>
                        <Link
                            href="/upload"
                            className="inline-block px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                        >
                            Get Started
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {books.map((book) => (
                            <div
                                key={book._id}
                                onClick={() => handleOpenBook(book)}
                                className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

                                <div className="relative space-y-4">
                                    {book.coverImageUrl ? (
                                        <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                                            <img
                                                src={book.coverImageUrl}
                                                alt={book.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                                            PDF
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900 line-clamp-2 leading-tight">
                                            {book.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                                            Added {new Date(book.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="pt-4 flex items-center text-indigo-600 font-bold space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span>Read Now</span>
                                        <span>→</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
