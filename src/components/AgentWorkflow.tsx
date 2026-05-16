"use client";

/**
 * AgentWorkflow — n8n-style horizontal zigzag flow visualization.
 * Nodes are square (72x72) with icon + label below, handles on sides,
 * connected by curved SVG paths with animated dots AND data-payload pills.
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Brain,
  Wrench,
  Cpu,
  ShieldCheck,
  Link as LinkIcon,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Geometry ──────────────────────────────────────────────────────────────────
// 1200×700 viewBox gives comfortable horizontal spread within a responsive container.
const VIEW_W = 1200;
const VIEW_H = 700;

interface NodeDef {
  id: string;
  x: number;
  y: number;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  isTrigger?: boolean;
  badge?: string;
  skillsIcons?: boolean;
  progressBar?: boolean;
  glowClass?: string;
  titleGlow?: boolean;
  titleColor?: string;
}

const NODES: NodeDef[] = [
  {
    id: "trigger", x: 100, y: 350,
    label: "JOB TRIGGERED", subtitle: "milestone defined",
    icon: Zap, color: "#47A9CF", isTrigger: true,
  },
  {
    id: "memory", x: 280, y: 230,
    label: "RECALL MEMORY", subtitle: "0G KV → Supabase",
    icon: Brain, color: "#09799E",
    badge: "12 client learnings",
  },
  {
    id: "skills", x: 460, y: 470,
    label: "RUN SKILLS", subtitle: "10 builtin + MCP",
    icon: Wrench, color: "#47A9CF",
    skillsIcons: true,
  },
  {
    id: "compute", x: 640, y: 230,
    label: "0G COMPUTE", subtitle: "0GM-1.0-35B-A3B",
    icon: Cpu, color: "#A6E0F4",
    glowClass: "glow-compute", titleGlow: true,
  },
  {
    id: "evaluate", x: 820, y: 470,
    label: "SELF-EVALUATE", subtitle: "min 8000 to pass",
    icon: ShieldCheck, color: "#47A9CF",
    progressBar: true,
  },
  {
    id: "submit", x: 1000, y: 230,
    label: "SUBMIT ON-CHAIN", subtitle: "release milestone",
    icon: LinkIcon, color: "#10b981",
    glowClass: "glow-terminal", titleGlow: true, titleColor: "#10b981",
  },
  {
    id: "notify", x: 1140, y: 350,
    label: "TELEGRAM NOTIFY", subtitle: "one-tap approve",
    icon: Send, color: "#47A9CF",
  },
];

interface PayloadDef {
  fromId: string;
  toId: string;
  label: string;
  color: string;
  duration: number;
  dashed?: boolean;
}

const PAYLOADS: PayloadDef[] = [
  { fromId: "trigger",  toId: "memory",   label: "{ event }",     color: "#47A9CF", duration: 3 },
  { fromId: "memory",   toId: "skills",   label: "[ context ]",   color: "#09799E", duration: 3 },
  { fromId: "skills",   toId: "compute",  label: "{ tools_res }", color: "#47A9CF", duration: 3 },
  { fromId: "compute",  toId: "evaluate", label: "[ thought ]",   color: "#A6E0F4", duration: 3 },
  { fromId: "evaluate", toId: "submit",   label: "pass: true",    color: "#47A9CF", duration: 3 },
  { fromId: "submit",   toId: "notify",   label: "0x8f...2a",     color: "#10b981", duration: 2.5 },
];

const RETRY_PAYLOAD: PayloadDef = {
  fromId: "evaluate", toId: "skills", label: "err: fail", color: "#f59e0b", duration: 5, dashed: true,
};

interface Connection {
  fromId: string;
  toId: string;
  color: string;
}

const FLOW: Connection[] = [
  { fromId: "trigger",  toId: "memory",   color: "#6b7280" },
  { fromId: "memory",   toId: "skills",   color: "#6b7280" },
  { fromId: "skills",   toId: "compute",  color: "#6b7280" },
  { fromId: "compute",  toId: "evaluate", color: "#6b7280" },
  { fromId: "evaluate", toId: "submit",   color: "#6b7280" },
  { fromId: "submit",   toId: "notify",   color: "#6b7280" },
];

const LOOP_BACK = { fromId: "evaluate", toId: "skills", color: "#f59e0b" } as const;

function nodeById(id: string): NodeDef {
  const n = NODES.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown node id: ${id}`);
  return n;
}

// 36px is exactly half of the 72px node width
function handleRight(n: NodeDef) {
  return { x: n.x + 36, y: n.y };
}
function handleLeft(n: NodeDef) {
  return { x: n.x - 36, y: n.y };
}

function curvePath(a: NodeDef, b: NodeDef): string {
  const from = handleRight(a);
  const to = handleLeft(b);
  const dx = to.x - from.x;
  return `M ${from.x} ${from.y} C ${from.x + dx * 0.45} ${from.y}, ${to.x - dx * 0.45} ${to.y}, ${to.x} ${to.y}`;
}

function loopBackPath(): string {
  const a = nodeById(LOOP_BACK.fromId);
  const b = nodeById(LOOP_BACK.toId);
  const ax = a.x;
  const ay = a.y + 42; // Bottom handle offset
  const bx = b.x;
  const by = b.y + 42; // Bottom handle offset
  const dropY = 580; // Dip deeply below the nodes
  return `M ${ax} ${ay} C ${ax} ${dropY}, ${bx} ${dropY}, ${bx} ${by}`;
}

function masterFlowPath(): string {
  const order = ["trigger", "memory", "skills", "compute", "evaluate", "submit"];
  let d = "";
  for (let i = 0; i < order.length - 1; i++) {
    const a = nodeById(order[i]);
    const b = nodeById(order[i + 1]);
    const from = handleRight(a);
    const to = handleLeft(b);
    const dx = to.x - from.x;
    if (i === 0) {
      d += `M ${from.x} ${from.y} `;
    }
    d += `C ${from.x + dx * 0.45} ${from.y}, ${to.x - dx * 0.45} ${to.y}, ${to.x} ${to.y} `;
    if (i < order.length - 2) {
      d += `L ${handleRight(b).x} ${handleRight(b).y} `;
    }
  }
  return d;
}

function branchPath(): string {
  const a = nodeById("submit");
  const b = nodeById("notify");
  const from = handleRight(a);
  const to = handleLeft(b);
  return `M ${from.x} ${from.y} C ${from.x + 30} ${from.y}, ${to.x - 30} ${to.y}, ${to.x} ${to.y}`;
}

function N8NNodeCard({ node, index }: { node: NodeDef; index: number }) {
  const Icon = node.icon;

  return (
    // PENTING: Wrapper statis ini MENGUNCI posisi transform agar tidak diganggu framer-motion
    <div
      className="absolute z-20"
      style={{
        left: `${(node.x / VIEW_W) * 100}%`,
        top: `${(node.y / VIEW_H) * 100}%`,
        transform: `translate(-50%, -50%)`, // Posisi titik tengah akurat
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.1 * index, ease: [0.25, 0.4, 0.25, 1] }}
        className="flex flex-col items-center group"
      >
        {/* Box Utama Node - Ukuran Pixel Fix 72x72px */}
        <div
          className={`
            w-[72px] h-[72px] bg-[#26292e] rounded-xl border flex items-center justify-center relative
            shadow-[0_4px_12px_rgba(0,0,0,0.3)]
            transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)]
            ${node.isTrigger ? "rounded-l-xl rounded-r-[35px]" : ""}
            ${node.glowClass === "glow-compute" ? "shadow-[0_0_20px_rgba(166,224,244,0.15),inset_0_0_8px_rgba(166,224,244,0.05)]" : ""}
            ${node.glowClass === "glow-terminal" ? "shadow-[0_0_20px_rgba(16,185,129,0.2),inset_0_0_8px_rgba(16,185,129,0.05)]" : ""}
          `}
          style={{ borderColor: node.color }}
        >
          <Icon
            className="w-7 h-7"
            style={{
              color: node.color,
              filter: node.titleGlow
                ? `drop-shadow(0 0 6px ${node.color})`
                : node.isTrigger
                ? `drop-shadow(0 0 8px ${node.color})`
                : "none",
            }}
          />

          {/* Handle Kiri */}
          {!node.isTrigger && (
            <div
              className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#1a1c20] border-2 z-25"
              style={{ borderColor: node.color }}
            />
          )}

          {/* Handle Kanan */}
          <div
            className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#1a1c20] border-2 z-25"
            style={{ borderColor: node.color }}
          />

          {/* Pulse Dot (Hanya di Trigger) */}
          {node.isTrigger && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
              style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }}
            />
          )}

          {/* Handle Bawah untuk Retry Loop (Skills) */}
          {node.id === "skills" && (
            <div
              className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#1a1c20] border-2 z-25"
              style={{ borderColor: node.color }}
            />
          )}

          {/* Handle Bawah untuk Retry Loop (Evaluate) */}
          {node.id === "evaluate" && (
            <div
              className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#1a1c20] border-2 z-25"
              style={{ borderColor: LOOP_BACK.color }}
            />
          )}
        </div>

        {/* Info Teks di Bawah Node (Dibuat ABSOLUTE agar tidak menambah tinggi container yang merusak titik tengah Y) */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 text-center flex flex-col items-center gap-0.5 min-w-[200px]">
          <span
            className={`text-[12px] font-medium leading-tight whitespace-nowrap ${
              node.titleGlow ? `drop-shadow-[0_0_2px_${node.color}]` : ""
            }`}
            style={{ color: node.titleColor || "#f3f4f6" }}
          >
            {node.label}
          </span>
          <span
            className="text-[10px] font-mono whitespace-nowrap"
            style={{ color: node.id === "compute" ? node.color : "#9ca3af" }}
          >
            {node.subtitle}
          </span>

          {node.badge && (
            <div className="mt-0.5 bg-white/5 border border-white/10 rounded-full px-2 py-[1px] text-[8px] text-white/70 tracking-wide whitespace-nowrap">
              {node.badge}
            </div>
          )}

          {node.skillsIcons && (
            <div className="flex gap-1 mt-1" style={{ color: node.color, filter: `drop-shadow(0 0 2px ${node.color})` }}>
              <span className="text-[11px]">🔍</span>
              <span className="text-[11px]">💻</span>
              <span className="text-[11px]">🌐</span>
              <span className="text-[11px]">📊</span>
              <span className="text-[11px]">✉️</span>
            </div>
          )}

          {node.progressBar && (
            <div className="w-[90px] mt-1">
              <div className="w-full bg-black/60 border border-white/10 rounded-full h-1 overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ width: "85%", background: node.color, boxShadow: `0 0 4px ${node.color}` }}
                />
              </div>
              <div className="text-[8px] font-mono text-white/50 w-full text-right mt-0.5">8500/10000</div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function DataPayload({ payload, pathId }: { payload: PayloadDef; pathId: string }) {
  const halfW = payload.label.length * 3.5 + 6;
  return (
    <g opacity={0}>
      <rect
        x={-halfW}
        y={-12}
        width={halfW * 2}
        height={24}
        rx={12}
        fill="#26292e"
        stroke={payload.color}
        strokeWidth={1}
        strokeDasharray={payload.dashed ? "2 2" : "none"}
      />
      <text
        x={0}
        y={3.5}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize={10}
        fill={payload.color}
        fontWeight={500}
        textAnchor="middle"
      >
        {payload.label}
      </text>
      <animateMotion
        dur={`${payload.duration}s`}
        repeatCount="indefinite"
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0; 1; 1; 0"
        keyTimes="0; 0.15; 0.85; 1"
        dur={`${payload.duration}s`}
        repeatCount="indefinite"
      />
    </g>
  );
}

export default function AgentWorkflow() {
  const masterPath = masterFlowPath();
  const loopPath = loopBackPath();
  const branch = branchPath();

  const payloadPaths = PAYLOADS.map((p) => {
    const a = nodeById(p.fromId);
    const b = nodeById(p.toId);
    return curvePath(a, b);
  });

  const retryPathStr = loopBackPath();

  return (
    <div className="relative w-full py-8 flex justify-center bg-black">
      {/* Box Pembungkus Utama (Menjaga Rasio Tetap Sama) */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121315] shadow-2xl"
        style={{
          width: "100%",
          maxWidth: "1200px",
          aspectRatio: `${VIEW_W} / ${VIEW_H}`,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          backgroundPosition: "center center",
        }}
      >
        {/* Glow Latar Belakang */}
        <div
          className="absolute pointer-events-none z-[1]"
          style={{
            top: "44%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "70%", height: "35%",
            background: "linear-gradient(90deg, transparent, rgba(71,169,207,0.04), transparent)",
            filter: "blur(60px)",
          }}
        />

        {/* Ornamen Pojok (Brackets) */}
        <div className="absolute w-4 h-4 border-t border-l border-white/15 z-10" style={{ top: "3%", left: "3%" }} />
        <div className="absolute w-4 h-4 border-t border-r border-white/15 z-10" style={{ top: "3%", right: "3%" }} />
        <div className="absolute w-4 h-4 border-b border-l border-white/15 z-10" style={{ bottom: "3%", left: "3%" }} />
        <div className="absolute w-4 h-4 border-b border-r border-white/15 z-10" style={{ bottom: "3%", right: "3%" }} />

        {/* SVG Layer Khusus Untuk Garis/Konektor */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <marker id="arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#6b7280" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>

            <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Path Tersembunyi (Referensi Animasi Saja) */}
            <path id="main-flow-path" d={masterPath} fill="none" />
            <path id="branch-flow-path" d={branch} fill="none" />
            <path id="loopback-path" d={loopPath} fill="none" />

            {/* Path Payload Spesifik */}
            {payloadPaths.map((d, i) => (
              <path key={`payload-path-${i}`} id={`payload-path-${i}`} d={d} fill="none" />
            ))}
            <path id="retry-payload-path" d={retryPathStr} fill="none" />
          </defs>

          {/* Menggambar Garis Workflow (Utama) */}
          {FLOW.map((c, i) => {
            const a = nodeById(c.fromId);
            const b = nodeById(c.toId);
            return (
              <motion.path
                key={`stroke-${i}`}
                d={curvePath(a, b)}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeLinecap="round"
                markerEnd="url(#arrow-gray)"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.15 * i, ease: "easeInOut" }}
              />
            );
          })}

          {/* Menggambar Garis Loop-back Retry */}
          <motion.path
            d={loopPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.8}
            markerEnd="url(#arrow-amber)"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.8 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 1.4, ease: "easeInOut" }}
          />

          {/* Titik Animasi Bersinar */}
          <g filter="url(#dot-glow)">
            {[0, 1, 2].map((i) => (
              <circle key={`main-dot-${i}`} r={2.5} fill="#A6E0F4">
                <animateMotion
                  dur="10s"
                  repeatCount="indefinite"
                  begin={`${-i * 3.33}s`}
                  rotate="auto"
                >
                  <mpath href="#main-flow-path" />
                </animateMotion>
              </circle>
            ))}
            <circle r={2} fill="#A6E0F4">
              <animateMotion dur="3s" repeatCount="indefinite" begin="0s" rotate="auto">
                <mpath href="#branch-flow-path" />
              </animateMotion>
            </circle>
          </g>

          <circle r={2} fill="#f59e0b" filter="url(#dot-glow)" opacity={0.85}>
            <animateMotion dur="5s" repeatCount="indefinite" begin="2s" rotate="auto">
              <mpath href="#loopback-path" />
            </animateMotion>
          </circle>

          {/* Render Komponen UI Payload Data berjalan */}
          {PAYLOADS.map((p, i) => (
            <DataPayload key={`payload-${i}`} payload={p} pathId={`payload-path-${i}`} />
          ))}
          <DataPayload payload={RETRY_PAYLOAD} pathId="retry-payload-path" />
        </svg>

        {/* Teks Label Retry */}
        <div
          className="absolute z-20"
          style={{ left: "53%", top: "85%", transform: "translateX(-50%)" }}
        >
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 2 }}
            className="font-mono text-[9px] bg-[#1a1c20] border border-amber-500/30 px-2 py-0.5 rounded-full text-amber-400"
          >
            retry × 3
          </motion.div>
        </div>

        {/* Render Komponen UI HTML Node */}
        {NODES.map((node, i) => (
          <N8NNodeCard key={node.id} node={node} index={i} />
        ))}

        {/* Footer Statistik */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#121315]/90 backdrop-blur-sm px-6 py-3 flex justify-between z-20">
          <div className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0">
            <div className="text-lg font-mono text-[#f3f4f6] font-medium tracking-tight">8000+</div>
            <div className="text-[9px] text-white/40 tracking-widest mt-1 uppercase">Min Quality</div>
          </div>
          <div className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0">
            <div className="text-lg font-mono text-[#f3f4f6] font-medium tracking-tight">3×</div>
            <div className="text-[9px] text-white/40 tracking-widest mt-1 uppercase">Retries</div>
          </div>
          <div className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0">
            <div className="text-lg font-mono text-[#f3f4f6] font-medium tracking-tight">10+</div>
            <div className="text-[9px] text-white/40 tracking-widest mt-1 uppercase">Skills</div>
          </div>
          <div className="flex flex-col items-center flex-1">
            <div className="text-lg font-mono text-[#f3f4f6] font-medium tracking-tight">197</div>
            <div className="text-[9px] text-white/40 tracking-widest mt-1 uppercase">Tests</div>
          </div>
        </div>
      </div>
    </div>
  );
}
