"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Isometric math ──────────────────────────────────────────────
const TILE = 44;
const Z_SC = 28;

function iso(x: number, y: number, z: number) {
  return {
    sx: (x - y) * Math.cos(Math.PI / 6) * TILE,
    sy: (x + y) * Math.sin(Math.PI / 6) * TILE - z * Z_SC,
  };
}

// ── Geometry generators ─────────────────────────────────────────
interface Pt { x: number; y: number }

function makeCircle(ox: number, oy: number, r: number, seg = 32): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (Math.PI * 2 * i) / seg;
    pts.push({ x: ox + r * Math.cos(a), y: oy + r * Math.sin(a) });
  }
  return pts;
}

function makeGear(ox: number, oy: number, rIn: number, rOut: number, teeth: number): Pt[] {
  const pts: Pt[] = [];
  const step = (Math.PI * 2) / (teeth * 2);
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push({ x: ox + r * Math.cos(i * step - step * 0.35), y: oy + r * Math.sin(i * step - step * 0.35) });
    pts.push({ x: ox + r * Math.cos(i * step + step * 0.35), y: oy + r * Math.sin(i * step + step * 0.35) });
  }
  return pts;
}

function makePoly(ox: number, oy: number, r: number, sides: number): Pt[] {
  return makeCircle(ox, oy, r, sides);
}

// ── 3D Extrusion (Painter's Algorithm) ──────────────────────────
function IsoExtrusion({
  cx, cy, points, z, h, isActive, accent, glow, deep,
}: {
  cx: number; cy: number; points: Pt[]; z: number; h: number;
  isActive: boolean; accent: string; glow: string; deep?: { top: string; side: string; dark: string };
}) {
  const bottom = points.map((p) => {
    const i = iso(p.x, p.y, z);
    return { sx: cx + i.sx, sy: cy + i.sy };
  });
  const top = points.map((p) => {
    const i = iso(p.x, p.y, z + h);
    return { sx: cx + i.sx, sy: cy + i.sy };
  });

  const faces: { dist: number; pts: string }[] = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const midX = (points[i].x + points[next].x) / 2;
    const midY = (points[i].y + points[next].y) / 2;
    faces.push({
      dist: midX + midY,
      pts: [bottom[i], bottom[next], top[next], top[i]].map((p) => `${p.sx},${p.sy}`).join(" "),
    });
  }
  faces.sort((a, b) => a.dist - b.dist);

  const idleSide = deep?.side || "#0F111A";
  const idleDark = deep?.dark || "#0A0C10";
  const idleTop = deep?.top || "#1A1D24";
  const fill = isActive ? accent : idleSide;
  const stroke = isActive ? accent : deep ? `${accent}25` : "#2A2F3A";
  const topPts = top.map((p) => `${p.sx},${p.sy}`).join(" ");

  return (
    <g>
      {faces.map((f, i) => (
        <polygon key={i} points={f.pts} fill={isActive ? fill : idleDark} fillOpacity={isActive ? 0.12 : 0.9}
          stroke={stroke} strokeWidth={isActive ? 1 : 0.5} strokeLinejoin="round" />
      ))}
      <polygon points={topPts} fill={isActive ? accent : idleTop} fillOpacity={isActive ? 0.25 : 0.9}
        stroke={stroke} strokeWidth={isActive ? 1.5 : 0.5} strokeLinejoin="round"
        filter={isActive ? `drop-shadow(0 0 12px ${glow})` : "none"} />
    </g>
  );
}

// ── Layer data ──────────────────────────────────────────────────
interface LayerData {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  accent: string;
  glow: string;
  stat: string;
  zBase: number;
  floatDelay: number;
  stats: Record<string, string>;
  render: (cx: number, cy: number, isActive: boolean) => React.ReactNode;
}

const LAYERS: LayerData[] = [
  {
    id: "identity", label: "IDENTITY + ESCROW", sublabel: "ERC-7857 iNFT · ERC-8183 Escrow · 0G Chain",
    description: "The foundation layer. Every AI agent is an ERC-7857 iNFT — encrypted capability data, oracle-proven iTransfer / iClone, time-bounded authorizeUsage. Payments flow through ERC-8183 milestone-based progressive escrow.",
    accent: "#47A9CF", glow: "rgba(71,169,207,0.5)", stat: "ERC-7857", zBase: 0, floatDelay: 0,
    stats: { type: "ERC-7857", escrow: "ERC-8183", chain: "Aristotle 16661" },
    render: (cx, cy, a) => {
      const p = { isActive: a, accent: "#47A9CF", glow: "rgba(71,169,207,0.5)", deep: { top: "#032A3D", side: "#021F2E", dark: "#011620" } };
      return (<g>
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 5, 48)} z={0} h={0.5} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeGear(0, 0, 4.2, 4.8, 20)} z={0.5} h={0.6} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(-1.8, -0.8, 0.8, 16)} z={1.1} h={2.4} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(1.8, -0.8, 0.8, 16)} z={1.1} h={2.4} {...p} />
        {[0, 1, 2].map((i) => <IsoExtrusion key={i} cx={cx} cy={cy} points={makeCircle(0, 0, 2.8, 32)} z={0.6 + i * 0.5} h={0.2} {...p} />)}
      </g>);
    },
  },
  {
    id: "storage", label: "STORAGE LAYER", sublabel: "0G Storage KV · Decentralized Persistence",
    description: "All job data, agent outputs, capability manifests, and encrypted briefs stored on 0G's decentralized storage network with Merkle proof verification.",
    accent: "#A6E0F4", glow: "rgba(166,224,244,0.5)", stat: "256 PB", zBase: 4, floatDelay: 0.3,
    stats: { network: "0G Storage", verify: "Merkle Proof", mode: "KV + Blob" },
    render: (cx, cy, a) => {
      const p = { isActive: a, accent: "#A6E0F4", glow: "rgba(166,224,244,0.5)", deep: { top: "#032E40", side: "#02222F", dark: "#011A24" } };
      return (<g>
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 4, 48)} z={4} h={1.5} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeGear(0, 0, 3.5, 4.2, 16)} z={5.5} h={0.5} {...p} />
        {[0, 1, 2].map((i) => <IsoExtrusion key={i} cx={cx} cy={cy} points={makeCircle(0, 0, 2.2, 24)} z={4.2 + i * 0.5} h={0.2} {...p} />)}
      </g>);
    },
  },
  {
    id: "privacy", label: "PRIVACY LAYER", sublabel: "ECIES Encryption · Skill Key Sealing",
    description: "Job briefs and skill API keys are ECIES-encrypted client-side. Only the assigned agent's key decrypts. The runtime never sees plaintext credentials — agents can hold paid API keys without ever exposing them.",
    accent: "#09799E", glow: "rgba(9,121,158,0.5)", stat: "ECIES", zBase: 7, floatDelay: 0.6,
    stats: { cipher: "ECIES", scope: "Briefs + Keys", model: "Client-side" },
    render: (cx, cy, a) => {
      const p = { isActive: a, accent: "#09799E", glow: "rgba(9,121,158,0.5)", deep: { top: "#02384A", side: "#022B38", dark: "#011E28" } };
      return (<g>
        <IsoExtrusion cx={cx} cy={cy} points={makePoly(0, 0, 4.2, 6)} z={7} h={1.8} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makePoly(0, 0, 2.8, 6)} z={7.3} h={1.5} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 1.4, 16)} z={7.6} h={0.8} {...p} />
      </g>);
    },
  },
  {
    id: "arbiter", label: "ARBITER LAYER", sublabel: "0G Alignment Nodes · ECDSA Verification",
    description: "Decentralized alignment nodes evaluate every agent output and generate cryptographic ECDSA signatures the smart contract verifies on-chain — auto-release the moment the proof lands, no human approval needed.",
    accent: "#ec4899", glow: "rgba(236,72,153,0.5)", stat: "ECDSA", zBase: 10, floatDelay: 0.9,
    stats: { proof: "ECDSA", threshold: "80%", verifier: "On-chain" },
    render: (cx, cy, a) => {
      const p = { isActive: a, accent: "#ec4899", glow: "rgba(236,72,153,0.5)", deep: { top: "#280e1e", side: "#200a18", dark: "#180612" } };
      const sats = makeCircle(0, 0, 2.8, 8).sort((a, b) => (a.x + a.y) - (b.x + b.y));
      return (<g>
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 2, 32)} z={10} h={2.2} {...p} />
        {sats.map((s, i) => <IsoExtrusion key={i} cx={cx} cy={cy} points={makeCircle(s.x, s.y, 0.5, 12)} z={10.3} h={1.6} {...p} />)}
        <IsoExtrusion cx={cx} cy={cy} points={makeGear(0, 0, 2.4, 3.2, 10)} z={12} h={0.4} {...p} />
      </g>);
    },
  },
  {
    id: "economy", label: "ECONOMY LAYER", sublabel: "Micropayments · Cost Tracking · Game Theory",
    description: "The game theory engine. Agents keep what they don't spend. Efficient agents earn more profit while poor performers lose their deposit. The market naturally selects for quality.",
    accent: "#10b981", glow: "rgba(16,185,129,0.5)", stat: "OG Token", zBase: 13.5, floatDelay: 1.2,
    stats: { model: "Progressive", currency: "OG Token", mode: "Milestone" },
    render: (cx, cy, a) => {
      const p = { isActive: a, accent: "#10b981", glow: "rgba(16,185,129,0.5)", deep: { top: "#0a1e18", side: "#071a14", dark: "#05140e" } };
      return (<g>
        <IsoExtrusion cx={cx} cy={cy} points={makePoly(0, 0, 3.2, 8)} z={13.5} h={2.2} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 2.6, 32)} z={15.3} h={0.4} {...p} />
        {[0, 1, 2].map((i) => <IsoExtrusion key={i} cx={cx} cy={cy} points={makeCircle(0, 0, 1.5, 24)} z={13.8 + i * 0.7} h={0.35} {...p} />)}
      </g>);
    },
  },
  {
    id: "interface", label: "INTERFACE LAYER", sublabel: "React · Wagmi · 0G Compute · AI Brain",
    description: "The agent's face to the world. Frontend connects via Wagmi, the AI brain runs on 0G Compute Network's decentralized GPUs, processing tasks with models like Qwen, GPT-OSS, and Gemma.",
    accent: "#f59e0b", glow: "rgba(245,158,11,0.5)", stat: "0G Compute", zBase: 17, floatDelay: 1.5,
    stats: { compute: "0G Network", models: "Qwen/GPT", api: "OpenAI-compat" },
    render: (cx, cy, a) => {
      const p = { isActive: a, accent: "#f59e0b", glow: "rgba(245,158,11,0.5)", deep: { top: "#1e1608", side: "#181206", dark: "#120e04" } };
      return (<g>
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 2.2, 32)} z={17} h={2.5} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeGear(0, 0, 2, 2.6, 8)} z={19.5} h={0.5} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makeCircle(0, 0, 0.6, 12)} z={20} h={0.7} {...p} />
        <IsoExtrusion cx={cx} cy={cy} points={makePoly(0, 0, 0.3, 4)} z={20.7} h={1} {...p} />
      </g>);
    },
  },
];

// ── Main component ──────────────────────────────────────────────
export default function IsometricAgent() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const cx = 400;
  const cy = 700;

  const activeId = hoveredId || selectedId;
  const selectedLayer = activeId ? LAYERS.find((l) => l.id === activeId) : null;

  return (
    <motion.section
      id="developers"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden"
    >
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[#47A9CF]/[0.06] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#09799E]/[0.06] blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center pt-24 md:pt-32 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[13px] text-white/60">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            Agent Anatomy
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-5xl font-medium mb-4"
          style={{ background: "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Inside the AI Agent
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[15px] text-white/50 max-w-lg mx-auto">
          Hover or click any module to explore the six components that make every agent autonomous, secure, and verifiable.
        </motion.p>
      </div>

      {/* Full-width layout: SVG left + Panel right */}
      <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col lg:flex-row min-h-[80vh] items-center px-6">

        {/* ── SVG Canvas ── */}
        <div className="flex-[1.3] flex items-center justify-center min-h-[60vh] lg:min-h-[80vh] pt-8 lg:pt-0">
          <svg viewBox="0 0 800 950" className="w-full h-full max-w-[800px] max-h-[950px] overflow-visible">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A6E0F4" stopOpacity="0" />
                <stop offset="50%" stopColor="#09799E" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Ground grid */}
            {(() => {
              const lines: string[] = [];
              for (let i = -5; i <= 6; i++) {
                const a = iso(i, -5, -0.3); const b = iso(i, 6, -0.3);
                const c = iso(-5, i, -0.3); const d = iso(6, i, -0.3);
                lines.push(`M ${cx + a.sx},${cy + a.sy} L ${cx + b.sx},${cy + b.sy}`);
                lines.push(`M ${cx + c.sx},${cy + c.sy} L ${cx + d.sx},${cy + d.sy}`);
              }
              return <g opacity="0.08">{lines.map((d, i) => <path key={i} d={d} stroke="#475569" strokeWidth="1" />)}</g>;
            })()}

            {/* Connection spine */}
            {LAYERS.slice(0, -1).map((layer, i) => {
              const next = LAYERS[i + 1];
              const a = iso(0, 0, layer.zBase + 2.5);
              const b = iso(0, 0, next.zBase + 0.3);
              return (
                <motion.line key={`c-${i}`} x1={cx + a.sx} y1={cy + a.sy} x2={cx + b.sx} y2={cy + b.sy}
                  stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 8" opacity={0.35}
                  animate={{ strokeDashoffset: [0, -24] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              );
            })}

            {/* Render layers */}
            {LAYERS.map((layer, index) => {
              const isActive = activeId === layer.id;
              const isHov = hoveredId === layer.id;
              const isSel = selectedId === layer.id;

              // Label position
              const labelIso = iso(-4.5, 4.5, layer.zBase + 1.2);
              const lx = cx + labelIso.sx - 50;
              const ly = cy + labelIso.sy;

              return (
                <g
                  key={layer.id}
                  onMouseEnter={() => setHoveredId(layer.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedId((prev) => prev === layer.id ? null : layer.id)}
                  style={{ cursor: "pointer" }}
                >
                <g
                  style={{
                    transform: `translateY(${isHov ? -35 : isSel ? -20 : 0}px)`,
                    transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    willChange: "transform",
                  }}
                >
                  {/* 3D Geometry */}
                  <g opacity={activeId && !isActive ? 0.2 : 1} style={{ transition: "opacity 0.3s" }}>
                    {layer.render(cx, cy, isActive)}
                  </g>

                  {/* Label */}
                  <g opacity={isActive ? 1 : 0.5} style={{ transition: "opacity 0.3s" }}>
                    <circle cx={lx - 10} cy={ly - 3} r={isActive ? 5 : 3} fill={layer.accent} pointerEvents="none" />
                    <text x={lx} y={ly} fontSize="12" fontWeight="bold" letterSpacing="0.1em"
                      fill={isActive ? layer.accent : "rgba(255,255,255,0.3)"}
                      fontFamily="ui-monospace, monospace" pointerEvents="none">
                      {layer.stat}
                    </text>
                  </g>
                </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Right Panel — Unique cards per layer ── */}
        <div className="flex-1 max-w-[480px] relative z-20 flex flex-col justify-center pb-16 pt-6 lg:py-10">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scanLine { 0% { top: -2px; } 100% { top: 100%; } }
            @keyframes discSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes lockPulse { 0%,100% { opacity:0.3; transform:scale(1); } 50% { opacity:0.7; transform:scale(1.15); } }
            @keyframes nodeOrbit { 0% { transform: rotate(0deg) translateX(28px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(28px) rotate(-360deg); } }
            @keyframes coinBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
            @keyframes fingerScan { 0% { background-position: 0 -60px; } 100% { background-position: 0 60px; } }
          `}} />

          <AnimatePresence mode="wait">
            {selectedLayer ? (
              <motion.div
                key={selectedLayer.id}
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.92 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="relative"
              >
                {/* ── Per-layer unique card shell ── */}
                <div className="absolute inset-0 z-0 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${selectedLayer.accent}08 0%, #032A3D 40%, #032A3Dee 100%)`,
                    border: `1px solid ${selectedLayer.accent}25`,
                    clipPath: selectedLayer.id === "identity"
                      ? "polygon(50% 0, 100% 15%, 100% 100%, 0 100%, 0 15%)"            // Shield
                      : selectedLayer.id === "storage"
                      ? "polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%)" // Octagon
                      : selectedLayer.id === "privacy"
                      ? "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" // Hexagon
                      : selectedLayer.id === "arbiter"
                      ? "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"                       // Diamond
                      : selectedLayer.id === "economy"
                      ? "polygon(10% 0, 90% 0, 100% 100%, 0 100%)"                        // Trapezoid
                      : "polygon(0 0, 100% 0, 100% 100%, 0 100%)",                        // Rectangle (interface)
                    borderRadius: selectedLayer.id === "storage" ? "24px" : selectedLayer.id === "interface" ? "4px" : "0px",
                  }}
                >
                  {/* Unique animated decoration per card */}
                  {selectedLayer.id === "identity" && (
                    <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
                      style={{ background: `repeating-linear-gradient(0deg, transparent, transparent 8px, ${selectedLayer.accent} 8px, ${selectedLayer.accent} 9px)`, animation: "fingerScan 3s linear infinite" }} />
                  )}
                  {selectedLayer.id === "storage" && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full pointer-events-none opacity-[0.08]"
                      style={{ border: `2px dashed ${selectedLayer.accent}`, animation: "discSpin 8s linear infinite" }}>
                      <div className="absolute inset-[30px] rounded-full" style={{ border: `1px dashed ${selectedLayer.accent}`, animation: "discSpin 5s linear infinite reverse" }} />
                    </div>
                  )}
                  {selectedLayer.id === "privacy" && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none"
                      style={{ border: `2px solid ${selectedLayer.accent}40`, borderRadius: "50%", animation: "lockPulse 2s ease-in-out infinite" }}>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-5 rounded-sm" style={{ background: `${selectedLayer.accent}30` }} />
                    </div>
                  )}
                  {selectedLayer.id === "arbiter" && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="absolute w-3 h-3 rounded-full" style={{ background: `${selectedLayer.accent}30`, animation: `nodeOrbit ${3 + i}s linear infinite`, animationDelay: `${i * 0.8}s` }} />
                      ))}
                    </div>
                  )}
                  {selectedLayer.id === "economy" && (
                    <div className="absolute bottom-6 right-8 flex gap-1 pointer-events-none opacity-[0.12]">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full" style={{ background: selectedLayer.accent, animation: `coinBounce 1.5s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  )}
                  {selectedLayer.id === "interface" && (
                    <div className="absolute left-0 right-0 h-[2px] pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${selectedLayer.accent}50, transparent)`, animation: "scanLine 2.5s linear infinite" }} />
                  )}
                </div>

                {/* Top accent glow */}
                <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
                  style={{ background: `linear-gradient(90deg, transparent, ${selectedLayer.accent}, transparent)`, boxShadow: `0 0 20px ${selectedLayer.accent}60` }} />

                {/* Card content — padded to fit inside clip-path shapes */}
                <div className="relative z-10" style={{
                  padding: selectedLayer.id === "identity" ? "60px 28px 28px"
                    : selectedLayer.id === "privacy" ? "40px 48px"
                    : selectedLayer.id === "arbiter" ? "60px 48px"
                    : "28px",
                }}>
                  {/* Module tag */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: selectedLayer.accent, boxShadow: `0 0 8px ${selectedLayer.accent}` }} />
                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: `${selectedLayer.accent}90` }}>
                      SYS.LAYER_0{LAYERS.findIndex(l => l.id === selectedLayer.id) + 1}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-wide uppercase mb-1">{selectedLayer.label}</h3>
                  <p className="text-[10px] font-mono mb-5" style={{ color: `${selectedLayer.accent}60` }}>{selectedLayer.sublabel}</p>

                  <p className="text-[13px] text-white/50 leading-relaxed mb-6">{selectedLayer.description}</p>

                  {/* Stats row */}
                  <div className="flex gap-4 mb-5">
                    {Object.entries(selectedLayer.stats).map(([key, value], i) => (
                      <div key={key} className="flex-1">
                        <div className="text-[8px] font-mono uppercase tracking-[0.15em] mb-1" style={{ color: `${selectedLayer.accent}50` }}>{key}</div>
                        <div className="text-[13px] font-mono font-bold text-white">{value}</div>
                        <div className="w-full h-[2px] mt-1.5 overflow-hidden rounded-full" style={{ background: `${selectedLayer.accent}15` }}>
                          <motion.div className="h-full rounded-full" style={{ background: selectedLayer.accent }}
                            initial={{ width: 0 }} animate={{ width: `${60 + i * 15}%` }} transition={{ duration: 0.8, delay: i * 0.12 }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mini layer selector */}
                  <div className="flex gap-1.5">
                    {LAYERS.map(l => (
                      <button key={l.id} onClick={(e) => { e.stopPropagation(); setSelectedId(l.id); }}
                        className="flex-1 h-[6px] rounded-full transition-all duration-300"
                        style={{ background: selectedLayer.id === l.id ? l.accent : `${l.accent}20`, boxShadow: selectedLayer.id === l.id ? `0 0 8px ${l.accent}50` : "none" }} />
                    ))}
                  </div>

                  {/* Telemetry */}
                  <div className="mt-5 flex justify-between items-center text-[8px] font-mono" style={{ color: `${selectedLayer.accent}35` }}>
                    <span>{selectedLayer.accent}</span>
                    <div className="flex items-center gap-[2px]">
                      {[1, 2, 3, 4, 5, 6].map(bar => (
                        <motion.div key={bar} className="w-[2px] rounded-full" style={{ background: selectedLayer.accent }}
                          animate={{ height: [3, 10 + bar * 1.5, 3] }} transition={{ duration: 1, repeat: Infinity, delay: bar * 0.12 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 15l-2 5L9 9l11 4-5 2z" /><path d="M15 15l5 5" />
                  </svg>
                </div>
                <p className="text-[13px] text-white/25 font-mono tracking-wide">HOVER OR CLICK TO INSPECT</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
