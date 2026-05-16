"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Wallet, FileSignature, ShoppingCart, Hourglass } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { keccak256, toBytes, type Hex } from "viem";
import { useBuyAgent } from "@/hooks/useAgentMarketplace";

interface Listing {
  id: string;
  agent_id: number;
  seller_address: string;
  price_wei: string;
  price_og: number;
  mode: "transfer" | "clone";
  agent_name: string | null;
}

type Step =
  | "review"
  | "generating_keys"
  | "fetching_oracle"
  | "confirming"
  | "waiting_seller"
  | "settled"
  | "error";

export default function BuyAgentModal({
  listing,
  onClose,
  onSuccess,
}: {
  listing: Listing;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const { user } = usePrivy();
  const buyerAddress = (user?.wallet?.address ?? "").toLowerCase();
  const { buyAgent } = useBuyAgent();

  const [step, setStep] = useState<Step>("review");
  const [error, setError] = useState<string | null>(null);
  const [orderTxHash, setOrderTxHash] = useState<string | null>(null);

  const isTransfer = listing.mode === "transfer";

  const handleBuy = async () => {
    setError(null);
    try {
      // ── Step 1: Generate buyer's encryption material ────────────────────
      // In production: generate fresh ECIES keypair, store privately.
      // For demo: derive a deterministic placeholder so the modal flow is
      // demonstrable without forcing the user through a keygen UX.
      setStep("generating_keys");
      const newCapabilityHash = keccak256(
        toBytes(`zerogig-buy-${listing.id}-${buyerAddress}`),
      ) as Hex;
      const newSealedKey = ("0x" + "00".repeat(64)) as Hex; // placeholder until real ECIES wraps

      // ── Step 2: Ask oracle to sign the transferDigest for this buyer ────
      setStep("fetching_oracle");
      const oracleRes = await fetch("/api/oracle/sign-marketplace-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId:           listing.agent_id,
          currentVersion:    1, // TODO: read from AgentRegistry.getAgentProfile.version
          oldCapabilityHash: "0x" + "00".repeat(32),
          newCapabilityHash,
          recipient:         buyerAddress,
        }),
      });
      const oracle = await oracleRes.json();
      if (!oracle.ok) throw new Error(oracle.error ?? "Oracle signature failed");

      // ── Step 3: Buyer pays the marketplace contract ─────────────────────
      setStep("confirming");
      const hash = await buyAgent(
        BigInt(listing.agent_id),
        listing.seller_address as `0x${string}`,
        isTransfer ? 0 : 1,
        newCapabilityHash,
        newSealedKey,
        oracle.signature as Hex,
        BigInt(listing.price_wei),
      );
      if (!hash) throw new Error("Transaction was rejected");
      setOrderTxHash(hash);

      // ── Step 4: Funds escrowed. Seller now executes iTransfer / iClone ──
      setStep("waiting_seller");

      // In production: poll AgentRegistry.ownerOf(agentId) until == buyer
      // (TRANSFER mode) or watch for AgentCloned event (CLONE mode).
      // For now, hand off to the dashboard's "My Purchases" page where the
      // settlement flow continues.
      onSuccess(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buy flow failed");
      setStep("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-md bg-[#0d1525] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <p className="text-white font-semibold text-[15px]">Buy Agent</p>
            <p className="text-white/40 text-[11px] mt-0.5 font-mono">
              {listing.agent_name ?? `Agent #${listing.agent_id}`} · {listing.price_og.toFixed(3)} OG
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-3">
          <StepRow
            icon={<Wallet className="w-4 h-4" />}
            label="Review listing"
            description="Confirm price, seller, and transfer mode"
            state={step === "review" ? "current" : "done"}
          />
          <StepRow
            icon={<FileSignature className="w-4 h-4" />}
            label="Generate encryption keys"
            description="Buyer keys for re-encrypted capability data"
            state={step === "generating_keys" ? "current" : (step === "review" ? "pending" : "done")}
          />
          <StepRow
            icon={<FileSignature className="w-4 h-4" />}
            label="Get oracle attestation"
            description="ECDSA proof from the marketplace oracle"
            state={
              step === "fetching_oracle" ? "current" :
              (["review", "generating_keys"].includes(step) ? "pending" : "done")
            }
          />
          <StepRow
            icon={<ShoppingCart className="w-4 h-4" />}
            label="Pay marketplace contract"
            description={`${listing.price_og.toFixed(3)} OG locked in escrow`}
            state={
              step === "confirming" ? "current" :
              (["review", "generating_keys", "fetching_oracle"].includes(step) ? "pending" : "done")
            }
          />
          <StepRow
            icon={<Hourglass className="w-4 h-4" />}
            label={isTransfer ? "Seller executes iTransfer" : "Seller executes iClone"}
            description="7-day window before refund becomes available"
            state={step === "waiting_seller" ? "current" : (step === "settled" ? "done" : "pending")}
          />
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-red-300 text-[12px]">
              {error}
            </div>
          )}

          {orderTxHash && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3">
              <p className="text-emerald-300 text-[12px] font-medium">Payment locked in escrow</p>
              <a
                href={`https://chainscan.0g.ai/tx/${orderTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-300/70 text-[11px] hover:underline font-mono mt-0.5 inline-block"
              >
                {orderTxHash.slice(0, 10)}…{orderTxHash.slice(-8)} →
              </a>
            </div>
          )}

          <button
            onClick={handleBuy}
            disabled={step !== "review" && step !== "error"}
            className="w-full py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[14px]"
          >
            {step === "review"  ? `Buy for ${listing.price_og.toFixed(3)} OG` :
             step === "error"   ? "Retry" :
             "Processing…"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepRow({
  icon, label, description, state,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  state: "pending" | "current" | "done";
}) {
  const dotColor =
    state === "done"    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" :
    state === "current" ? "bg-cyan-400/15 text-cyan-300 border-cyan-400/50" :
                          "bg-white/[0.03] text-white/30 border-white/10";

  return (
    <div className="flex gap-3 items-start">
      <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${dotColor}`}>
        {state === "done" ? <Check className="w-4 h-4" /> : icon}
      </div>
      <div className="flex-1 pt-1">
        <p className={`text-[13px] font-medium ${state === "pending" ? "text-white/40" : "text-white"}`}>{label}</p>
        <p className="text-[11px] text-white/40 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
