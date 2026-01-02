'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from '@/components/header';
import { ChatInterface } from '@/components/chat-interface';

export default function ChatPage() {
    const [sessionId, setSessionId] = useState<string>('');

    useEffect(() => {
        setSessionId(uuidv4());
    }, []);

    return (
        <main className="flex min-h-screen flex-col bg-black selection:bg-white/20">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none" />

            <Header />

            <div className="relative flex-1 flex flex-col items-center px-4 py-8">
                <div className="w-full max-w-4xl space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur overflow-hidden shadow-2xl">
                        <ChatInterface sessionId={sessionId} />
                    </div>
                </div>
            </div>
        </main>
    );
}
