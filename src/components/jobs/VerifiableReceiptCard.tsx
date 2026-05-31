"use client";

/**
 * VerifiableReceiptCard — public, independently-verifiable proof of a single
 * agent deliverable. Every receipt links the three things a skeptic needs to
 * trust autonomous work on 0G:
 *
 *   1. 0G Compute  — which model produced the output (0GM-1.0 / GLM-5-FP8 …)
 *   2. 0G Storage  — the root hash of the deliverable, downloadable by anyone
 *   3. 0G Chain    — the mainnet payment tx that settled the milestone
 *
 * "Not just thinking independently, but publishing publicly, with trust built
 * in." Drop this anywhere a completed action needs to show its receipts —
 * job detail page, agent profile, demo flow.
 */

import type { ReactNode } from "react";
import { ShieldCheck, Cpu, Database, ReceiptText, ExternalLink } from "lucide-react";
import { ogToIdr, formatIdr } from "@/lib/currency";

const CHAINSCAN = "https://chainscan.0g.ai";
const ZG_STORAGE = "https://indexer-storage-turbo.0g.ai/download";

export interface VerifiableReceipt {
  id?: number | string;
  category?: string | null;
  summary?: string | null;
  compute_provider?: string | null;
  compute_model?: string | null;
  zg_res_key?: string | null;
  workflow_cid?: string | null;
  proof_bundle_cid?: string | null;
  tx_hash?: string | null;
  amount_og?: string | number | null;
  created_at?: string | null;
}

// A real on-chain/storage artifact starts 0x and is non-trivial in length.
// Guards against the runtime's `mock-cid-…` fallback so we never render a
// dead link as if it were verifiable.
const isHash = (s?: string | null) =>
  typeof s === "string" && s.startsWith("0x") && s.length >= 10;

const short = (s?: string | null, head = 10, tail = 6) =>
  !s ? "—" : s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ProofRow({
  icon, label, children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="flex-shrink-0 text-white/30">{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-white/35 w-[88px] flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 text-right">
        {children}
      </div>
    </div>
  );
}

export default function VerifiableReceiptCard({
  receipt,
}: {
  receipt: VerifiableReceipt;
}) {
  const storageCid = isHash(receipt.zg_res_key)
    ? receipt.zg_res_key
    : isHash(receipt.proof_bundle_cid)
    ? receipt.proof_bundle_cid
    : null;
  const verified = !!storageCid && isHash(receipt.tx_hash);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1525]/90 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ReceiptText className="w-3.5 h-3.5 text-[#4F8FF7]" />
          <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
            Verifiable Receipt
          </span>
        </div>
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded"
          style={{
            background: verified ? "rgba(52,211,153,0.08)" : "rgba(148,163,184,0.06)",
            border: `1px solid ${verified ? "rgba(52,211,153,0.22)" : "rgba(148,163,184,0.15)"}`,
          }}
          title={verified ? "Output stored on 0G Storage + paid on 0G mainnet" : "Awaiting on-chain settlement"}
        >
          <ShieldCheck className={`w-3 h-3 ${verified ? "text-emerald-400" : "text-white/30"}`} />
          <span className={`text-[9px] font-mono ${verified ? "text-emerald-400" : "text-white/30"}`}>
            {verified ? "0G Verified" : "Pending"}
          </span>
        </div>
      </div>

      {/* Summary */}
      {receipt.summary && (
        <p className="px-3 pt-2.5 text-[12px] text-white/55 leading-snug line-clamp-2">
          {receipt.summary}
        </p>
      )}

      {/* Proof rows */}
      <div className="divide-y divide-white/[0.04] pt-1">
        <ProofRow icon={<Cpu className="w-3.5 h-3.5" />} label="0G Compute">
          {receipt.compute_model ? (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-sky-300/80 bg-sky-400/[0.07] border border-sky-400/15"
              title={receipt.compute_provider ? `provider: ${receipt.compute_provider}` : undefined}
            >
              {receipt.compute_model}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-white/25">—</span>
          )}
        </ProofRow>

        <ProofRow icon={<Database className="w-3.5 h-3.5" />} label="0G Storage">
          {storageCid ? (
            <a
              href={`${ZG_STORAGE}/${storageCid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300/80 hover:text-emerald-300 transition-colors"
              title={storageCid}
            >
              {short(storageCid)}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[10px] font-mono text-white/25">off-chain</span>
          )}
        </ProofRow>

        <ProofRow icon={<ReceiptText className="w-3.5 h-3.5" />} label="Payment">
          {isHash(receipt.tx_hash) ? (
            <a
              href={`${CHAINSCAN}/tx/${receipt.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300/80 hover:text-amber-300 transition-colors"
              title={receipt.tx_hash ?? undefined}
            >
              {receipt.amount_og != null && (
                <span className="text-amber-200/90">
                  {receipt.amount_og} OG
                  <span className="text-amber-200/40"> ≈ {formatIdr(ogToIdr(Number(receipt.amount_og)))}</span>
                </span>
              )}
              <span>{short(receipt.tx_hash)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[10px] font-mono text-white/25">—</span>
          )}
        </ProofRow>
      </div>

      {/* Footer timestamp */}
      {receipt.created_at && (
        <div className="px-3 py-1.5 border-t border-white/[0.04] text-right">
          <span className="text-[9px] font-mono text-white/25">{timeAgo(receipt.created_at)}</span>
        </div>
      )}
    </div>
  );
}
