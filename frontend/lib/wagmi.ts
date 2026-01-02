'use client';

import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Base Sepolia configuration for x402 payments
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(), // MetaMask and other injected wallets
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// USDC contract address on Base Sepolia
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// Payment amount in USDC (0.01 USDC = 10000 in 6 decimals)
export const PAYMENT_AMOUNT = BigInt(10000); // 0.01 USDC

// Backend wallet that receives payments
export const PAYEE_ADDRESS = process.env.NEXT_PUBLIC_PAYEE_ADDRESS || '0x84b8a57c65c64066E7dED72D1c8fbE1f71a64dD8';
