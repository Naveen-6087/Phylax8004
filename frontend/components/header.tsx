'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Cpu } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-6xl">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
              Private Medical AI
            </h1>
            <p className="text-xs text-muted-foreground">
              Secure • Private • TEE-Protected
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <StatusIndicator 
              icon={<Lock className="h-3 w-3" />} 
              label="Encrypted" 
              variant="success" 
            />
            <Separator orientation="vertical" className="h-4" />
            <StatusIndicator 
              icon={<Cpu className="h-3 w-3" />} 
              label="TEE Active" 
              variant="primary" 
            />
          </div>
          
          <a
            href="https://nillion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Badge variant="outline" className="font-normal">
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
  variant 
}: { 
  icon: React.ReactNode; 
  label: string; 
  variant: 'success' | 'primary';
}) {
  const colors = {
    success: 'text-green-500',
    primary: 'text-violet-500',
  };

  const dotColors = {
    success: 'bg-green-500',
    primary: 'bg-violet-500',
  };

  return (
    <div className={`flex items-center space-x-1.5 text-sm ${colors[variant]}`}>
      <span className={`h-2 w-2 rounded-full ${dotColors[variant]} animate-pulse`} />
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </div>
  );
}
