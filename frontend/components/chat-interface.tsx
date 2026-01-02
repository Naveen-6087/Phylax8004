'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
  CheckCircle
} from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useWalletClient, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { type Hex, toHex } from 'viem';
import { baseSepolia } from 'wagmi/chains';

// x402 Payment Configuration
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// ERC20 ABI for balanceOf
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

// Set to false to use x402 payments (requires wallet connection)
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle wallet connection
  const handleConnect = async () => {
    console.log('[INFO] Attempting to connect wallet...');
    try {
      connect({ connector: injected() });
    } catch (err) {
      console.error('[ERROR] Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please make sure MetaMask is installed.');
    }
  };

  // Log wallet connection status
  useEffect(() => {
    if (isConnected && address) {
      console.log('[INFO] Wallet connected:', address);
    }
  }, [isConnected, address]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    console.log('[INFO] Sending message:', messageContent);
    await sendMessage(messageContent);
  };

  // Send message to API
  const sendMessage = async (messageContent: string, paymentHeader?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    // Only add to messages if not a retry with payment
    if (!paymentHeader) {
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
    }
    
    setIsLoading(true);
    setError(null);
    setPaymentRequired(false);
    setPaymentStatus('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add payment header if we have one
      if (paymentHeader) {
        headers['PAYMENT-SIGNATURE'] = paymentHeader;
        console.log('[INFO] Sending with PAYMENT-SIGNATURE header');
      }

      // Choose endpoint based on configuration
      const endpoint = USE_FREE_ENDPOINT 
        ? `${API_URL}/api/chat/free` 
        : `${API_URL}/api/chat`;
      
      console.log('[INFO] Making API request to:', endpoint);
      console.log('[DEBUG] Using free endpoint:', USE_FREE_ENDPOINT);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageContent,
          sessionId,
        }),
      });

      console.log('[INFO] Response status:', response.status);

      // Handle x402 payment required
      if (response.status === 402) {
        console.log('[INFO] Payment required (402)');
        
        // Log all response headers for debugging
        console.log('[DEBUG] All response headers:');
        response.headers.forEach((value, key) => {
          console.log(`   ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        });
        
        // Try multiple header name variations
        const paymentRequiredHeader = 
          response.headers.get('payment-required') || 
          response.headers.get('Payment-Required') ||
          response.headers.get('x-payment-required');
        
        console.log('[DEBUG] Payment-Required header found:', !!paymentRequiredHeader);
        
        if (paymentRequiredHeader) {
          try {
            const decoded = JSON.parse(atob(paymentRequiredHeader)) as X402PaymentInfo;
            console.log('[DEBUG] Decoded payment info:', decoded);
            setPaymentInfo(decoded);
          } catch (decodeErr) {
            console.error('[ERROR] Failed to decode payment header:', decodeErr);
          }
        } else {
          // Try to get payment info from the response body as fallback
          try {
            const responseText = await response.text();
            console.log('[DEBUG] Response body:', responseText);
            
            // Try parsing as JSON - the x402 middleware might include it in body
            if (responseText && responseText.length > 2) {
              const bodyData = JSON.parse(responseText);
              if (bodyData.accepts || bodyData.x402Version) {
                console.log('[DEBUG] Found payment info in response body');
                setPaymentInfo(bodyData as X402PaymentInfo);
              }
            }
          } catch (bodyErr) {
            console.error('[ERROR] Could not parse response body:', bodyErr);
          }
        }
        
        // Set a default payment info if we couldn't get it from headers/body
        if (!paymentInfo) {
          console.log('[WARN] Using default payment info');
          setPaymentInfo({
            x402Version: 2,
            error: 'Payment required',
            resource: {
              url: `${API_URL}/api/chat`,
              description: 'Private Medical AI Query',
              mimeType: 'application/json'
            },
            accepts: [{
              scheme: 'exact',
              network: 'eip155:84532',
              amount: '10000', // 0.01 USDC (6 decimals)
              asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              payTo: '0xD202eAD5640e3b6FaF1e458649358c6Bca8e089c',
              maxTimeoutSeconds: 300,
              extra: { name: 'USDC', version: '2' }
            }]
          });
        }
        
        setPendingMessage(messageContent);
        setPaymentRequired(true);
        setError('Payment required to continue. Please authorize the payment.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ERROR] API error:', errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      console.log('[SUCCESS] Received response:', data);

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
      console.error('[ERROR] Chat error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment authorization - uses EIP-3009 transferWithAuthorization signature
  const handlePayment = async () => {
    if (!isConnected || !address || !pendingMessage || !walletClient || !publicClient) {
      console.error('[ERROR] Missing requirements for payment:', { 
        isConnected, 
        address, 
        pendingMessage: !!pendingMessage, 
        walletClient: !!walletClient,
        publicClient: !!publicClient
      });
      setError('Please connect your wallet first');
      return;
    }

    if (!paymentInfo || paymentInfo.accepts.length === 0) {
      console.error('[ERROR] No payment info available');
      setError('Payment information not available');
      return;
    }

    const paymentReq = paymentInfo.accepts[0];
    console.log('[INFO] Processing payment:', paymentReq);

    setIsLoading(true);
    setError(null);
    setPaymentStatus('Checking USDC balance...');

    try {
      // Parse payment amount (USDC has 6 decimals)
      const amount = BigInt(paymentReq.amount);
      const payTo = paymentReq.payTo as Hex;
      const asset = paymentReq.asset as Hex;
      
      console.log('[INFO] Payment details:', {
        amount: amount.toString(),
        payTo,
        asset
      });

      // Check USDC balance first
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      
      console.log('[INFO] USDC Balance:', balance.toString());
      
      if (balance < amount) {
        throw new Error(`Insufficient USDC balance. You have ${Number(balance) / 1e6} USDC but need ${Number(amount) / 1e6} USDC`);
      }

      // Create EIP-3009 authorization for transferWithAuthorization
      setPaymentStatus('Please sign the payment authorization in MetaMask...');
      
      const now = Math.floor(Date.now() / 1000);
      const validAfter = (now - 600).toString(); // 10 minutes before
      const validBefore = (now + (paymentReq.maxTimeoutSeconds || 300)).toString();
      
      // Create nonce like x402 SDK does
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);
      const nonce = toHex(nonceBytes);
      
      // Get EIP-712 domain parameters from payment requirements
      const tokenName = paymentReq.extra?.name || 'USDC';
      const tokenVersion = paymentReq.extra?.version || '2';
      const chainId = parseInt(paymentReq.network.split(':')[1]);
      
      // EIP-712 typed data for USDC transferWithAuthorization (EIP-3009)
      const domain = {
        name: tokenName,
        version: tokenVersion,
        chainId: chainId,
        verifyingContract: asset,
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };

      const message = {
        from: address,
        to: payTo,
        value: amount,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce: nonce as Hex,
      };

      console.log('[INFO] Signing EIP-3009 authorization...');
      console.log('[DEBUG] Domain:', domain);
      console.log('[DEBUG] Message:', {
        ...message,
        value: message.value.toString(),
        validAfter: message.validAfter.toString(),
        validBefore: message.validBefore.toString(),
      });
      
      // Sign the typed data
      const signature = await walletClient.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message,
      });

      console.log('[SUCCESS] Signature obtained:', signature.substring(0, 20) + '...');

      // Create x402 payment payload matching SDK format exactly
      const authorization = {
        from: address,
        to: payTo,
        value: amount.toString(),
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      // The x402 v2 format requires 'accepted' field with the full payment requirements
      const paymentPayload = {
        x402Version: 2,
        payload: {
          authorization: authorization,
          signature: signature,
        },
        // Include resource from payment info
        resource: paymentInfo?.resource || {
          url: `${API_URL}/api/chat`,
          description: 'Private Medical AI Query',
          mimeType: 'application/json'
        },
        // The 'accepted' field is REQUIRED - contains the selected payment requirements
        accepted: paymentReq
      };

      const paymentHeader = btoa(JSON.stringify(paymentPayload));
      console.log('[INFO] Payment header created');
      console.log('[DEBUG] Payment payload:', JSON.stringify(paymentPayload, null, 2));

      // Retry the request with payment authorization
      setPaymentStatus('Sending request with payment...');
      setPaymentRequired(false);
      await sendMessage(pendingMessage, paymentHeader);
      
    } catch (err) {
      console.error('[ERROR] Payment error:', err);
      setPaymentStatus('');
      
      if (err instanceof Error) {
        if (err.message.includes('rejected') || err.message.includes('denied') || err.message.includes('User rejected')) {
          setError('Signature was rejected by user');
        } else if (err.message.includes('insufficient') || err.message.includes('Insufficient')) {
          setError(err.message);
        } else {
          setError(`Payment failed: ${err.message}`);
        }
      } else {
        setError('Failed to process payment. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Wallet Status Bar */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="h-4 w-4" />
          {isConnected ? (
            <span className="text-green-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          ) : (
            <span className="text-muted-foreground">Not connected</span>
          )}
        </div>
        {isConnected ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => disconnect()}
            className="text-xs"
          >
            Disconnect
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleConnect}
            disabled={isConnecting}
            className="text-xs"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <WelcomeMessage onSuggestion={handleSuggestion} />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isLoading && <TypingIndicator status={paymentStatus} />}

              {error && !paymentRequired && (
                <Alert variant="destructive" className="mx-auto max-w-md">
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
      </CardContent>

      {/* Input Area */}
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a medical question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            Your message will be encrypted before being sent
          </p>
        </form>
      </CardFooter>
    </Card>
  );
}

function WelcomeMessage({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    'What are symptoms of seasonal allergies?',
    'How can I improve my sleep?',
    'Tips for managing stress',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-500">
        <Heart className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Welcome to Private Medical AI</h2>
        <p className="text-muted-foreground max-w-md">
          Ask any health-related question. Your conversations are encrypted and
          processed in a Trusted Execution Environment for maximum privacy.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((text) => (
          <Button
            key={text}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onSuggestion(text)}
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className={`h-8 w-8 ${isUser ? 'bg-primary' : 'bg-violet-600'}`}>
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-violet-600 text-white'}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator({ status }: { status?: string }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 bg-violet-600">
        <AvatarFallback className="bg-violet-600 text-white">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-2xl px-4 py-3">
        {status ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            {status}
          </p>
        ) : (
          <div className="flex space-x-1">
            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}

interface PaymentPromptProps {
  isConnected: boolean;
  onConnect: () => void;
  onPay: () => void;
  isLoading: boolean;
  isConnecting: boolean;
  paymentInfo: X402PaymentInfo | null;
  status: string;
}

function PaymentPrompt({ isConnected, onConnect, onPay, isLoading, isConnecting, paymentInfo, status }: PaymentPromptProps) {
  const amount = paymentInfo?.accepts[0]?.amount 
    ? (Number(paymentInfo.accepts[0].amount) / 1e6).toFixed(2)
    : '0.01';

  return (
    <Card className="mx-auto max-w-md border-amber-500/30 bg-gradient-to-r from-amber-950/30 to-orange-950/30">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <CreditCard className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-500">Payment Required</p>
            <p className="text-sm text-muted-foreground">
              Each query costs ${amount} USDC on Base Sepolia
            </p>
          </div>
        </div>

        {status && (
          <div className="mt-3 p-2 bg-blue-500/10 rounded-lg">
            <p className="text-xs text-blue-400 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {status}
            </p>
          </div>
        )}
        
        {!isConnected ? (
          <Button 
            className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        ) : (
          <Button 
            className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
            onClick={onPay}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay ${amount} USDC
              </>
            )}
          </Button>
        )}
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          Sign a gasless authorization to pay for this query
        </p>
      </CardContent>
    </Card>
  );
}
