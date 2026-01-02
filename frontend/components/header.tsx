'use client';

import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-20 items-center justify-between px-6 mx-auto max-w-7xl">
        {/* Logo & Title */}
        <div className="flex items-center space-x-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Private Medical AI
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Privacy-First Healthcare Intelligence
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="flex items-center space-x-4 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5">
            <StatusIndicator
              icon={<Lock className="h-3 w-3" />}
              label="Encrypted"
              active
            />
            <div className="h-3 w-[1px] bg-white/10"></div>
            <StatusIndicator
              icon={<Cpu className="h-3 w-3" />}
              label="TEE Secured"
              active
            />
          </div>

          <a
            href="https://nillion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Badge variant="outline" className="h-9 px-4 font-normal bg-transparent border-white/10 text-gray-400 group-hover:text-white group-hover:border-white/20 transition-all">
              Powered by Nillion
            </Badge>
          </a>
        </div>
      </div>
    </header>
  );
}

function StatusIndicator({
  icon,
  label,
  active
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div className={cn("flex items-center space-x-2 text-sm transition-colors", active ? "text-gray-200" : "text-gray-500")}>
      <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]", active ? "bg-green-500" : "bg-gray-700")} />
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {label}
      </span>
    </div>
  );
}
