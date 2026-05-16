"use client";

/**
 * AutonomousProof — counter-style stats demonstrating that zer0Gig is
 * actually running, not just deployed. Headline is Subscription #3:
 * an autonomous agent that ran continuously, drained 0.0003 OG per
 * 60-second cycle, with 3 on-chain CheckInDrained events documented.
 *
 * Aesthetic: aligned with AgentCapabilities + FullStackLive —
 * bg-[#032A3D]/80 cards, BorderBeam on hover, shared SectionLabel
 * pattern. Unique to this section: the 60-second cycle timeline panel
 * (T+0s → T+14s) with mono tx-hash style entries.
 */

import { motion } from "framer-motion";
import NumberTicker from "./ui/NumberTicker";
import HoverRevealCTA from "./ui/HoverRevealCTA";

// Live pulse chip — kept emerald to signal "running right now"
// (shared canonical SectionLabel pattern lives in AgentCapabilities;
//  this section uses the live-pulse variant in its header)
function LivePulseChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] text-[11px] text-emerald-400 uppercase tracking-widest font-medium">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
      </span>
      {children}
    </span>
  );
}

const COUNTERS = [
  {
    value: 197,
    decimals: 0,
    label: "Tests passing",
    sub: "5 suites · Mocha + Hardhat + Playwright + Integration",
    accent: "#47A9CF",
  },
  {
    value: 10,
    decimals: 0,
    suffix: "+",
    label: "Jobs minted",
    sub: "ProgressiveEscrow.acceptProposal() — every one verifiable",
    accent: "#09799E",
  },
  {
    value: 3,
    decimals: 0,
    label: "Subscriptions live",
    sub: "60s tick interval · autonomous OG drain",
    accent: "#10b981",
  },
  {
    value: 0.0003,
    decimals: 4,
    suffix: " OG",
    label: "Paid out per cycle",
    sub: "Per CheckInDrained event · documented tx hashes",
    accent: "#E8B84B",
  },
];

const TIMELINE = [
  { t: "T+0s",  label: "Subscription #3 ticks", detail: "SubscriptionEscrow.checkIn()" },
  { t: "T+1s",  label: "3 skills execute",     detail: "web_search · http_fetch · market_analysis" },
  { t: "T+8s",  label: "0G Compute inference", detail: "0GM-1.0-35B-A3B · self-eval loop" },
  { t: "T+12s", label: "Output uploaded",      detail: "0G Storage merkle root" },
  { t: "T+14s", label: "Drain confirmed",      detail: "CheckInDrained · 0.0003 OG → agent" },
];

// ── Counter card ──────────────────────────────────────────────────────────────
function CounterCard({
  c,
  delay,
}: {
  c: (typeof COUNTERS)[number];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      className="group relative rounded-2xl border border-white/[0.08] bg-[#032A3D]/80 p-5 flex flex-col gap-4
                 hover:border-white/30 hover:-translate-y-0.5
                 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                 transition-all duration-300 ease-out overflow-hidden"
    >
      {/* Counter — sits in a screen-within-screen surface */}
      <div className="rounded-xl border border-white/[0.06] bg-[#021F2E]/60 p-4 min-h-[88px] flex items-center justify-center overflow-hidden">
        <div
          className="text-4xl md:text-5xl font-medium tracking-tight tabular-nums leading-none"
          style={{ color: c.accent, textShadow: `0 0 28px ${c.accent}33` }}
        >
          <NumberTicker value={c.value} decimalPlaces={c.decimals} />
          {c.suffix && <span className="text-2xl md:text-3xl text-white/55 ml-0.5">{c.suffix}</span>}
        </div>
      </div>

      {/* Text */}
      <div>
        <h3
          className="text-[15px] font-semibold text-white mb-1.5"
          style={{ textShadow: `0 0 20px ${c.accent}44` }}
        >
          {c.label}
        </h3>
        <p className="text-[12px] text-white/40 leading-relaxed">{c.sub}</p>

        {/* Hidden reveal CTA — slides up + fades in on hover */}
        <HoverRevealCTA
          className="mt-3"
          href="https://chainscan.0g.ai"
          label="View on chain"
          external
        />
      </div>
    </motion.div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function AutonomousProof() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.05] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] rounded-full bg-amber-400/[0.04] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <LivePulseChip>Autonomous Proof</LivePulseChip>
          <h2
            className="text-3xl md:text-5xl font-medium tracking-tight mt-5 mb-4"
            style={{
              background: "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            An agent that runs without anyone watching
          </h2>
          <p className="text-[15px] text-white/45 max-w-2xl mx-auto leading-relaxed">
            Subscription #3 has been ticking on a 60-second interval since launch. Every cycle:
            three skills execute, 0G Compute fires, the contract drains OG to the agent — no
            operator, no babysitter, no &ldquo;demo mode.&rdquo;
          </p>
        </motion.div>

        {/* Counter grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {COUNTERS.map((c, i) => (
            <CounterCard key={c.label} c={c} delay={i * 0.08} />
          ))}
        </div>

        {/* 60-second cycle timeline panel — unique signature element */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="group relative rounded-2xl border border-white/[0.08] bg-[#032A3D]/80 overflow-hidden
                     hover:border-white/30 hover:-translate-y-0.5
                     hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                     transition-all duration-300 ease-out"
        >
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-7">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400 mb-1.5">
                  ONE 60-SECOND CYCLE — SUBSCRIPTION #3
                </p>
                <h3 className="text-[20px] md:text-[22px] font-medium text-white leading-tight">
                  3 CheckInDrained events · 4 minutes · all on-chain
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/35">
                <span className="font-mono">tick interval</span>
                <span className="text-white/15">·</span>
                <span className="font-mono text-emerald-400/70">60s</span>
              </div>
            </div>

            {/* Timeline grid — screen-within-screen surface */}
            <div className="rounded-xl border border-white/[0.06] bg-[#021F2E]/60 p-4 space-y-2">
              {TIMELINE.map((step, i) => (
                <motion.div
                  key={step.t}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 md:gap-4 py-2 px-3 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:border-white/[0.1] transition-colors"
                >
                  <span className="text-[11px] font-mono text-emerald-400/70 w-12 flex-shrink-0">
                    {step.t}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 flex-shrink-0" />
                  <span className="text-[13px] text-white/85 font-medium flex-shrink-0">
                    {step.label}
                  </span>
                  <span className="text-[11px] text-white/35 font-mono ml-auto truncate hidden md:inline">
                    {step.detail}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Footer line */}
            <div className="mt-7 pt-5 border-t border-white/[0.05] flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <p className="text-[12px] text-white/45 leading-relaxed">
                <span className="text-white/65 font-medium">Result:</span> 0.0003 OG paid out per
                cycle, every cycle, autonomously. No human in the loop.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">
                  tx hashes documented · chainscan.0g.ai
                </span>
                {/* Hidden reveal CTA — slides up + fades in on hover */}
                <HoverRevealCTA
                  href="https://chainscan.0g.ai"
                  label="View on chain"
                  external
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
