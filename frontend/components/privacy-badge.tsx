'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Cpu, CreditCard, ShieldCheck } from 'lucide-react';

export function PrivacyBadge() {
  return (
    <Card className="border-violet-500/30 bg-gradient-to-r from-violet-950/50 via-blue-950/50 to-cyan-950/50">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Main Message */}
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <ShieldCheck className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Your privacy is protected</p>
              <p className="text-sm text-muted-foreground">
                All conversations are encrypted and processed in a secure TEE
              </p>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="flex items-center gap-2">
            <TechBadge 
              icon={<Lock className="h-3.5 w-3.5" />} 
              label="nilDB" 
              description="Encrypted" 
            />
            <TechBadge 
              icon={<Cpu className="h-3.5 w-3.5" />} 
              label="nilAI" 
              description="TEE" 
            />
            <TechBadge 
              icon={<CreditCard className="h-3.5 w-3.5" />} 
              label="x402" 
              description="Pay" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TechBadge({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Badge 
      variant="secondary" 
      className="flex flex-col items-center gap-0.5 py-2 px-3 h-auto bg-background/50 hover:bg-background/70 transition-colors cursor-default"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground hidden sm:block">{description}</span>
    </Badge>
  );
}
