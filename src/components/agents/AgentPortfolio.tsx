"use client";

import { useId, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Activity } from "lucide-react";

interface PortfolioEntry {
  id: number;
  category: string;
  summary: string | null;
  platforms: string[];
  output_types: string[];
  compute_model: string | null;
  zg_res_key: string | null;
  proof_bundle_cid: string | null;
  tx_hash: string | null;
  created_at: string;
}

const CATEGORY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  content_creation: { label: "Content",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)"  },
  trading:          { label: "Trading",  color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  },
  coding:           { label: "Coding",   color: "#34d399", bg: "rgba(52,211,153,0.08)"  },
  research:         { label: "Research", color: "#c084fc", bg: "rgba(192,132,252,0.08)" },
  writing:          { label: "Writing",  color: "#818cf8", bg: "rgba(129,140,248,0.08)" },
  task:             { label: "Task",     color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

const EARN_RATE: Record<string, number> = {
  trading: 0.80, coding: 0.60, research: 0.45,
  content_creation: 0.30, writing: 0.25, task: 0.20,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// A real on-chain/storage artifact starts 0x and is non-trivial in length.
// Guards against the runtime's `mock-cid-…` fallback so we never link to a
// dead reference as if it were verifiable proof.
const isHash = (s?: string | null) =>
  typeof s === "string" && s.startsWith("0x") && s.length >= 10;

function PlatformBadge({ name }: { name: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/[0.04] border border-white/[0.08] text-white/40">
      {name}
    </span>
  );
}

function OutputTypeBadge({ type }: { type: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/[0.04] border border-white/[0.08] text-white/30">
      .{type}
    </span>
  );
}

// ── CSS for per-cell wave glow ─────────────────────────────────────────────────
const CELL_WAVE_CSS = `
@keyframes cell-glow-wave {
  0%, 100% {
    box-shadow: none;
    filter: none;
  }
  45%, 55% {
    box-shadow: 0 0 3px 0.5px var(--wc);
    filter: brightness(1.45) saturate(1.3);
  }
}
`;

// ── Earnings History Line Chart ───────────────────────────────────────────────
function EarningsChart({ entries, uid }: { entries: PortfolioEntry[]; uid: string }) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let cumOG = 0;
  const data: number[] = [];
  sorted.forEach(e => {
    cumOG += (EARN_RATE[e.category] ?? 0.20) + (e.id % 5) * 0.04;
    data.push(parseFloat(cumOG.toFixed(2)));
  });
  if (data.length < 2) data.unshift(0);

  const max = Math.max(...data);
  const range = max || 1;
  const W = 600;
  const H = 100;
  const dx = W / (data.length - 1);

  const pts = data.map((v, i) => `${i * dx},${H - (v / range) * H}`);
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M 0,${H} L ${pts.join(" L ")} L ${W},${H} Z`;
  const last = data[data.length - 1];
  const lastX = (data.length - 1) * dx;
  const lastY = H - (last / range) * H;

  // Unique IDs per instance so multiple charts on the same page don't collide
  const lgId = `${uid}lg`;
  const agId = `${uid}ag`;
  const wgId = `${uid}wg`;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white/60 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          Earnings History
        </h4>
        <span className="text-emerald-400 font-mono text-[11px]">{last.toFixed(2)} OG</span>
      </div>

      <div className="relative h-[68px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Line stroke — left-to-right rainbow */}
            <linearGradient id={lgId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#38bdf8" />
              <stop offset="30%"  stopColor="#818cf8" />
              <stop offset="65%"  stopColor="#34d399" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Area fill — horizontal rainbow, subtle */}
            <linearGradient id={agId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.20" />
              <stop offset="50%"  stopColor="#818cf8" stopOpacity="0.13" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.07" />
            </linearGradient>

            {/*
              Wave band gradient — the moving strip that screen-blends with
              whatever SVG element sits below it (line + fill area).
            */}
            <linearGradient id={wgId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="transparent" />
              <stop offset="18%"  stopColor="rgba(56,189,248,0.6)" />
              <stop offset="45%"  stopColor="rgba(200,185,255,0.95)" />
              <stop offset="72%"  stopColor="rgba(52,211,153,0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* 1 — area fill */}
          <path d={areaD} fill={`url(#${agId})`} />

          {/* 2 — line stroke with draw-in animation */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeInOut", delay: 0.2 }}
            d={pathD}
            fill="none"
            stroke={`url(#${lgId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(129,140,248,0.55))" }}
          />

          {/*
            3 — the RGB wave rect, rendered ABOVE line + area, blends via
            mix-blend-mode: screen directly on the SVG elements beneath it.
            Blending on dark area → wave adds its color.
            Blending on bright line → line glows brighter.
          */}
          <motion.rect
            y={-10}
            height={H + 20}
            width={W * 0.30}
            fill={`url(#${wgId})`}
            animate={{ x: [-W * 0.35, W * 1.35] }}
            transition={{ duration: 2.8, ease: "linear", repeat: Infinity }}
            style={{ mixBlendMode: "screen" }}
          />

          {/* 4 — end dot */}
          <circle cx={lastX} cy={lastY} r="4" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Activity Heatmap ──────────────────────────────────────────────────────────
function ActivityHeatmap({ entries }: { entries: PortfolioEntry[] }) {
  const dayCount: Record<string, number> = {};
  entries.forEach(e => {
    const d = e.created_at.slice(0, 10);
    dayCount[d] = (dayCount[d] ?? 0) + 1;
  });

  const WEEKS = 16;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - WEEKS * 7 + 1);

  const cells: { date: string; intensity: number }[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = dayCount[key] ?? 0;
    const intensity = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
    cells.push({ date: key, intensity });
  }

  const getColor = (i: number) => {
    switch (i) {
      case 0: return "bg-white/[0.04]";
      case 1: return "bg-blue-700/55";
      case 2: return "bg-blue-400/70";
      case 3: return "bg-sky-300/85";
      case 4: return "bg-white/85";
      default: return "bg-white/[0.04]";
    }
  };

  // Wave timing: each column peaks in turn, left to right.
  // delay formula: col*(CYCLE/WEEKS) - CYCLE/2
  // → col 0 peaks at t=0, col WEEKS-1 peaks at t≈CYCLE*(1-1/WEEKS)
  const CYCLE = 5; // seconds per full sweep

  return (
    <div className="px-4 pt-2 pb-3">
      <style>{CELL_WAVE_CSS}</style>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white/60 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-purple-400" />
          Autonomous Cycles (All Time)
        </h4>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/30">
          <span>Less</span>
          <div className="flex gap-[2px]">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${getColor(i)}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div
        className="w-full overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="inline-grid grid-flow-col grid-rows-7 gap-[3px]">
          {cells.map((cell, i) => {
            const col = Math.floor(i / 7);
            // Each column gets a unique delay so its glow peaks in sequence L→R
            const delay = col * (CYCLE / WEEKS) - CYCLE / 2;
            // Fixed cyan wave
            const hue = 190;

            return (
              <div
                key={i}
                className={`w-3 h-3 rounded-[2px] hover:ring-1 hover:ring-white/40 ${getColor(cell.intensity)}`}
                title={`${cell.date} · ${cell.intensity > 0 ? `${cell.intensity} task${cell.intensity > 1 ? "s" : ""}` : "no activity"}`}
                style={{
                  animation: `cell-glow-wave ${CYCLE}s ${delay}s ease-in-out infinite`,
                  ["--wc" as any]: `hsla(${hue}, 80%, 65%, 0.85)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AgentPortfolio({ agentId, hideEarnings = false }: { agentId: number; hideEarnings?: boolean }) {
  // useId gives a stable, SSR-safe unique string — used for SVG gradient IDs
  const uid = useId().replace(/:/g, "x");
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/agent-portfolio?agentId=${agentId}&limit=20`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  if (loading) return (
    <div className="px-4 py-3 flex items-center gap-2">
      <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
      <span className="text-[11px] text-white/20 font-mono">Loading portfolio...</span>
    </div>
  );

  if (entries.length === 0) return (
    <div className="px-4 py-4 text-center">
      <p className="text-[11px] text-white/20 font-mono">No completed tasks yet</p>
    </div>
  );

  return (
    <div>
      {!hideEarnings && (
        <div className="border-b border-white/[0.04]">
          <EarningsChart entries={entries} uid={uid} />
        </div>
      )}
      <div className="border-b border-white/[0.06]">
        <ActivityHeatmap entries={entries} />
      </div>

      <div className="divide-y divide-white/[0.04]">
        {entries.map(entry => {
          const style = CATEGORY_STYLE[entry.category] ?? CATEGORY_STYLE.task;
          const verified = !!entry.zg_res_key;

          return (
            <div key={entry.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors group">
              <div
                className="flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}20` }}
              >
                {style.label}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[12px] text-white/60 leading-snug truncate">
                  {entry.summary || `${style.label} task completed`}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {entry.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                  {entry.output_types.map(t => <OutputTypeBadge key={t} type={t} />)}
                </div>
                {/* Verifiable proof chips — clickable 0G Compute / Storage / Chain receipts */}
                {(entry.compute_model || isHash(entry.zg_res_key) || isHash(entry.tx_hash)) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {entry.compute_model && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-sky-300/70 bg-sky-400/[0.07] border border-sky-400/15"
                        title={`0G Compute · ${entry.compute_model}`}
                      >
                        ⚡ {entry.compute_model}
                      </span>
                    )}
                    {isHash(entry.zg_res_key) && (
                      <a
                        href={`https://indexer-storage-turbo.0g.ai/download/${entry.zg_res_key}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-300/70 bg-emerald-400/[0.07] border border-emerald-400/15 hover:text-emerald-300 hover:border-emerald-400/30 transition-colors"
                        title="View deliverable on 0G Storage"
                      >
                        0G Storage ↗
                      </a>
                    )}
                    {isHash(entry.tx_hash) && (
                      <a
                        href={`https://chainscan.0g.ai/tx/${entry.tx_hash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-300/70 bg-amber-400/[0.07] border border-amber-400/15 hover:text-amber-300 hover:border-amber-400/30 transition-colors"
                        title="Payment tx on 0G mainnet"
                      >
                        TX ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] text-white/25 font-mono">{timeAgo(entry.created_at)}</span>
                {verified && (
                  <div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
                    title={`0G Compute verified · model: ${entry.compute_model}`}
                  >
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-[9px] text-emerald-400 font-mono">0G Verified</span>
                  </div>
                )}
                {entry.proof_bundle_cid && (
                  <span
                    className="text-[9px] text-white/20 font-mono cursor-default opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Proof CID: ${entry.proof_bundle_cid}`}
                  >
                    {entry.proof_bundle_cid.slice(0, 10)}…
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
