"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ogNewton } from "@/lib/wagmi";

const TARGET_CHAIN_ID = ogNewton.id;
const TARGET_CHAIN_NAME = ogNewton.name;

/**
 * Hard gate that blocks UI when the connected wallet is on the wrong chain.
 * Renders a full-screen modal blocker (not a toast) so users cannot interact
 * with anything that might trigger a transaction until they switch.
 *
 * No-op when wallet is disconnected — Providers/Privy already handles that path.
 */
export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  const [dismissedSwitch, setDismissedSwitch] = useState(false);

  const wrongNetwork = isConnected && chainId !== undefined && chainId !== TARGET_CHAIN_ID;

  return (
    <>
      {children}
      <AnimatePresence>
        {wrongNetwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="network-guard-title"
          >
            {/* Backdrop blur */}
            <div className="absolute inset-0 bg-[#050810]/80 backdrop-blur-md" aria-hidden />

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
              className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0d1525] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
            >
              {/* Ambient glow */}
              <div
                className="absolute -top-20 -right-20 w-64 h-40 pointer-events-none opacity-50"
                style={{ background: "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 60%)" }}
                aria-hidden
              />

              <div className="relative">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h2 id="network-guard-title" className="text-white text-[18px] font-medium mb-1.5">
                  Wrong Network
                </h2>
                <p className="text-white/55 text-[13px] leading-relaxed mb-5">
                  zer0Gig only operates on <span className="text-amber-400 font-medium">{TARGET_CHAIN_NAME}</span> (chain ID {TARGET_CHAIN_ID}).
                  Your wallet is currently on chain ID <span className="font-mono text-white/70">{chainId ?? "—"}</span>. Switch to continue.
                </p>

                {error && !dismissedSwitch && (
                  <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 mb-4">
                    <p className="text-red-400 text-[12px]">
                      {error.message?.slice(0, 140) || "Switch failed"}
                    </p>
                    <button
                      onClick={() => setDismissedSwitch(true)}
                      className="text-red-400/60 text-[11px] mt-1 hover:text-red-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setDismissedSwitch(false);
                      switchChain({ chainId: TARGET_CHAIN_ID });
                    }}
                    disabled={isPending}
                    className="w-full px-5 py-3 bg-amber-500 text-black text-[13px] font-medium rounded-full hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                        Switching…
                      </>
                    ) : (
                      <>
                        Switch to {TARGET_CHAIN_NAME}
                      </>
                    )}
                  </button>

                  <p className="text-white/30 text-[11px] text-center mt-1">
                    If your wallet doesn&apos;t prompt, switch manually in MetaMask &rarr; Networks.
                  </p>
                </div>

                {/* Footer: testnet badge */}
                <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-mono">
                    0G Aristotle · Mainnet
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
