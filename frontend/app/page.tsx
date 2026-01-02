'use client';

import { Header } from '@/components/header';
import { AgentCard } from '@/components/agent-card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black selection:bg-white/20">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none" />

      <Header />

      <div className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <AgentCard />
      </div>

      <footer className="relative py-6 text-center text-sm text-gray-600 border-t border-white/5 bg-black">
        <p>
          Powered by{' '}
          <a
            href="https://nillion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Nillion
          </a>
          {' • '}
          <span className="text-gray-700">nilAI + nilDB + x402</span>
        </p>
      </footer>
    </main>
  );
}
