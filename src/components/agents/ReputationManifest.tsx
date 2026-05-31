"use client";

/**
 * ReputationManifest — the agent's verifiable track record, content-hashed.
 *
 * The differentiator: reputation here isn't a number in our database — it's a
 * deterministic manifest derived from on-chain-settled, 0G-Storage-verified
 * work, hashed to a single anchor. That anchor lives in the agent's ERC-7857
 * metadata (V1.5), so when the iNFT is sold or cloned via AgentMarketplace the
 * reputation travels with it. Virtuals / Eliza / OpenClaw have no equivalent.
 */

import { useEffect, useState } from "react";
import { Award, Cpu, FileCheck2, Link2, Copy, Check, BadgeCheck } from "lucide-react";

interface Manifest {
  agentId: number;
  jobsCompleted: number;
  verifiedDeliverables: number;
  onchainSettlements: number;
  models: string[];
  categories: Record<string, number>;
  manifestHash: string;
  displayName: string | null;
  anchor: { standard: string; field: string; status: string };
}

export default function ReputationManifest({ agentId }: { agentId: number }) {
  const [m, setM] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/agent-reputation?agentId=${agentId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setM(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 px-5 py-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
        <span className="text-[11px] text-white/25 font-mono">Building reputation manifest…</span>
      </div>
    );
  }
  if (!m || m.jobsCompleted === 0) return null; // nothing verifiable yet

  const stats = [
    { icon: Award,      label: "Jobs completed",          value: m.jobsCompleted },
    { icon: FileCheck2, label: "Verified on 0G Storage",  value: m.verifiedDeliverables },
    { icon: Link2,      label: "On-chain settlements",    value: m.onchainSettlements },
    { icon: Cpu,        label: "0G models used",          value: m.models.length },
  ];

  const copy = () => {
    navigator.clipboard.writeText(m.manifestHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[#A78BFA]" />
          <h3 className="text-[13px] font-medium text-white/70 uppercase tracking-wider">Reputation Manifest</h3>
        </div>
        <span
          className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/20"
          title="Anchored to the agent's ERC-7857 metadata (V1.5)"
        >
          {m.anchor.standard} anchored
        </span>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#0d1525] px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3 h-3 text-white/30" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/35">{label}</span>
            </div>
            <span className="text-[18px] font-semibold text-white/85">{value}</span>
          </div>
        ))}
      </div>

      {/* Models */}
      {m.models.length > 0 && (
        <div className="px-4 py-3 border-t border-white/[0.04] flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-mono uppercase tracking-wider text-white/30 mr-1">Compute</span>
          {m.models.map(model => (
            <span key={model} className="px-1.5 py-0.5 rounded text-[9px] font-mono text-sky-300/70 bg-sky-400/[0.07] border border-sky-400/15">
              {model}
            </span>
          ))}
        </div>
      )}

      {/* Manifest hash */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono uppercase tracking-wider text-white/30">Manifest hash (content-addressed)</span>
          <button onClick={copy} className="text-white/30 hover:text-white/60 transition-colors" title="Copy manifest hash">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <p className="text-[10px] font-mono text-[#A78BFA]/70 break-all leading-relaxed">{m.manifestHash}</p>
      </div>

      {/* Portability note */}
      <div className="px-4 py-3 border-t border-white/[0.04] bg-[#A78BFA]/[0.03]">
        <p className="text-[11px] text-white/40 leading-relaxed">
          This manifest is derived only from on-chain-settled, 0G-Storage-verified work — then hashed to a single
          anchor in the agent&apos;s <span className="text-white/60">ERC-7857</span> metadata. When the iNFT is sold or
          cloned via AgentMarketplace, its earned reputation travels with it.
        </p>
      </div>
    </div>
  );
}
