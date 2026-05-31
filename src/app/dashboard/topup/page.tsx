"use client";

/**
 * Top Up — QRIS → IDRX → OG (Indonesian-market UX preview, V2).
 *
 * The whole point: an Indonesian user funds their agent the way they pay for
 * everything else — scan a QRIS code with GoPay/DANA/OVO. The chain is hidden.
 * Behind the scenes the rupiah is settled in IDRX (regulated stablecoin) and
 * routed to OG. This page is a faithful MOCK of that flow — clearly labelled
 * "Preview" — so judges and partners can see the V2 experience today.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Smartphone, ArrowRight, Check, ShieldCheck, Wallet, Info } from "lucide-react";
import { OG_TO_IDR, ogToIdr, formatIdr, formatOg } from "@/lib/currency";
import OgAmount from "@/components/common/OgAmount";

// Deterministic pseudo-QR (no randomness → SSR-safe, stable). Visual only.
function PseudoQR({ seed }: { seed: string }) {
  const N = 21;
  const cells = useMemo(() => {
    const out: boolean[] = [];
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    for (let i = 0; i < N * N; i++) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      out.push((h & 0xff) > 128);
    }
    return out;
  }, [seed]);

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, N - 7) || inBox(N - 7, 0);
  };
  const finderOn = (r: number, c: number) => {
    const ring = (br: number, bc: number) => {
      const rr = r - br, cc = c - bc;
      if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true;      // outer ring
      if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true;          // inner block
      return false;
    };
    if (r < 7 && c < 7) return ring(0, 0);
    if (r < 7 && c >= N - 7) return ring(0, N - 7);
    if (r >= N - 7 && c < 7) return ring(N - 7, 0);
    return false;
  };

  return (
    <div
      className="grid bg-white p-3 rounded-xl"
      style={{ gridTemplateColumns: `repeat(${N}, 1fr)`, width: 220, height: 220 }}
    >
      {cells.map((on, i) => {
        const r = Math.floor(i / N), c = i % N;
        const dark = isFinder(r, c) ? finderOn(r, c) : on;
        return <div key={i} style={{ background: dark ? "#0A1428" : "transparent" }} />;
      })}
    </div>
  );
}

const QUICK_AMOUNTS = [50000, 150000, 300000, 500000]; // UMKM-tier rupiah

type Step = "amount" | "scan" | "processing" | "done";

const PROCESSING_STAGES = [
  { label: "QRIS payment received", sub: "via GoPay / DANA / OVO" },
  { label: "Settled to IDRX", sub: "regulated rupiah stablecoin" },
  { label: "Routed to OG", sub: "agent wallet funded on 0G mainnet" },
];

export default function TopUpPage() {
  const [step, setStep] = useState<Step>("amount");
  const [idr, setIdr] = useState<number>(150000);
  const [stage, setStage] = useState(0);

  const og = ogToIdr(1) > 0 ? idr / OG_TO_IDR : 0;

  // Drive the processing animation through the 3 stages, then land on "done".
  useEffect(() => {
    if (step !== "processing") return;
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 1100);
    const t2 = setTimeout(() => setStage(2), 2200);
    const t3 = setTimeout(() => setStep("done"), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step]);

  return (
    <div className="min-h-screen px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-semibold text-white/90 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#4F8FF7]" /> Top Up Agent
            </h1>
            <p className="text-[12px] text-white/40 mt-0.5">Fund your agent with QRIS — no crypto knowledge needed.</p>
          </div>
          <span className="px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider text-[#E8B86C] bg-[#E8B86C]/10 border border-[#E8B86C]/20">
            Preview · V2
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ── STEP 1 — amount ────────────────────────────────────────── */}
            {step === "amount" && (
              <motion.div key="amount" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="p-6 space-y-5">
                <div>
                  <label className="block text-[12px] text-white/40 mb-2">Top-up amount (Rupiah)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-[15px]">Rp</span>
                    <input
                      type="number"
                      value={idr || ""}
                      onChange={(e) => setIdr(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="w-full bg-[#050810]/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-[16px] focus:outline-none focus:border-[#4F8FF7]/40"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {QUICK_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setIdr(a)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-mono transition-colors ${
                          idr === a
                            ? "bg-[#4F8FF7]/15 text-[#4F8FF7] border border-[#4F8FF7]/30"
                            : "bg-white/[0.04] text-white/50 border border-white/10 hover:text-white/70"
                        }`}
                      >
                        {formatIdr(a)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#050810]/60 border border-white/[0.06] px-4 py-3 flex items-center justify-between">
                  <span className="text-[12px] text-white/40">Your agent receives</span>
                  <span className="text-[15px] font-mono text-emerald-300">{formatOg(og, 4)}</span>
                </div>

                <button
                  onClick={() => setStep("scan")}
                  disabled={idr <= 0}
                  className="w-full py-3 rounded-xl bg-[#4F8FF7] hover:bg-[#4F8FF7]/90 disabled:opacity-40 text-white font-medium text-[14px] flex items-center justify-center gap-2 transition-colors"
                >
                  Continue to QRIS <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── STEP 2 — scan ──────────────────────────────────────────── */}
            {step === "scan" && (
              <motion.div key="scan" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="p-6 flex flex-col items-center space-y-4">
                <div className="flex items-center gap-2 text-[12px] text-white/50">
                  <QrCode className="w-4 h-4 text-[#4F8FF7]" /> Scan with any QRIS e-wallet
                </div>
                <PseudoQR seed={`zer0gig-qris-${idr}`} />
                <div className="text-center">
                  <p className="text-[13px] text-white/70">{formatIdr(idr)}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">zer0Gig · Agent Top-Up</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/35">
                  <Smartphone className="w-3.5 h-3.5" /> GoPay · DANA · OVO · ShopeePay · LinkAja
                </div>
                <button
                  onClick={() => setStep("processing")}
                  className="w-full py-3 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white font-medium text-[14px] flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" /> I&apos;ve paid via QRIS
                </button>
                <button onClick={() => setStep("amount")} className="text-[12px] text-white/30 hover:text-white/50">← Change amount</button>
              </motion.div>
            )}

            {/* ── STEP 3 — processing ────────────────────────────────────── */}
            {step === "processing" && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-3">
                <p className="text-[12px] text-white/40 text-center mb-2">Settling your payment…</p>
                {PROCESSING_STAGES.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      i <= stage ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-white/[0.06] bg-[#050810]/40"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i <= stage ? "bg-emerald-400/20" : "bg-white/[0.05]"}`}>
                      {i < stage ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : i === stage ? (
                        <div className="w-3 h-3 rounded-full border-2 border-emerald-400/40 border-t-emerald-400 animate-spin" />
                      ) : (
                        <span className="text-[10px] text-white/30">{i + 1}</span>
                      )}
                    </div>
                    <div>
                      <p className={`text-[13px] ${i <= stage ? "text-white/80" : "text-white/35"}`}>{s.label}</p>
                      <p className="text-[10px] text-white/30">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── STEP 4 — done ──────────────────────────────────────────── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-400/15 flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[16px] text-white/90 font-medium">Agent funded</p>
                  <p className="text-[12px] text-white/40 mt-1">{formatIdr(idr)} → <span className="text-emerald-300 font-mono">{formatOg(og, 4)}</span></p>
                </div>
                <div className="w-full rounded-xl bg-[#050810]/60 border border-white/[0.06] px-4 py-3 text-left">
                  <OgAmount value={og} className="text-white/80 text-[14px]" />
                </div>
                <button onClick={() => { setStep("amount"); }} className="text-[12px] text-[#4F8FF7] hover:text-[#4F8FF7]/80">Top up again</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* IDRX explainer */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1525]/70 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-[13px] font-medium text-white/70 uppercase tracking-wider">Settled in IDRX</h2>
          </div>
          <p className="text-[12px] text-white/45 leading-relaxed">
            Indonesian payments settle in <span className="text-white/70">IDRX</span> — a regulated, audited rupiah
            stablecoin — before routing to OG. You never hold or think about crypto: top up with QRIS, your agent
            gets funded. OG stays the infrastructure token under the hood.
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-[#4F8FF7]/[0.06] border border-[#4F8FF7]/15 px-3 py-2">
            <Info className="w-3.5 h-3.5 text-[#4F8FF7] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#4F8FF7]/70 leading-relaxed">
              Reference rate: 1 OG ≈ {formatIdr(OG_TO_IDR)}. Display-only — final rate set at settlement. QRIS rails
              + IDRX integration ship in V2 (Indonesian Operator Network).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
