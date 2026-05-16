"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { formatOG, formatRelativeTime } from "@/lib/utils";

interface DrainHistoryProps {
  subscriptionId: bigint;
}

interface DrainEntry {
  type: "check-in" | "alert";
  amount: bigint;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export default function DrainHistory({ subscriptionId }: DrainHistoryProps) {
  const publicClient = usePublicClient();
  const [entries, setEntries] = useState<DrainEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!publicClient) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      setError(false);

      try {
        // FIX: Use a reasonable block window instead of "earliest" to avoid RPC rate limits
        // 0G testnet started ~March 2026, use last 50000 blocks as reasonable window
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - BigInt(50000) > 0n
          ? currentBlock - BigInt(50000)
          : 0n;

        // ABI must match the deployed SubscriptionEscrow exactly:
        //   event CheckInDrained(uint256 indexed subscriptionId, uint256 indexed agentId, uint96 amount, uint64 timestamp);
        //   event AlertFired(uint256 indexed subscriptionId, uint256 indexed agentId, uint64 timestamp, bytes alertData, uint96 amountDrained);
        // Without `indexed` viem can't filter by topic and `args.subscriptionId` is silently dropped.
        const [checkInLogs, alertLogs] = await Promise.all([
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.SubscriptionEscrow as `0x${string}`,
            event: parseAbiItem(
              "event CheckInDrained(uint256 indexed subscriptionId, uint256 indexed agentId, uint96 amount, uint64 timestamp)"
            ),
            args: { subscriptionId },
            fromBlock,
          }),
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.SubscriptionEscrow as `0x${string}`,
            event: parseAbiItem(
              "event AlertFired(uint256 indexed subscriptionId, uint256 indexed agentId, uint64 timestamp, bytes alertData, uint96 amountDrained)"
            ),
            args: { subscriptionId },
            fromBlock,
          }),
        ]);

        // Merge and sort by block timestamp descending
        const drainEntries: DrainEntry[] = [
          ...checkInLogs.map((l) => ({
            type: "check-in" as const,
            amount: (l.args.amount as bigint) ?? 0n,
            timestamp: Number((l.args.timestamp as bigint) ?? 0n),
            txHash: l.transactionHash ?? "",
            blockNumber: Number(l.blockNumber),
          })),
          ...alertLogs.map((l) => ({
            type: "alert" as const,
            amount: (l.args.amountDrained as bigint) ?? 0n,
            timestamp: Number((l.args.timestamp as bigint) ?? 0n),
            txHash: l.transactionHash ?? "",
            blockNumber: Number(l.blockNumber),
          })),
        ].sort((a, b) => b.blockNumber - a.blockNumber);

        setEntries(drainEntries);
      } catch (e) {
        console.error("Failed to fetch drain history:", e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [publicClient, subscriptionId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-6">
      <h2 className="text-[13px] font-medium text-white/50 uppercase tracking-wider mb-4">
        Drain History
      </h2>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400/70 text-[13px] text-center py-6">
          Failed to load drain history
        </p>
      ) : entries.length === 0 ? (
        <p className="text-white/30 text-[13px] text-center py-6">
          No drains recorded yet
        </p>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-4 px-3 pb-2 text-[11px] text-white/30 uppercase tracking-wide">
            <span>Type</span>
            <span>Amount</span>
            <span>Time</span>
            <span>Tx</span>
          </div>

          {entries.map((entry, i) => (
            <div
              key={i}
              className="grid grid-cols-4 items-center px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <span
                className={`text-[12px] font-medium ${
                  entry.type === "check-in" ? "text-[#38bdf8]" : "text-amber-400"
                }`}
              >
                {entry.type === "check-in" ? "Check-in" : "Alert"}
              </span>
              <span className="text-white text-[13px]">{formatOG(entry.amount)}</span>
              <span className="text-white/40 text-[12px]">
                {formatRelativeTime(entry.timestamp)}
              </span>
              <a
                href={`https://chainscan.0g.ai/tx/${entry.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#38bdf8]/70 text-[12px] font-mono hover:text-[#38bdf8] transition-colors truncate"
              >
                {entry.txHash?.slice(0, 8)}...
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
