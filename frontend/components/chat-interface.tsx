'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Send,
  Loader2,
  Heart,
  Lock,
  AlertCircle,
  CreditCard,
  User,
  Bot,
  Wallet,
  CheckCircle,
  Sparkles,
  Activity
} from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useWalletClient, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { type Hex, toHex } from 'viem';

// x402 Payment Configuration - Kept same logic, updated UI styles
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
] as const;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PaymentRequirement {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name: string;
    version: string;
  };
}

interface X402PaymentInfo {
  x402Version: number;
  error: string;
  resource: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepts: PaymentRequirement[];
}

interface ChatInterfaceProps {
  sessionId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const USE_FREE_ENDPOINT = false;

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<X402PaymentInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConnect = async () => {
    try {
      connect({ connector: injected() });
    } catch (err) {
      setError('Failed to connect wallet.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const messageContent = input.trim();
    await sendMessage(messageContent);
  };

  const sendMessage = async (messageContent: string, paymentHeader?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    if (!paymentHeader) {
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
    }

    setIsLoading(true);
    setError(null);
    setPaymentRequired(false);
    setPaymentStatus('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (paymentHeader) headers['PAYMENT-SIGNATURE'] = paymentHeader;

      const endpoint = USE_FREE_ENDPOINT ? `${API_URL}/api/chat/free` : `${API_URL}/api/chat`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: messageContent, sessionId }),
      });

      if (response.status === 402) {
        const paymentRequiredHeader = response.headers.get('payment-required') ||
          response.headers.get('Payment-Required') ||
          response.headers.get('x-payment-required');

        if (paymentRequiredHeader) {
          try {
            setPaymentInfo(JSON.parse(atob(paymentRequiredHeader)));
          } catch (e) {
            console.error(e);
          }
        } else {
          // Fallback default
          setPaymentInfo({
            x402Version: 2,
            error: 'Payment required',
            resource: { url: `${API_URL}/api/chat`, description: 'Query', mimeType: 'application/json' },
            accepts: [{
              scheme: 'exact',
              network: 'eip155:84532',
              amount: '10000',
              asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              payTo: '0xD202eAD5640e3b6FaF1e458649358c6Bca8e089c',
              maxTimeoutSeconds: 300,
              extra: { name: 'USDC', version: '2' }
            }]
          });
        }
        setPendingMessage(messageContent);
        setPaymentRequired(true);
        setError('Payment required to continue.');
        return;
      }

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setPendingMessage(null);
      setPaymentInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!isConnected || !address || !pendingMessage || !walletClient || !publicClient || !paymentInfo) {
      setError('Please connect wallet and ensure requirements met');
      return;
    }

    const paymentReq = paymentInfo.accepts[0];
    setIsLoading(true);
    setPaymentStatus('Processing payment...');

    try {
      const amount = BigInt(paymentReq.amount);
      const payTo = paymentReq.payTo as Hex;
      const asset = paymentReq.asset as Hex;

      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      });

      if (balance < amount) throw new Error('Insufficient USDC balance');

      setPaymentStatus('Please sign in wallet...');
      const now = Math.floor(Date.now() / 1000);
      const validAfter = (now - 600).toString();
      const validBefore = (now + (paymentReq.maxTimeoutSeconds || 300)).toString();
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);
      const nonce = toHex(nonceBytes);

      const tokenName = paymentReq.extra?.name || 'USDC';
      const tokenVersion = paymentReq.extra?.version || '2';
      const chainId = parseInt(paymentReq.network.split(':')[1]);

      const signature = await walletClient.signTypedData({
        domain: { name: tokenName, version: tokenVersion, chainId, verifyingContract: asset },
        types: {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        },
        primaryType: 'TransferWithAuthorization',
        message: {
          from: address,
          to: payTo,
          value: amount,
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce: nonce as Hex,
        },
      });

      const paymentPayload = {
        x402Version: 2,
        payload: {
          authorization: {
            from: address, to: payTo, value: amount.toString(), validAfter, validBefore, nonce
          },
          signature
        },
        resource: paymentInfo.resource,
        accepted: paymentReq
      };

      setPaymentStatus('Sending payment...');
      await sendMessage(pendingMessage, btoa(JSON.stringify(paymentPayload)));

    } catch (err) {
      console.error(err);
      setError('Payment failed / rejected');
      setIsLoading(false);
    }
  };

  const handleSuggestion = (text: string) => setInput(text);

  return (
    <div className="flex flex-col h-[700px] w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

      {/* Wallet Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 z-10">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
          <span className="text-sm font-medium text-gray-400">
            {isConnected ? (
              <span className="font-mono text-gray-200">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            ) : 'Wallet Disconnected'}
          </span>
        </div>
        {isConnected ? (
          <Button variant="ghost" size="sm" onClick={() => disconnect()} className="text-xs text-gray-500 hover:text-white hover:bg-white/10">
            Disconnect
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleConnect} disabled={isConnecting} className="text-xs border-white/10 bg-white/5 hover:bg-white/10 hover:text-white">
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth z-10" ref={scrollRef}>
        {messages.length === 0 ? (
          <WelcomeMessage onSuggestion={handleSuggestion} />
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
            {isLoading && <TypingIndicator status={paymentStatus} />}
            {error && !paymentRequired && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/30 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {paymentRequired && (
              <PaymentPrompt
                isConnected={isConnected}
                onConnect={handleConnect}
                onPay={handlePayment}
                isLoading={isLoading}
                isConnecting={isConnecting}
                paymentInfo={paymentInfo}
                status={paymentStatus}
              />
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-black/20 z-10">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your health..."
              disabled={isLoading}
              className="relative bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-blue-500/50 rounded-xl py-6 pl-4 pr-12 shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        <div className="text-center mt-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">End-to-End Encrypted TEE Session</p>
        </div>
      </div>
    </div>
  );
}

function WelcomeMessage({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
      <div className="relative">
        <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
        <div className="relative h-24 w-24 flex items-center justify-center rounded-full bg-black/40 border-2 border-white/20 shadow-2xl backdrop-blur-md">
          <Activity className="h-10 w-10 text-white" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Private Medical AI</h2>
        <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
          Secure, private, and always available. Your health usage data never leaves the secure enclave.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg px-4">
        {[
          'What are symptoms of seasonal allergies?',
          'How can I improve my sleep quality?',
          'Tips for managing daily stress',
          'Remedies for a mild headache'
        ].map((text, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(text)}
            className="text-sm text-left px-5 py-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-gray-300 hover:text-white"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center border shadow-lg ${isUser
          ? 'bg-blue-600 border-blue-500/30'
          : 'bg-black border-white/10'
          }`}>
          {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-blue-400" />}
        </div>
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[80%] rounded-2xl px-6 py-4 shadow-lg ${isUser
        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
        : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-sm'
        }`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed tracking-wide">{message.content}</p>
        <span className={`text-[10px] absolute bottom-1 ${isUser ? 'left-2 text-blue-200/50' : 'right-2 text-gray-600'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator({ status }: { status?: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 mt-1">
        <div className="h-8 w-8 rounded-full bg-black border border-white/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-blue-400" />
        </div>
      </div>
      <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-6 py-4 flex items-center gap-3">
        {status ? (
          <>
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            <span className="text-xs text-blue-300">{status}</span>
          </>
        ) : (
          <div className="flex space-x-1">
            <div className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce"></div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentPrompt({ isConnected, onConnect, onPay, isLoading, isConnecting, paymentInfo, status }: any) {
  // Basic wrapper to keep the same logic but styled darker
  return (
    <div className="mx-auto max-w-sm w-full p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 to-black border border-amber-900/50 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <CreditCard className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-500">Payment Required</h4>
          <p className="text-xs text-amber-500/60">Micropayment via x402</p>
        </div>
      </div>

      {status && (
        <div className="mb-4 text-xs text-blue-400 bg-blue-500/10 p-2 rounded border border-blue-500/20 text-center">
          {status}
        </div>
      )}

      {!isConnected ? (
        <Button onClick={onConnect} disabled={isConnecting} className="w-full bg-amber-600 hover:bg-amber-500 text-white border-none">
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      ) : (
        <Button onClick={onPay} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white border-none">
          {isLoading ? 'Processing...' : 'Authorize Payment'}
        </Button>
      )}
    </div>
  );
}
