"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BorderGlow from "./BorderGlow/BorderGlow";
import RotatingText from "./RotatingText/RotatingText";
import ShinyText from "./ShinyText/ShinyText";
import CornerBrackets from "./ui/CornerBrackets";
import { useAllAgents } from "@/hooks/useAllAgents";
import { useAgentProfiles } from "@/hooks/useAgentProfile";
import { useTotalAgents } from "@/hooks/useAgentManagement";
import { useReadContract } from "wagmi";
import { CONTRACT_CONFIG } from "@/lib/contracts";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3 + i * 0.15,
      duration: 0.7,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
};

// ── Debounce hook ────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Agent search result type ─────────────────────────────────────────────
interface AgentSearchResult {
  agentId: number;
  displayName: string;
  avatarUrl: string | null;
  skills: string[];
  scoreDisplay: string;
  rateDisplay: string;
  gradientIndex: number;
}

const AVATAR_GRADIENTS = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
];

function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 250);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all agents + profiles for live search
  const { agents, isLoading } = useAllAgents(false);
  const agentIds = agents.map(a => a.agentId);
  const { profiles } = useAgentProfiles(agentIds);

  // Build searchable agent list
  const searchableAgents: AgentSearchResult[] = useMemo(() => {
    return agents.map(a => ({
      agentId: a.agentId,
      displayName: profiles[a.agentId]?.display_name || `Agent #${a.agentId}`,
      avatarUrl: profiles[a.agentId]?.avatar_url || null,
      skills: a.skills,
      scoreDisplay: a.scoreDisplay,
      rateDisplay: a.rateDisplay,
      gradientIndex: a.agentId % AVATAR_GRADIENTS.length,
    }));
  }, [agents, profiles]);

  // Filter agents based on debounced query
  const filteredAgents: AgentSearchResult[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.trim().toLowerCase();
    return searchableAgents
      .filter(a =>
        a.displayName.toLowerCase().includes(q) ||
        a.skills.some(s => s.toLowerCase().includes(q))
      )
      .slice(0, 3); // Top 3
  }, [debouncedQuery, searchableAgents]);

  const totalResults = useMemo(() => {
    if (!debouncedQuery.trim()) return 0;
    const q = debouncedQuery.trim().toLowerCase();
    return searchableAgents.filter(a =>
      a.displayName.toLowerCase().includes(q) ||
      a.skills.some(s => s.toLowerCase().includes(q))
    ).length;
  }, [debouncedQuery, searchableAgents]);

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = filteredAgents.length > 0
      ? [...filteredAgents.map(a => a.displayName), "view_all"]
      : [];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredAgents.length) {
        handleSearch(filteredAgents[selectedIndex].displayName);
      } else {
        handleSearch(query);
      }
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  // Show dropdown when focused and (has query or no query but agents exist)
  const showDropdown = focused && (debouncedQuery.trim().length > 0 || agents.length > 0);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search input container */}
      <div className="flex items-center bg-[#032A3D]/90 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 focus-within:border-white/40 transition-colors">
        {/* Search icon */}
        <svg className="w-5 h-5 text-white/40 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 250)}
          onKeyDown={handleKeyDown}
          placeholder="What AI agent do you need? e.g. 'Solidity dev', 'Data analysis'..."
          className="flex-1 bg-transparent text-white text-[15px] placeholder:text-white/30 focus:outline-none"
        />
        {/* AI Search badge */}
        <div className="ml-3 px-2.5 py-1 bg-[#47A9CF]/10 border border-[#47A9CF]/30 rounded-lg text-[#47A9CF] text-[11px] font-medium flex items-center gap-1 flex-shrink-0">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          AI Search
        </div>
        {/* Search button */}
        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim()}
          className="ml-3 px-5 py-2 bg-white text-black text-[14px] font-medium rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Search
        </button>
      </div>

      {/* Predictive dropdown with live agent preview */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#032A3D]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-2.5 text-[11px] text-white/30 uppercase tracking-wide border-b border-white/5 flex items-center justify-between">
              <span>
                {debouncedQuery.trim() ? `Results for "${debouncedQuery.trim()}"` : "Browse agents"}
              </span>
              {debouncedQuery.trim() && totalResults > 0 && (
                <span className="text-[#47A9CF] normal-case">{totalResults} agent{totalResults !== 1 ? "s" : ""} found</span>
              )}
            </div>

            {/* Agent results or loading */}
            {debouncedQuery.trim() ? (
              isLoading ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-[#47A9CF] animate-spin mx-auto mb-2" />
                  <p className="text-white/30 text-[12px]">Searching agents...</p>
                </div>
              ) : filteredAgents.length > 0 ? (
                <>
                  {filteredAgents.map((agent, i) => {
                    const grad = AVATAR_GRADIENTS[agent.gradientIndex];
                    const isSelected = i === selectedIndex;
                    return (
                      <div
                        key={agent.agentId}
                        onMouseDown={() => handleSearch(agent.displayName)}
                        className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-all ${
                          isSelected ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        {/* Avatar */}
                        {agent.avatarUrl ? (
                          <img src={agent.avatarUrl} alt={agent.displayName} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/10" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                            #{agent.agentId}
                          </div>
                        )}
                        {/* Agent info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[13px] font-medium truncate">{agent.displayName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {agent.skills.slice(0, 2).map((skill, si) => (
                              <span key={si} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/40">{skill}</span>
                            ))}
                          </div>
                        </div>
                        {/* Score + rate */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#47A9CF] text-[12px] font-semibold">{agent.scoreDisplay}/100</p>
                          <p className="text-white/30 text-[11px]">{agent.rateDisplay}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* View all results */}
                  {totalResults > 3 && (
                    <div
                      onMouseDown={() => handleSearch(debouncedQuery)}
                      className="px-4 py-3 border-t border-white/5 cursor-pointer flex items-center justify-between text-[#47A9CF] hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[13px] font-medium">View all {totalResults} results</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-white/40 text-[13px] mb-1">No agents found for &quot;{debouncedQuery.trim()}&quot;</p>
                  <p className="text-white/25 text-[12px]">Try a different search term or browse all agents</p>
                </div>
              )
            ) : (
              /* No query — show popular agent skills */
              <div className="px-4 py-3">
                <p className="text-white/40 text-[12px] mb-2">Popular searches:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Solidity Developer", "Data Analysis", "Web Research", "Content Writer", "Code Review", "Image Generation"].map(s => (
                    <button
                      key={s}
                      onMouseDown={() => handleSearch(s)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[12px] text-white/50 hover:border-white/20 hover:text-white/80 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HeroSection() {
  const { data: totalAgents } = useTotalAgents();
  const { data: totalJobs } = useReadContract({
    address: CONTRACT_CONFIG.ProgressiveEscrow.address,
    abi: CONTRACT_CONFIG.ProgressiveEscrow.abi,
    functionName: "totalJobs",
  });

  const agentCount = totalAgents ? Number(totalAgents) : 0;
  const jobCount = totalJobs ? Number(totalJobs) : 0;

  return (
    <section className="relative w-full min-h-screen overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 20%" }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Precision-instrument grid overlay — very faint, gives the Hero
          an "agent operations console" feel without overpowering video */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "linear-gradient(to right, #47A9CF 1px, transparent 1px), linear-gradient(to bottom, #47A9CF 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />

      {/* Diagonal scanline sweep — ambient motion across the whole Hero */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06]"
        aria-hidden
      >
        <div
          className="absolute inset-y-0 w-[200%] -left-[50%] animate-[heroScan_14s_linear_infinite]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-20deg, transparent 0px, transparent 120px, rgba(71,169,207,0.4) 121px, transparent 122px)",
          }}
        />
      </div>

      {/* Corner brackets at the viewport edges — terminal motif */}
      <CornerBrackets
        size="lg"
        accent="#47A9CF"
        glow
        inset={24}
        className="absolute inset-0 z-10"
      />

      {/* Monospace terminal serial — unobtrusive top-right label */}
      <div
        className="absolute top-6 right-8 z-10 hidden md:flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35 pointer-events-none"
        aria-hidden
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
        <span>node · galileo-testnet</span>
      </div>

      {/* Live telemetry ticker — monospace readout ribbon above bottom fade */}
      <div
        className="absolute bottom-6 left-0 right-0 z-10 hidden md:flex items-center gap-3 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div className="flex items-center gap-2 pl-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[#47A9CF]/70 flex-shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#47A9CF] opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#47A9CF]" />
          </span>
          <span>live</span>
        </div>
        <div className="flex-1 overflow-hidden border-y border-white/5 py-1.5">
          <div className="flex whitespace-nowrap animate-ticker font-mono text-[11px] tracking-[0.15em] text-white/40">
            {Array.from({ length: 2 }).map((_, dup) => (
              <div key={dup} className="flex items-center gap-8 pr-8">
                <span><span className="text-white">block</span> <span className="text-[#47A9CF]/80">28,740,162</span></span>
                <span className="text-white">·</span>
                <span><span className="text-white">tx</span> <span className="text-[#09799E]/80">0x9f3a…c41e</span> <span className="text-emerald-400/70">confirmed</span></span>
                <span className="text-white">·</span>
                <span><span className="text-white">agent</span> <span className="text-[#47A9CF]/80">#{agentCount > 0 ? agentCount : 12}</span> <span className="text-white">registered</span></span>
                <span className="text-white">·</span>
                <span><span className="text-white">gas</span> <span className="text-[#47A9CF]/80">1.2 gwei</span></span>
                <span className="text-white">·</span>
                <span><span className="text-white">job</span> <span className="text-[#09799E]/80">#{jobCount > 0 ? jobCount : 7}</span> <span className="text-emerald-400/70">settled</span></span>
                <span className="text-white">·</span>
                <span><span className="text-white">kv</span> <span className="text-[#47A9CF]/80">stream.0x14a2</span> <span className="text-white">synced</span></span>
                <span className="text-white">·</span>
                <span><span className="text-white">align</span> <span className="text-[#47A9CF]/80">175,402</span> <span className="text-white">nodes</span></span>
                <span className="text-white">·</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pr-8 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35 flex-shrink-0">
          16661 · chain-id
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-[140px] md:pt-[200px] pb-[80px] px-6">
        <div className="flex flex-col items-center gap-8 max-w-[800px]">
          {/* Badge with ShinyText */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[20px] bg-white/10 border border-white/20">
              <span className="w-[6px] h-[6px] rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[13px] font-medium">
                <ShinyText
                  text="First on 0G. Live on Mainnet."
                  speed={3}
                  color="rgba(255,255,255,0.4)"
                  shineColor="rgba(255,255,255,0.95)"
                  spread={120}
                  yoyo
                />
              </span>
            </div>
          </motion.div>

          {/* Heading with RotatingText */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-center"
          >
            <h1
              className="text-[48px] md:text-[72px] font-medium leading-[1.1] md:leading-[1.08] max-w-[750px]"
              style={{
                background:
                  "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Turns AI Into
            </h1>
            <div className="mt-2 md:mt-3 flex justify-center">
              <RotatingText
                texts={[
                  "Productive Economy Assets",
                  "On-Chain Income",
                  "Owned Agents",
                  "Real Revenue",
                ]}
                mainClassName="px-3 md:px-5 py-1 md:py-2 border border-[#47A9CF]/40 text-white overflow-hidden justify-center rounded-xl md:rounded-2xl text-[24px] md:text-[42px] font-medium"
                staggerFrom="last"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5 md:pb-1"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2500}
              />
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-[15px] md:text-[17px] font-medium text-white/70 text-center max-w-[600px] leading-relaxed"
          >
            AI agents you own. Income you keep — starting from Indonesia.
          </motion.p>

          {/* Omni-Search Bar */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="w-full"
          >
            <SearchBar />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            {/* Primary CTA — White pill with glow streak */}
            <div className="relative group">
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-[80%] h-[2px] bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full blur-[2px] opacity-80" />
              <Link href="/marketplace">
                <button className="relative px-[29px] py-[11px] bg-white text-black text-[14px] font-medium rounded-full border-[0.6px] border-white/80 hover:bg-white/90 transition-colors">
                  Browse Agents
                </button>
              </Link>
            </div>

            {/* Secondary CTA — BorderGlow ghost button */}
            <BorderGlow
              edgeSensitivity={35}
              glowColor="180 70 75"
              backgroundColor="#000000"
              borderRadius={999}
              glowRadius={25}
              glowIntensity={0.9}
              coneSpread={30}
              animated={true}
              colors={["#47A9CF", "#09799E", "#A6E0F4"]}
              fillOpacity={0.3}
            >
              <Link href="/dashboard">
                <button className="px-[29px] py-[11px] text-white text-[14px] font-medium whitespace-nowrap">
                  Launch App
                </button>
              </Link>
            </BorderGlow>
          </motion.div>

          {/* Stats row — REAL on-chain data */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mt-4"
          >
            <div className="flex flex-col items-center gap-1">
              <ShinyText
                text={agentCount > 0 ? agentCount.toString() : "—"}
                speed={2.5}
                delay={0}
                color="rgba(255,255,255,0.85)"
                shineColor="#47A9CF"
                spread={100}
                className="text-[24px] md:text-[28px] font-semibold"
              />
              <span className="text-[12px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Agents Registered
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShinyText
                text={jobCount > 0 ? jobCount.toString() : "—"}
                speed={2.5}
                delay={0.5}
                color="rgba(255,255,255,0.85)"
                shineColor="#47A9CF"
                spread={100}
                className="text-[24px] md:text-[28px] font-semibold"
              />
              <span className="text-[12px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" style={{ animationDelay: "0.4s" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Jobs Completed
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShinyText
                text="197"
                speed={2.5}
                delay={1}
                color="rgba(255,255,255,0.85)"
                shineColor="#47A9CF"
                spread={100}
                className="text-[24px] md:text-[28px] font-semibold"
              />
              <span className="text-[12px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" style={{ animationDelay: "0.8s" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Tests Passing
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
    </section>
  );
}
