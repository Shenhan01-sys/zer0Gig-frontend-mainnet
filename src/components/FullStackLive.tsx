"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Database, KeyRound, Link as LinkIcon, Terminal } from "lucide-react";

// ── Data & Log Sequences ──────────────────────────────────────────────────────

const LAYERS = [
  {
    id: "kv",
    Icon: KeyRound,
    accent: "#09799E",
    label: "0G KV Node",
  },
  {
    id: "compute",
    Icon: Cpu,
    accent: "#47A9CF",
    label: "0G Compute",
  },
  {
    id: "storage",
    Icon: Database,
    accent: "#A6E0F4",
    label: "0G Storage",
  },
  {
    id: "chain",
    Icon: LinkIcon,
    accent: "#10b981",
    label: "0G Aristotle Chain",
  },
] as const;

type LayerId = (typeof LAYERS)[number]["id"];

interface LogEntry {
  id: number;
  text: string;
  layer: LayerId | "sys" | null;
  delayMs: number;
}

// Simulasi log sistem yang akan di-loop berulang
const LOG_SEQUENCE: Omit<LogEntry, "id">[] = [
  { text: "> [SYS] Incoming job request detected (ID: 8942)", layer: "sys", delayMs: 800 },
  { text: "> [SYS] Initializing autonomous runtime environment...", layer: "sys", delayMs: 1200 },
  { text: "> [KV] Connecting to 0G KV Node...", layer: "kv", delayMs: 600 },
  { text: "> [KV] State loaded. 12 previous client learnings recalled.", layer: "kv", delayMs: 1500 },
  { text: "> [COMPUTE] Bootstrapping 0GM-1.0-35B-A3B via 0G Compute...", layer: "compute", delayMs: 1000 },
  { text: "> [COMPUTE] Generating tool calls & reasoning steps...", layer: "compute", delayMs: 1800 },
  { text: "> [COMPUTE] Inference complete. Result structured.", layer: "compute", delayMs: 800 },
  { text: "> [STORAGE] Hashing job outputs & committing to 0G DA...", layer: "storage", delayMs: 1200 },
  { text: "> [STORAGE] Upload success. txSeq: 94301 assigned.", layer: "storage", delayMs: 1500 },
  { text: "> [CHAIN] Submitting merkle root to Escrow Contract...", layer: "chain", delayMs: 1000 },
  { text: "> [CHAIN] Transaction confirmed (chainId: 16661, block: 142203).", layer: "chain", delayMs: 2000 },
  { text: "> [SYS] Cycle complete. Awaiting next trigger event.", layer: "sys", delayMs: 3000 },
];

// ── Components ────────────────────────────────────────────────────────────────

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

// ── Main Section ──────────────────────────────────────────────────────────────

function FullStackLive() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeLayer, setActiveLayer] = useState<LayerId | "sys" | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Terminal Simulation Loop
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runSequence = () => {
      const currentLog = LOG_SEQUENCE[sequenceIndex];
      
      // Add log to terminal
      setLogs((prev) => {
        const newLogs = [...prev, { ...currentLog, id: Date.now() }];
        // Keep only last 50 logs to prevent memory leaks
        return newLogs.slice(-50);
      });
      
      // Highlight architecture diagram
      setActiveLayer(currentLog.layer);

      // Schedule next log
      timeoutId = setTimeout(() => {
        setSequenceIndex((prev) => (prev + 1) % LOG_SEQUENCE.length);
      }, currentLog.delayMs);
    };

    runSequence();

    return () => clearTimeout(timeoutId);
  }, [sequenceIndex]);

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-[#47A9CF]/[0.06] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <LivePulseChip>Full 0G Stack — Live</LivePulseChip>
          <h2
            className="text-3xl md:text-5xl font-medium tracking-tight mt-5 mb-4"
            style={{
              background: "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Every layer of 0G — proven on-chain
          </h2>
          <p className="text-[15px] text-white/45 max-w-2xl mx-auto leading-relaxed">
            Compute, Storage, KV, Chain — observe the autonomous agent moving data across the complete zer0Gig infrastructure in real-time.
          </p>
        </motion.div>

        {/* Split-Pane Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          
          {/* Left Pane: Terminal / Logs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#0A0E14] overflow-hidden flex flex-col h-[500px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            {/* Terminal Header */}
            <div className="flex items-center px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-white/40 uppercase tracking-widest">
                <Terminal className="w-3 h-3" />
                <span>zer0Gig Runtime Log</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div 
              ref={scrollRef}
              className="flex-1 p-5 overflow-y-auto font-mono text-[13px] leading-relaxed scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <AnimatePresence initial={false}>
                {logs.map((log) => {
                  let colorClass = "text-white/60";
                  if (log.layer === "kv") colorClass = "text-[#09799E]";
                  if (log.layer === "compute") colorClass = "text-[#47A9CF]";
                  if (log.layer === "storage") colorClass = "text-[#A6E0F4]";
                  if (log.layer === "chain") colorClass = "text-[#10b981]";
                  if (log.layer === "sys") colorClass = "text-amber-500/70";

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`mb-1.5 ${colorClass}`}
                    >
                      {log.text}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right Pane: 3D Orb Visualizer */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6 rounded-2xl border border-white/[0.04] bg-[#032A3D]/30 p-6 flex flex-col justify-center relative overflow-hidden h-[500px]"
          >
            {/* Background SVG Connectors (Z-Pattern connecting the 4 centers) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden>
              {/* KV (Top-Left) to Compute (Top-Right) */}
              <line x1="25%" y1="25%" x2="75%" y2="25%" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeDasharray="6 6" />
              {/* Compute (Top-Right) to Storage (Bottom-Left) */}
              <line x1="75%" y1="25%" x2="25%" y2="75%" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeDasharray="6 6" />
              {/* Storage (Bottom-Left) to Chain (Bottom-Right) */}
              <line x1="25%" y1="75%" x2="75%" y2="75%" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeDasharray="6 6" />
            </svg>

            <div className="grid grid-cols-2 gap-y-16 z-10 h-full relative items-center justify-items-center">
              {LAYERS.map((layer) => {
                const isActive = activeLayer === layer.id;
                const Icon = layer.Icon;

                return (
                  <div key={layer.id} className="flex flex-col items-center">
                    {/* Pure Icon with 3D Pop/Timbul Animation (No Background) */}
                    <div className="w-28 h-28 flex items-center justify-center relative">
                      <Icon 
                        className={`w-14 h-14 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                          isActive 
                            ? 'scale-[1.6] -translate-y-4 opacity-100' 
                            : 'scale-100 translate-y-0 opacity-30'
                        }`}
                        style={{ 
                          color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
                          // Efek Timbul: Bayangan gelap jatuh ke bawah + Glow warna accent
                          filter: isActive 
                            ? `drop-shadow(0px 20px 10px rgba(0,0,0,0.8)) drop-shadow(0px 0px 15px ${layer.accent})` 
                            : `drop-shadow(0px 5px 5px rgba(0,0,0,0.5))`
                        }} 
                      />
                    </div>
                    
                    {/* Label Container (mengelompokkan Title dan Caption) */}
                    <div className="flex flex-col items-center h-16 mt-2 relative">
                      {/* Floating Title (Selalu Terlihat) */}
                      <div 
                        className="text-[13px] font-mono uppercase tracking-widest font-semibold transition-all duration-500 z-10"
                        style={{ 
                          color: isActive ? layer.accent : "rgba(255,255,255,0.3)",
                          textShadow: isActive ? `0 0 15px ${layer.accent}` : "none",
                          transform: isActive ? "translateY(-4px)" : "translateY(0)"
                        }}
                      >
                        {layer.label}
                      </div>

                      {/* Detail Caption (Muncul Saat Aktif Saja) */}
                      <div 
                        className={`absolute top-6 text-[11px] text-white/50 text-center w-40 leading-tight transition-all duration-500 ease-out ${
                          isActive 
                            ? 'opacity-100 translate-y-0' 
                            : 'opacity-0 -translate-y-3 pointer-events-none'
                        }`}
                      >
                        {/* Catatan: layer.detail tidak ada di data source terbaru di prompt ini,
                           jadi saya membuat fallback data sederhana berdasarkan narasi 0G sebelumnya.
                           Harap sesuaikan dengan data aktual Anda jika diperlukan.
                        */}
                        {layer.id === 'kv' && "Cross-restart memory"}
                        {layer.id === 'compute' && "0GM-1.0-35B-A3B inference"}
                        {layer.id === 'storage' && "Merkle-rooted outputs"}
                        {layer.id === 'chain' && "Smart contract registry"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Realtime Status Indicator */}
            <div className="absolute bottom-4 right-5 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Network Connected</span>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}

// Default export wrapper to provide appropriate background context for the UI
export default function App() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-900/50">
      <FullStackLive />
    </div>
  );
}