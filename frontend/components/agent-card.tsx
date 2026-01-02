'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Shield, Activity, Database, Cpu, CreditCard, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AgentCard() {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
            {/* Glassmorphism Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/80 backdrop-blur-2xl shadow-2xl">
                {/* Subtle decorative glow - Enhanced for visibility */}
                <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-blue-600/20 blur-[130px] rounded-full pointer-events-none mix-blend-screen" />
                <div className="absolute bottom-0 left-0 h-[600px] w-[600px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen" />

                <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 p-8 md:p-12">

                    {/* Left Column: Media & Primary Actions */}
                    <div className="flex flex-col space-y-8 lg:w-[340px] flex-shrink-0">
                        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-black/20">
                            <Image
                                src="/waifu.png"
                                alt="Phylax Agent"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <h2 className="text-3xl font-bold tracking-tight">Phylax</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <p className="text-sm font-medium text-gray-300">Online & Secure</p>
                                </div>
                            </div>
                        </div>

                        <Link href="/chat" className="w-full">
                            <button className="w-full group relative overflow-hidden rounded-xl bg-white text-black p-4 font-bold shadow-lg shadow-white/5 transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Start Private Chat <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            </button>
                        </Link>

                        <div className="w-full space-y-4 pt-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Trust Models</h3>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-gray-200">Reputation</div>
                                        <div className="text-xs text-gray-500">Verified System</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <Cpu className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-gray-200">TEE Attestation</div>
                                        <div className="text-xs text-gray-500">Hardware Secured</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* Header Info */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Private Medical AI</h1>
                                </div>
                                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0 ml-4">
                                    <Activity className="h-7 w-7 text-blue-400" />
                                </div>
                            </div>
                            <p className="text-lg md:text-xl text-gray-400 leading-relaxed font-light max-w-2xl">
                                A privacy-preserving medical AI assistant tailored for secure healthcare interactions.
                                Powered by <span className="text-white font-normal">nilAI</span> private inference and <span className="text-white font-normal">nilDB</span> encrypted storage.
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-12">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors group">
                                <div className="mb-4 text-gray-500 group-hover:text-purple-400 transition-colors"><Database className="h-7 w-7" /></div>
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Storage</div>
                                <div className="text-lg font-semibold text-gray-200">Encrypted nilDB</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors group">
                                <div className="mb-4 text-gray-500 group-hover:text-blue-400 transition-colors"><Cpu className="h-7 w-7" /></div>
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Inference</div>
                                <div className="text-lg font-semibold text-gray-200">Secure TEE</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors group">
                                <div className="mb-4 text-gray-500 group-hover:text-green-400 transition-colors"><CreditCard className="h-7 w-7" /></div>
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Payment</div>
                                <div className="text-lg font-semibold text-gray-200">x402 Micropay</div>
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="mb-12">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">Capabilities</h3>
                            <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xl font-medium text-white">Medical Chat Analysis</span>
                                    <span className="text-xs font-bold px-3 py-1 rounded bg-white/10 text-white border border-white/10">v1.0.0</span>
                                </div>
                                <p className="text-base text-gray-400 mb-6 leading-relaxed max-w-3xl">
                                    Advanced medical question answering capability with strict privacy guarantees. No data leaves the secure enclave unencrypted.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {["medical", "health", "privacy", "tee-sgx", "nillion"].map(tag => (
                                        <span key={tag} className="text-xs font-medium text-gray-400 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-default">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Integration Details Box - Order: ID -> Owner -> DID -> Scan -> IPFS */}
                        <div className="mt-auto">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">Network Integration</h3>

                            <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                                {/* Agent ID */}
                                <div className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <span className="w-16 md:w-20 text-xs font-bold text-gray-600 uppercase flex-shrink-0">Agent ID</span>
                                    <span className="text-sm text-white font-mono flex-1">7390</span>
                                </div>

                                {/* Owner */}
                                <div className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <span className="w-16 md:w-20 text-xs font-bold text-gray-600 uppercase flex-shrink-0">Owner</span>
                                    <code className="text-sm text-gray-400 font-mono flex-1 truncate">0xbcc20289c1e438b14c823be0963e563456b643c2</code>
                                    <button
                                        onClick={() => copyToClipboard("0xbcc20289c1e438b14c823be0963e563456b643c2")}
                                        className="p-1.5 rounded bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-gray-300"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* DID */}
                                <div className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <span className="w-16 md:w-20 text-xs font-bold text-gray-600 uppercase flex-shrink-0">DID</span>
                                    <code className="text-sm text-blue-400 font-mono flex-1 truncate">did:nil:02e21a8f257fe39c8ecc82c929ced05ee4692d5763de2d382a63a3e6e645d05cec</code>
                                    <button
                                        onClick={() => copyToClipboard("did:nil:02e21a8f257fe39c8ecc82c929ced05ee4692d5763de2d382a63a3e6e645d05cec")}
                                        className="p-1.5 rounded bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-gray-300"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Scan URL */}
                                <div className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <span className="w-16 md:w-20 text-xs font-bold text-gray-600 uppercase flex-shrink-0">Scan</span>
                                    <a
                                        href="https://www.8004scan.io/sepolia/agent/7390"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-400 font-mono flex-1 hover:underline flex items-center gap-2 truncate"
                                    >
                                        8004.scan/agent/7390 <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
                                    </a>
                                </div>

                                {/* IPFS URI */}
                                <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group">
                                    <span className="w-16 md:w-20 text-xs font-bold text-gray-600 uppercase flex-shrink-0">URI</span>
                                    <a
                                        href="https://ipfs.io/ipfs/QmRyvsv8R99fg891RDQmBufZCCoFAxz1J8ucHh3kvx8RGn"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-gray-500 font-mono flex-1 hover:text-blue-400 hover:underline truncate"
                                    >
                                        ipfs://QmRyvsv8R99fg891RDQmBufZCCoFAxz1J8ucHh3kvx8RGn
                                    </a>
                                    <button
                                        onClick={() => copyToClipboard("ipfs://QmRyvsv8R99fg891RDQmBufZCCoFAxz1J8ucHh3kvx8RGn")}
                                        className="p-1.5 rounded bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-gray-300"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
