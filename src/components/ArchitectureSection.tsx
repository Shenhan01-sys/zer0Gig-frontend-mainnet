"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { AnimatedBeam } from "./ui/AnimatedBeam";

// ── Node component ────────────────────────────────────────────────────────────
function ArchNode({
  nodeRef,
  label,
  sublabel,
  icon,
  color,
  size = "md",
}: {
  nodeRef: React.RefObject<HTMLDivElement>;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-[150px] p-4",
    md: "w-[175px] p-5",
    lg: "w-[200px] p-6",
  };
  const iconSize = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-12 h-12" : "w-14 h-14";

  return (
    <div
      ref={nodeRef}
      className={`relative flex flex-col items-center gap-2 rounded-2xl border bg-[#0d1525]/90 backdrop-blur-sm text-center ${sizeClasses[size]}`}
      style={{ borderColor: `${color}30`, boxShadow: `0 0 24px ${color}12` }}
    >
      <div
        className={`${iconSize} rounded-xl flex items-center justify-center`}
        style={{ background: `${color}18`, border: `1px solid ${color}25` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white leading-tight">{label}</p>
        <p className="text-[11px] mt-1 leading-tight" style={{ color: `${color}80` }}>{sublabel}</p>
      </div>
      {/* Pulse dot */}
      <span
        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </div>
  );
}

export default function ArchitectureSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef    = useRef<HTMLDivElement>(null);
  const escrowRef    = useRef<HTMLDivElement>(null);
  const agentRef     = useRef<HTMLDivElement>(null);
  const registryRef  = useRef<HTMLDivElement>(null);
  const storageRef   = useRef<HTMLDivElement>(null);
  const userRegRef   = useRef<HTMLDivElement>(null);

  return (
    <section id="developers" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-500/[0.05] blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[13px] text-white/50">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="10" height="2" rx="0.5" /><rect x="2" y="6" width="10" height="2" rx="0.5" /><rect x="2" y="9" width="10" height="2" rx="0.5" />
            </svg>
            <span
              style={{ "--shiny-width": "80px" } as React.CSSProperties}
              className="animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite] bg-gradient-to-r from-transparent via-white/80 via-50% to-transparent"
            >
              Architecture
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-5xl font-medium text-center mb-4"
          style={{
            background: "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          The Full Stack, On-Chain
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[15px] text-white/40 text-center mb-20 max-w-lg mx-auto"
        >
          Four contracts deployed on 0G Aristotle Mainnet (chainId 16661) — from user intent to autonomous payout.
        </motion.p>

        {/* Node diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          ref={containerRef}
          className="relative mx-auto max-w-5xl h-[580px] flex items-center justify-center"
        >
          {/* ── Nodes ────────────────────────────────────────────── */}

          {/* Left: Client */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <ArchNode
              nodeRef={clientRef}
              label="Client"
              sublabel="Posts jobs & funds escrow"
              color="#38bdf8"
              size="md"
              icon={
                <svg className="w-7 h-7 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              }
            />
          </div>

          {/* Center: ProgressiveEscrow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ArchNode
              nodeRef={escrowRef}
              label="Progressive Escrow"
              sublabel="ERC-8183 · Milestone payouts"
              color="#a855f7"
              size="lg"
              icon={
                <svg className="w-8 h-8 text-[#a855f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />
          </div>

          {/* Right: Agent Runtime */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <ArchNode
              nodeRef={agentRef}
              label="Agent Runtime"
              sublabel="Autonomous AI worker"
              color="#22d3ee"
              size="md"
              icon={
                <svg className="w-7 h-7 text-[#22d3ee]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v1a4 4 0 0 1-8 0v-1H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4z" />
                  <path d="M9 14h.01M15 14h.01" />
                </svg>
              }
            />
          </div>

          {/* Top-center: AgentRegistry */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <ArchNode
              nodeRef={registryRef}
              label="Agent Registry"
              sublabel="ERC-7857 iNFT"
              color="#f59e0b"
              size="sm"
              icon={
                <svg className="w-6 h-6 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h.01M15 12h.01M7.5 15s1.5 2 4.5 2 4.5-2 4.5-2" /><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              }
            />
          </div>

          {/* Bottom-left: UserRegistry */}
          <div className="absolute bottom-0 left-[22%] -translate-x-1/2">
            <ArchNode
              nodeRef={userRegRef}
              label="User Registry"
              sublabel="On-chain roles"
              color="#10b981"
              size="sm"
              icon={
                <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
          </div>

          {/* Bottom-right: 0G Storage */}
          <div className="absolute bottom-0 right-[22%] translate-x-1/2">
            <ArchNode
              nodeRef={storageRef}
              label="0G Storage"
              sublabel="Output & portfolios"
              color="#ec4899"
              size="sm"
              icon={
                <svg className="w-6 h-6 text-[#ec4899]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              }
            />
          </div>

          {/* ── Animated Beams ───────────────────────────────────── */}
          {/* Client → Escrow */}
          <AnimatedBeam containerRef={containerRef} fromRef={clientRef} toRef={escrowRef}
            gradientStartColor="#38bdf8" gradientStopColor="#a855f7" duration={5} curvature={-20} />
          {/* Escrow → Agent */}
          <AnimatedBeam containerRef={containerRef} fromRef={escrowRef} toRef={agentRef}
            gradientStartColor="#a855f7" gradientStopColor="#22d3ee" duration={5} delay={1} curvature={20} />
          {/* Agent → Client (reverse: payout signal) */}
          <AnimatedBeam containerRef={containerRef} fromRef={agentRef} toRef={clientRef}
            gradientStartColor="#22d3ee" gradientStopColor="#38bdf8" duration={6} delay={2} curvature={60} reverse />
          {/* Escrow → AgentRegistry */}
          <AnimatedBeam containerRef={containerRef} fromRef={escrowRef} toRef={registryRef}
            gradientStartColor="#a855f7" gradientStopColor="#f59e0b" duration={4} delay={0.5} curvature={-30} />
          {/* Escrow → UserRegistry */}
          <AnimatedBeam containerRef={containerRef} fromRef={escrowRef} toRef={userRegRef}
            gradientStartColor="#a855f7" gradientStopColor="#10b981" duration={4.5} delay={1.5} />
          {/* Agent → Storage */}
          <AnimatedBeam containerRef={containerRef} fromRef={agentRef} toRef={storageRef}
            gradientStartColor="#22d3ee" gradientStopColor="#ec4899" duration={3.5} delay={0.8} />
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-10"
        >
          {[
            { color: "#38bdf8", label: "Client → Escrow (postJob / acceptProposal)" },
            { color: "#a855f7", label: "Escrow → Agent (funds release)" },
            { color: "#22d3ee", label: "Agent → Storage (output upload)" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-5 h-px rounded-full" style={{ background: `linear-gradient(to right, ${color}80, ${color})` }} />
              <span className="text-[11px] text-white/30">{label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-6"
        >
          <span className="text-[11px] text-white/20 uppercase tracking-widest">
            0G Chain &mdash; Decentralized Foundation
          </span>
        </motion.div>
      </div>
    </section>
  );
}
