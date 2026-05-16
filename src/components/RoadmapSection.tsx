"use client";

import React from "react";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Lock, RefreshCw, Clipboard, Dna, Bot, Scale, Globe, Plug } from "lucide-react";
import ShinyText from "./ShinyText/ShinyText";

const CARDS = [
  {
    phase: "Phase 1",
    phaseColor: "#38bdf8",
    phaseBg: "rgba(56,189,248,0.08)",
    phaseBorder: "rgba(56,189,248,0.25)",
    glowColor: "rgba(56,189,248,0.15)",
    badge: "ERC-7857",
    badgeBy: "0G Labs",
    title: "Intelligent NFT (iNFT)",
    subtitle: "Self-Verifying Agent Identity — Live",
    description:
      "AgentRegistry implements ERC-7857 — the AI agent NFT standard proposed by 0G Labs. Capability data is encrypted, transfers are oracle-proven, and agents pack into 5 storage slots (down from 13).",
    currentLabel: "Status: Deployed",
    currentNote: "Live on 0G Aristotle Mainnet — iTransfer / iClone with ECDSA proof, time-bounded authorizeUsage permissions, all production code paths.",
    gains: [
      { icon: "🔐", label: "Encrypted capability data", sub: "Model weights & skills never exposed on-chain" },
      { icon: "🔄", label: "Oracle-proven iTransfer", sub: "ECDSA signature gates every ownership change" },
      { icon: "📋", label: "authorizeUsage()", sub: "Time-bounded licensing to multiple clients without transfer" },
      { icon: "🧬", label: "iClone()", sub: "Mint a verified copy for a new owner with proof of provenance" },
    ],
    eipUrl: "https://eips.ethereum.org/EIPS/eip-7857",
    eipStatus: "Draft · Shipped",
  },
  {
    phase: "Phase 2",
    phaseColor: "#a855f7",
    phaseBg: "rgba(168,85,247,0.08)",
    phaseBorder: "rgba(168,85,247,0.25)",
    glowColor: "rgba(168,85,247,0.15)",
    badge: "ERC-8183",
    badgeBy: "Virtuals Protocol + Ethereum Foundation dAI",
    title: "Agentic Commerce Protocol",
    subtitle: "Standardized Job Escrow — Live",
    description:
      "ProgressiveEscrow implements ERC-8183 — the on-chain job primitive that lets any AI agent hire another autonomously with cryptographic payment guarantees.",
    currentLabel: "Status: Deployed",
    currentNote: "postJob → submitProposal → acceptProposal → defineMilestones → releaseMilestone, plus the new cancelStaleJob() 7-day reclaim path. All on-chain.",
    gains: [
      { icon: "🤖", label: "Agent-to-agent hiring", sub: "Client can itself be an AI agent, no human needed" },
      { icon: "🔌", label: "Milestone hook flow", sub: "Alignment attestation gates every fund release" },
      { icon: "⚖️", label: "Pluggable evaluator", sub: "Alignment Node ECDSA proof verified on-chain" },
      { icon: "🌐", label: "7-day stale reclaim", sub: "cancelStaleJob() returns escrow if an agent goes silent" },
    ],
    eipUrl: "https://eips.ethereum.org/EIPS/eip-8183",
    eipStatus: "Draft · Shipped",
  },
];

const GAIN_ICONS: Record<string, React.ReactNode> = {
  "🔐": <Lock size={16} />,
  "🔄": <RefreshCw size={16} />,
  "📋": <Clipboard size={16} />,
  "🧬": <Dna size={16} />,
  "🤖": <Bot size={16} />,
  "🔌": <Plug size={16} />,
  "⚖️": <Scale size={16} />,
  "🌐": <Globe size={16} />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

export default function RoadmapSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-24 px-4 overflow-hidden">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#38bdf8]/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#a855f7]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
          custom={0}
          className="text-center mb-14"
        >
          {/* Pulse badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-widest backdrop-blur-md mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Standards Shipped
          </div>

          <h2
            style={{
              background: "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            <ShinyText
              text="Built on the Latest Agent Standards"
              speed={3}
              color="rgba(255,255,255,0.85)"
              shineColor="#22d3ee"
              spread={110}
              yoyo
              className="text-3xl md:text-5xl font-medium"
            />
          </h2>
          <p className="text-white/50 text-[15px] max-w-2xl mx-auto leading-relaxed">
            zer0Gig isn&apos;t aiming for the agentic economy — it&apos;s already running it.
            Both ERC-7857 and ERC-8183 are deployed, tested, and minting on 0G Aristotle Mainnet today.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.badge}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              variants={fadeUp}
              custom={i + 1}
              className="group relative rounded-2xl border bg-[#0d1525]/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                borderColor: card.phaseBorder,
                boxShadow: `0 0 0 0 ${card.glowColor}`,
              }}
              whileHover={{
                boxShadow: `0 0 40px -8px ${card.glowColor}`,
              }}
            >
              {/* Top gradient bar */}
              <div
                className="h-[2px] w-full"
                style={{ background: `linear-gradient(to right, ${card.phaseColor}, transparent)` }}
              />

              <div className="p-6">
                {/* Phase tag + EIP badge */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md"
                    style={{ background: card.phaseBg, color: card.phaseColor }}
                  >
                    {card.phase}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor: card.phaseBorder,
                        color: card.phaseColor,
                        background: card.phaseBg,
                      }}
                    >
                      {card.badge}
                    </span>
                    <span className="text-white/30 text-[10px]">{card.eipStatus}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white text-[18px] font-semibold mb-1">{card.title}</h3>
                <p className="text-white/40 text-[12px] mb-3">{card.subtitle}</p>
                <p className="text-white/55 text-[13px] leading-relaxed mb-5">{card.description}</p>

                {/* Current alignment note */}
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 mb-5">
                  <div className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-400">{card.currentLabel}</span>
                      <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{card.currentNote}</p>
                    </div>
                  </div>
                </div>

                {/* Gains list */}
                <ul className="space-y-2.5 mb-6">
                  {card.gains.map((g) => (
                    <li key={g.label} className="flex items-start gap-3">
                      <span className="text-base leading-none mt-0.5 text-[#00e5a0]">{GAIN_ICONS[g.icon] || g.icon}</span>
                      <div>
                        <span className="text-[13px] text-white/80 font-medium">{g.label}</span>
                        <p className="text-[11px] text-white/35 mt-0.5">{g.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <span className="text-[11px] text-white/30">{card.badgeBy}</span>
                  <a
                    href={card.eipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
                    style={{ color: card.phaseColor }}
                  >
                    View EIP
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
          custom={3}
          className="mt-10 text-center"
        >
          <p className="text-white/25 text-[12px] max-w-xl mx-auto leading-relaxed">
            Both EIPs sit in <span className="text-white/45">Draft</span> status — and zer0Gig is already running them in production code paths.
            That&apos;s not a roadmap claim; it&apos;s in the contract bytecode on chainId 16661.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
