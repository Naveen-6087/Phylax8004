'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from '@/components/header';
import { PrivacyBadge } from '@/components/privacy-badge';
import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      
      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-6">
          <PrivacyBadge />
          <ChatInterface sessionId={sessionId} />
        </div>
      </div>
      
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>
          Powered by{' '}
          <a
            href="https://nillion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Nillion
          </a>
          {' • '}
          <span className="text-muted-foreground/70">nilAI + nilDB + x402</span>
        </p>
      </footer>
    </main>
  );
}
