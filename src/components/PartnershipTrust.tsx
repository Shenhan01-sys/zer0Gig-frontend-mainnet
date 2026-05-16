"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Handshake, GraduationCap, Layers, ExternalLink, Quote } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PartnershipTrust — landing-page trust layer.
//
//   1. BUILT ON     — twelve real infrastructure tiles with branded logos
//   2. VALIDATED BY — stakeholder pods with geometric avatars + quotes
//   3. ONBOARDING   — Jadid coalition + 5-8 PT pipeline placeholders
//
// Tools and stakeholder pods were originally rendered inside IndonesiaBridge
// but consolidated here so the "Built on" and "Validated by" subsections
// share a single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

// ── DATA ─────────────────────────────────────────────────────────────────────

type Tool = {
  name:    string;
  sub:     string;
  brand:   string;        // hex without #
  cdn?:    string;        // simple-icons.org slug
  inline?: "zg";          // use 0G stack glyph
};

const TOOLS: Tool[] = [
  { name: "0G Chain",    sub: "Settlement layer",   brand: "7C5CFF", inline: "zg" },
  { name: "0G Storage",  sub: "Encrypted briefs",   brand: "7C5CFF", inline: "zg" },
  { name: "0G Compute",  sub: "LLM inference",      brand: "7C5CFF", inline: "zg" },
  { name: "0G KV",       sub: "Agent memory",       brand: "7C5CFF", inline: "zg" },
  { name: "Supabase",    sub: "Profile + activity", brand: "3ECF8E", cdn: "supabase" },
  { name: "Vercel",      sub: "Frontend hosting",   brand: "FFFFFF", cdn: "vercel" },
  { name: "Next.js",     sub: "App framework",      brand: "FFFFFF", cdn: "nextdotjs" },
  { name: "Ethereum",    sub: "EVM execution",      brand: "627EEA", cdn: "ethereum" },
  { name: "Solidity",    sub: "Smart contracts",    brand: "AAAAAA", cdn: "solidity" },
  { name: "TypeScript",  sub: "Runtime + frontend", brand: "3178C6", cdn: "typescript" },
  { name: "Framer",      sub: "Motion choreo",      brand: "FFFFFF", cdn: "framer" },
  { name: "Foundry",     sub: "Contract tests",     brand: "FFFFFF", cdn: "foundry" },
];

const STAKEHOLDERS = [
  {
    initials: "HG",
    name:     "Hans Gunawan",
    role:     "Founder · Indonesia",
    quote:    "Built this because paying USD for tools my warung neighbor can't afford felt wrong.",
    accentA:  "#38BDF8",
    accentB:  "#0EA5E9",
    stamp:    "founder",
  },
  {
    initials: "JP",
    name:     "Jadid Purwaka Aji",
    role:     "ID Startup Ecosystem · Coalition Lead",
    quote:    "5–8 PT partners onboarding through Q3 2026. The on-ramp is concrete, not vapor.",
    accentA:  "#34D399",
    accentB:  "#059669",
    stamp:    "partner",
  },
  {
    initials: "HB",
    name:     "Halim Budi Santoso",
    role:     "Head of Computing, UKDW Yogyakarta",
    quote:    "ERC-7857 + ERC-8183 are the standards to watch. zer0Gig shipped them first.",
    accentA:  "#FBBF24",
    accentB:  "#D97706",
    stamp:    "academic",
  },
  {
    initials: "0G",
    name:     "0G APAC Hackathon",
    role:     "Track 3 · Agentic Economy",
    quote:    "First intelligent-NFT + agentic-commerce stack live on 0G Aristotle.",
    accentA:  "#C084FC",
    accentB:  "#7C3AED",
    stamp:    "ecosystem",
  },
];

// ── COMPONENT ────────────────────────────────────────────────────────────────

export default function PartnershipTrust() {
  return (
    <section className="relative w-full bg-black py-24 px-6 overflow-hidden">
      <div className="relative max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-12 text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/55 mb-5 font-mono uppercase tracking-widest">
            <Handshake className="w-3.5 h-3.5" />
            Trust Layer
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium mb-4 text-white">
            Built on real infrastructure.
            <br className="hidden sm:block" />
            <span className="text-white/55">Backed by real people.</span>
          </h2>
          <p className="text-white/55 text-[14px] max-w-xl mx-auto">
            No vapor logos. Three honest layers of trust — the rails we run, the people who endorsed us, and the pipeline we&apos;re onboarding next.
          </p>
        </motion.div>

        {/* ── 1. BUILT ON ──────────────────────────────────────────────────── */}
        <Section
          title="Built on"
          icon={<Layers className="w-4 h-4 text-white/55" />}
          subtitle="Twelve real dependencies running in production today"
          delay={0.1}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="group relative rounded-xl border border-white/10 bg-[#0d1525]/90 px-4 py-4 hover:border-white/25 hover:bg-[#0d1525] transition-all overflow-hidden"
              >
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 30% 0%, #${t.brand}22 0%, transparent 60%)`,
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10 shrink-0">
                    <ToolGlyph tool={t} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-medium truncate">{t.name}</p>
                    <p className="text-white/40 text-[10.5px] leading-snug truncate">{t.sub}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── 2. VALIDATED BY ─────────────────────────────────────────────── */}
        <Section
          title="Validated by"
          icon={<GraduationCap className="w-4 h-4 text-white/55" />}
          subtitle="Founder voice, academic validator, ecosystem partner, hackathon track"
          delay={0.2}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STAKEHOLDERS.map((s, i) => (
              <motion.div
                key={s.initials}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative rounded-2xl border border-white/10 bg-[#0d1525]/90 p-5 hover:border-white/20 transition-all"
              >
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[9px] font-mono uppercase tracking-widest text-white/45">
                  {s.stamp}
                </span>

                <AvatarBadge initials={s.initials} accentA={s.accentA} accentB={s.accentB} />

                <p className="text-white text-[14px] font-semibold leading-tight mb-0.5">{s.name}</p>
                <p className="text-white/45 text-[11px] leading-snug mb-4">{s.role}</p>

                <div className="relative pt-4 border-t border-white/[0.06]">
                  <Quote className="absolute -top-1 left-0 w-3 h-3 text-white/25" strokeWidth={2.5} />
                  <p className="text-white/65 text-[12px] leading-relaxed pl-5 italic">
                    {s.quote}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── 3. ONBOARDING NEXT ──────────────────────────────────────────── */}
        <Section
          title="Onboarding next"
          icon={<Handshake className="w-4 h-4 text-white/55" />}
          subtitle="Pipeline partners in motion — not a launch logo wall"
          delay={0.3}
        >
          <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-[260px]">
                <p className="text-white text-[15px] font-medium mb-1">
                  5–8 Indonesian PT partners
                </p>
                <p className="text-white/55 text-[13px] leading-relaxed">
                  Coalition opened on 2026-05-11 with{" "}
                  <a
                    href="https://www.linkedin.com/in/jadid-purwaka-aji-408961144/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white underline underline-offset-2 hover:no-underline"
                  >
                    Jadid Purwaka Aji
                  </a>
                  {" "}— Indonesia Startup Ecosystem Player &amp; Community Builder. Partners onboarding through Q3 2026.
                </p>
              </div>
              <Link
                href="/marketplace/agents-for-sale"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/15 hover:border-white/30 bg-white/[0.03] hover:bg-white/[0.06] text-[12px] font-medium text-white/75 hover:text-white transition-all shrink-0"
              >
                Browse Agents
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 opacity-40">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-dashed border-white/15 bg-[#050810]/40 px-2 py-3 text-center"
                >
                  <p className="text-[10px] uppercase font-mono tracking-widest text-white/40">
                    PT #{i + 1}
                  </p>
                  <p className="text-[9px] text-white/25 mt-0.5">Coming soon</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </section>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function Section({
  title, subtitle, icon, delay, children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="mb-10"
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-white/85 text-[12px] uppercase tracking-widest font-medium">
          {title}
        </p>
      </div>
      <p className="text-white/40 text-[12px] mb-4 pl-6">{subtitle}</p>
      {children}
    </motion.div>
  );
}

function ToolGlyph({ tool }: { tool: Tool }) {
  if (tool.inline === "zg") {
    return (
      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" style={{ color: `#${tool.brand}` }}>
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="6"  stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="16" cy="16" r="2"  fill="currentColor" />
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.simpleicons.org/${tool.cdn}/${tool.brand}`}
      alt={tool.name}
      className="w-5 h-5"
      loading="lazy"
    />
  );
}

function AvatarBadge({
  initials, accentA, accentB,
}: {
  initials: string;
  accentA:  string;
  accentB:  string;
}) {
  const dots = Array.from({ length: 12 }).map((_, i) => {
    const a = (initials.charCodeAt(0) * (i + 7)) % 360;
    return {
      cx: 32 + Math.cos((a * Math.PI) / 180) * (16 + (i % 3) * 4),
      cy: 32 + Math.sin((a * Math.PI) / 180) * (16 + (i % 3) * 4),
      r:  0.6 + (i % 3) * 0.3,
    };
  });

  return (
    <div className="relative w-14 h-14 mb-4">
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id={`avgrad-${initials}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={accentA} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accentB} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill={`url(#avgrad-${initials})`} stroke={accentA} strokeOpacity="0.35" strokeWidth="1" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={accentA} fillOpacity="0.45" />
        ))}
        <text
          x="32" y="38"
          textAnchor="middle"
          fill="white"
          style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.5, fontFamily: "ui-sans-serif, system-ui" }}
        >
          {initials}
        </text>
      </svg>
      <span
        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d1525]"
        style={{ background: accentA, boxShadow: `0 0 8px ${accentA}80` }}
      />
    </div>
  );
}
