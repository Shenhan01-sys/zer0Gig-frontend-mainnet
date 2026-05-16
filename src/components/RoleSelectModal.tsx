"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegisterUser, UserRole, USER_ROLES } from "@/hooks/useUserRegistry";
import { ogNewton } from "@/lib/wagmi";
import { parseContractError } from "@/lib/utils";

interface RoleSelectModalProps {
  isOpen: boolean;
  onConfirmed: (role: UserRole) => void;
}

export default function RoleSelectModal({ isOpen, onConfirmed }: RoleSelectModalProps) {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const { register, isPending, isConfirming, isConfirmed, error } = useRegisterUser();
  const firedRef = useRef(false);

  // Once tx is confirmed, bubble up to parent — useEffect so it fires once, not on every render
  useEffect(() => {
    if (isConfirmed && selected !== null && !firedRef.current) {
      firedRef.current = true;
      onConfirmed(selected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const handleConfirm = async () => {
    if (selected === null) return;

    // Try to add/switch to 0G Aristotle via window.ethereum (MetaMask / injected wallet).
    // wallet_addEthereumChain sends the full chain spec including "OG" as the currency.
    // Privy embedded wallets don't expose window.ethereum — we skip this and let
    // wagmi handle the chain context automatically.
    const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (eth) {
      setIsSwitching(true);
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x" + ogNewton.id.toString(16),          // 0x40DA
            chainName: ogNewton.name,
            nativeCurrency: ogNewton.nativeCurrency,            // { name:"OG", symbol:"OG", decimals:18 }
            rpcUrls: [ogNewton.rpcUrls.default.http[0]],
            blockExplorerUrls: [ogNewton.blockExplorers?.default.url ?? ""],
          }],
        });
      } catch (e: any) {
        // 4001 = user explicitly rejected — bail out
        if (e?.code === 4001) {
          setIsSwitching(false);
          return;
        }
        // Any other error (already on correct chain, etc.) — proceed anyway
      }
      setIsSwitching(false);
    }

    register(selected === USER_ROLES.FreelancerOwner ? 2 : 1);
  };

  const isLoading = isSwitching || isPending || isConfirming;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1525]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Top gradient bar */}
            <div className="h-1 bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#22d3ee]" />

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#38bdf8]/20 to-[#a855f7]/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">Welcome to zer0Gig</h2>
                <p className="text-white/40 text-[14px]">
                  Choose your role. This will be recorded on-chain and shapes your dashboard experience.
                </p>
              </div>

              {/* Role cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Client */}
                <button
                  onClick={() => setSelected(USER_ROLES.Client)}
                  disabled={isLoading}
                  className={`rounded-2xl border p-5 text-left transition-all duration-200 disabled:opacity-50 ${
                    selected === USER_ROLES.Client
                      ? "border-[#38bdf8]/50 bg-[#38bdf8]/10 shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                      : "border-white/10 bg-[#050810]/60 hover:border-white/20 hover:bg-[#050810]/80"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    selected === USER_ROLES.Client ? "bg-[#38bdf8]/20" : "bg-white/5"
                  }`}>
                    <svg className={`w-5 h-5 ${selected === USER_ROLES.Client ? "text-[#38bdf8]" : "text-white/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className={`text-[15px] font-medium mb-1 ${selected === USER_ROLES.Client ? "text-[#38bdf8]" : "text-white"}`}>
                    Client
                  </h3>
                  <p className="text-[12px] text-white/40 leading-relaxed">
                    Post tasks, hire AI agents, fund escrow, review outputs
                  </p>
                  {selected === USER_ROLES.Client && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#38bdf8]/80">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Selected
                    </div>
                  )}
                </button>

                {/* FreelancerOwner */}
                <button
                  onClick={() => setSelected(USER_ROLES.FreelancerOwner)}
                  disabled={isLoading}
                  className={`rounded-2xl border p-5 text-left transition-all duration-200 disabled:opacity-50 ${
                    selected === USER_ROLES.FreelancerOwner
                      ? "border-[#a855f7]/50 bg-[#a855f7]/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                      : "border-white/10 bg-[#050810]/60 hover:border-white/20 hover:bg-[#050810]/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    selected === USER_ROLES.FreelancerOwner ? "bg-[#a855f7]/20" : "bg-white/5"
                  }`}>
                    <svg className={`w-5 h-5 ${selected === USER_ROLES.FreelancerOwner ? "text-[#a855f7]" : "text-white/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                    </svg>
                  </div>
                  <h3 className={`text-[15px] font-medium mb-1 ${selected === USER_ROLES.FreelancerOwner ? "text-[#a855f7]" : "text-white"}`}>
                    Agent Owner
                  </h3>
                  <p className="text-[12px] text-white/40 leading-relaxed">
                    Register AI agents, set rates, earn autonomously on-chain
                  </p>
                  {selected === USER_ROLES.FreelancerOwner && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#a855f7]/80">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Selected
                    </div>
                  )}
                </button>
              </div>

              {/* On-chain note */}
              <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[12px] text-white/30">
                  Your role is recorded on-chain. One transaction, permanent — you can always use both features.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2.5">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-[13px]">{parseContractError(error)}</p>
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={handleConfirm}
                disabled={selected === null || isLoading}
                className="w-full px-6 py-3.5 bg-white text-black text-[14px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isSwitching ? "Switching to 0G Network..." : isPending ? "Confirm in wallet..." : "Recording on-chain..."}
                  </>
                ) : (
                  selected === null ? "Select a role to continue" : "Confirm & Enter Dashboard"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
