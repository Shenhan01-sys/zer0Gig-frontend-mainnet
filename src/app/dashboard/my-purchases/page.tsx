"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { ShoppingBag, ExternalLink, Check, Hourglass, RotateCcw } from "lucide-react";
import { formatEther, type Address } from "viem";
import AppNavbar from "@/components/AppNavbar";
import Footer from "@/components/Footer";
import { CONTRACT_CONFIG } from "@/lib/contracts";
import {
  useCompleteTransfer,
  useCompleteClone,
  useRefundExpired,
  type MarketplaceOrder,
} from "@/hooks/useAgentMarketplace";

const SCAN = "https://chainscan.0g.ai";

export default function MyPurchasesPage() {
  const { authenticated, user, ready } = usePrivy();
  const wallet = (user?.wallet?.address ?? "").toLowerCase() as Address;

  const { data: orderIds, refetch: refetchIds } = useReadContract({
    address: CONTRACT_CONFIG.AgentMarketplace.address as Address,
    abi:     CONTRACT_CONFIG.AgentMarketplace.abi,
    functionName: "getBuyerOrders",
    args: wallet ? [wallet] : undefined,
    query: { enabled: !!wallet },
  });

  return (
    <main className="min-h-screen flex flex-col bg-[#050810]">
      <AppNavbar />

      <div className="flex-1 pt-28 pb-16 px-6 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[12px] text-white/55 mb-4 font-mono uppercase tracking-widest">
            <ShoppingBag className="w-3.5 h-3.5" />
            My Purchases
          </div>
          <h1 className="text-4xl font-medium text-white mb-2">Agents You&apos;ve Bought</h1>
          <p className="text-white/55 text-[14px]">Track pending settlements and refunds.</p>
        </motion.div>

        {!ready || !authenticated ? (
          <Empty>Connect wallet to view your purchases.</Empty>
        ) : !orderIds || (orderIds as bigint[]).length === 0 ? (
          <Empty>
            No purchases yet.{" "}
            <Link href="/marketplace/agents-for-sale" className="text-white underline hover:no-underline">
              Browse marketplace
            </Link>
          </Empty>
        ) : (
          <div data-tour-id="purchases-list" className="space-y-3">
            {(orderIds as bigint[]).slice().reverse().map(oid => (
              <BuyerOrderRow key={oid.toString()} orderId={oid} buyerWallet={wallet} onMutate={refetchIds} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

function BuyerOrderRow({ orderId, buyerWallet, onMutate }: { orderId: bigint; buyerWallet: Address; onMutate: () => void }) {
  const { data: order, refetch } = useReadContract({
    address: CONTRACT_CONFIG.AgentMarketplace.address as Address,
    abi:     CONTRACT_CONFIG.AgentMarketplace.abi,
    functionName: "getOrder",
    args: [orderId],
  });

  // Also read AgentRegistry.ownerOf(agentId) so we know if seller already iTransferred
  const o = order as MarketplaceOrder | undefined;
  const { data: currentOwner } = useReadContract({
    address: CONTRACT_CONFIG.AgentRegistry.address as Address,
    abi:     CONTRACT_CONFIG.AgentRegistry.abi,
    functionName: "ownerOf",
    args: o ? [o.agentId] : undefined,
    query: { enabled: !!o },
  });

  const { completeTransfer, isPending: completing } = useCompleteTransfer();
  const { completeClone,    isPending: completingClone } = useCompleteClone();
  const { refundExpired,    isPending: refunding } = useRefundExpired();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!o) return <div className="h-16 rounded-2xl border border-white/10 bg-[#0d1525]/90 animate-pulse" />;

  const isPending  = o.status === 0;
  const isSettled  = o.status === 1;
  const isRefunded = o.status === 2;
  const isTransferMode = o.mode === 0;
  const transferAlreadyDone =
    isTransferMode &&
    currentOwner != null &&
    String(currentOwner).toLowerCase() === buyerWallet.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const expired = isPending && Number(o.expiresAt) < now;

  const statusBadge =
    isSettled  ? { text: "Settled",   cls: "text-emerald-300 border-emerald-400/40 bg-emerald-400/[0.06]" } :
    isRefunded ? { text: "Refunded",  cls: "text-white/40 border-white/10 bg-white/[0.02]" } :
    expired    ? { text: "Expired",   cls: "text-white/55 border-white/15 bg-white/[0.04]" } :
                 { text: "Pending",   cls: "text-white/75 border-white/20 bg-white/[0.05]" };

  async function onComplete() {
    setError(null);
    setBusy(true);
    try {
      if (isTransferMode) await completeTransfer(orderId);
      else                  await completeClone(orderId, o!.finalAgentId);
      // Notify Supabase to mark listing as sold (best-effort, non-blocking)
      try {
        await fetch("/api/marketplace/mark-sold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId:        Number(orderId),
            buyerAddress:   buyerWallet,
            agentId:        Number(o!.agentId),
            sellerAddress:  o!.seller.toLowerCase(),
            finalAgentId:   Number(o!.finalAgentId),
          }),
        });
      } catch {}
      await refetch();
      onMutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Settlement failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRefund() {
    setError(null);
    setBusy(true);
    try {
      await refundExpired(orderId);
      await refetch();
      onMutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-white/35">Order #{orderId.toString()}</span>
            <span className={`text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded border ${statusBadge.cls}`}>
              {statusBadge.text}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded border border-white/10 text-white/45 bg-white/[0.02]">
              {isTransferMode ? "TRANSFER" : "CLONE"}
            </span>
          </div>
          <p className="text-white font-medium text-[14px]">
            Agent #{o.agentId.toString()} — {formatEther(o.amountWei)} OG
          </p>
          <p className="text-white/35 text-[11px] font-mono mt-0.5">
            Seller: {o.seller.slice(0, 6)}…{o.seller.slice(-4)}
            {isPending && !expired && ` · expires ${new Date(Number(o.expiresAt) * 1000).toLocaleString()}`}
          </p>
        </div>
        <a
          href={`${SCAN}/address/${CONTRACT_CONFIG.AgentMarketplace.address}`}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-lg border border-white/10 hover:border-white/25 transition-colors text-white/45 hover:text-white"
          title="View contract on explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {isPending && (
        <>
          {transferAlreadyDone ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] px-4 py-3 mb-3">
              <p className="text-emerald-300 text-[12px] font-medium inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Seller has transferred the agent. Click below to release payment + claim ownership.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#050810]/60 px-4 py-3 mb-3">
              <p className="text-white/55 text-[12px] inline-flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5" />
                Waiting for seller to execute {isTransferMode ? "iTransfer" : "iClone"} on AgentRegistry.
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {(transferAlreadyDone || !isTransferMode) && (
              <button
                onClick={onComplete}
                disabled={busy || completing || completingClone}
                className="px-4 py-2 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {busy ? "Settling…" : "Release Payment"}
              </button>
            )}
            {expired && (
              <button
                onClick={onRefund}
                disabled={busy || refunding}
                className="px-4 py-2 rounded-full border border-white/15 hover:border-white/30 text-white/80 hover:text-white text-[13px] font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {busy ? "Refunding…" : "Refund expired"}
              </button>
            )}
          </div>

          {error && <p className="text-red-300 text-[12px] mt-2">{error}</p>}
        </>
      )}

      {isSettled && (
        <p className="text-white/55 text-[12px]">
          Final agent id: <span className="font-mono text-white">{o.finalAgentId.toString()}</span>
        </p>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-14 text-center text-white/55 text-[14px]">
      {children}
    </div>
  );
}
