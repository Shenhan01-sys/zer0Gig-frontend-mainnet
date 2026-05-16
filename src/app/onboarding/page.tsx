"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain, useDisconnect } from "wagmi";
import { Check, ChevronRight, ChevronLeft, Wallet, Globe2, Cpu, Sparkles, ArrowRight, Zap } from "lucide-react";
import Footer from "@/components/Footer";
import { useRegisterUser, UserRole, USER_ROLES } from "@/hooks/useUserRegistry";
import { ogNewton } from "@/lib/wagmi";
import { CONTRACT_CONFIG } from "@/lib/contracts";
import { createPublicClient, http } from "viem";
import { OG_MODELS, DEFAULT_MODEL_ID, type OGModel } from "@/lib/og-models";
import { COUNTRIES, type Country } from "@/lib/countries";
import { ID_CITIES } from "@/lib/idCities";

type Role = "client" | "agent_owner";

const STEPS = [
  { id: 0, label: "Connect",  icon: Wallet  },
  { id: 1, label: "Profile",  icon: Globe2  },
  { id: 2, label: "AI Model", icon: Cpu     },
  { id: 3, label: "Confirm",  icon: Sparkles },
  { id: 4, label: "Activate", icon: Zap     },
] as const;

// Clients don't need to pick an AI model — that's an agent-owner concern.
// They get DEFAULT_MODEL_ID under the hood so the Supabase row stays
// well-formed, but the picker is hidden from the flow.
function visibleStepsFor(role: Role | null) {
  return role === "client" ? STEPS.filter(s => s.id !== 2) : STEPS;
}
function nextStepFrom(current: number, role: Role | null): number {
  const v = visibleStepsFor(role);
  const i = v.findIndex(s => s.id === current);
  return v[Math.min(i + 1, v.length - 1)].id;
}
function prevStepFrom(current: number, role: Role | null): number {
  const v = visibleStepsFor(role);
  const i = v.findIndex(s => s.id === current);
  return v[Math.max(i - 1, 0)].id;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { ready, authenticated, user, login } = usePrivy();
  const { address: wagmiAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  // Canonical wallet address: use wagmi's active account (the wallet that will sign tx)
  const walletAddress = (wagmiAddress ?? "").toLowerCase();
  // Privy embedded wallet address (for mismatch detection)
  const privyAddress = (user?.wallet?.address ?? "").toLowerCase();
  const walletMismatch = !!privyAddress && !!walletAddress && privyAddress !== walletAddress;

  const [step, setStep] = useState(0);

  // Form state
  const [displayName,   setDisplayName]   = useState("");
  const [role,          setRole]          = useState<Role | null>(null);
  const [countryCode,   setCountryCode]   = useState("");
  const [countryQuery,  setCountryQuery]  = useState("");
  const [modelId,       setModelId]       = useState<string>(DEFAULT_MODEL_ID);
  // Indonesia-only sub-country fields. Shown only when country = ID.
  const [city,          setCity]          = useState("");
  const [cityQuery,     setCityQuery]     = useState("");
  const [kecamatan,     setKecamatan]     = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore persisted role from sessionStorage (handles page refresh on step 4)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("zerogig:onboarding:role");
      if (saved && !role) setRole(saved as Role);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 4: on-chain activation. Mainnet has no public faucet — users must
  // fund their wallet via CEX (Binance/KuCoin) withdrawal to 0G Aristotle.
  const [onChainRegState, setOnChainRegState] = useState<"idle" | "switching" | "pending" | "done" | "error">("idle");
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [balanceCheckState, setBalanceCheckState] = useState<"idle" | "checking" | "funded" | "empty">("idle");

  const { register, isPending, isConfirming, isConfirmed, error: regError } = useRegisterUser();

  // Watch on-chain registration hook state
  useEffect(() => {
    if (isConfirmed) setOnChainRegState("done");
  }, [isConfirmed]);

  useEffect(() => {
    if (regError) setOnChainRegState("error");
  }, [regError]);

  // Step 4 auto-check: detect on-chain balance + prior registration.
  // Mainnet flow: balance > 0 means user funded their wallet from a CEX → unlock register.
  useEffect(() => {
    if (step !== 4 || !walletAddress) return;
    let cancelled = false;
    (async () => {
      try {
        setBalanceCheckState("checking");
        const publicClient = createPublicClient({
          chain: ogNewton,
          transport: http(),
        });
        const balance = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
        if (cancelled) return;
        setWalletBalance(balance);
        setBalanceCheckState(balance > 0n ? "funded" : "empty");
      } catch {
        if (!cancelled) setBalanceCheckState("empty");
      }
      try {
        // 3. Check if already registered on-chain
        const publicClient = createPublicClient({
          chain: ogNewton,
          transport: http(),
        });
        const rawRole = await publicClient.readContract({
          address: CONTRACT_CONFIG.UserRegistry.address as `0x${string}`,
          abi: CONTRACT_CONFIG.UserRegistry.abi,
          functionName: "getUserRole",
          args: [walletAddress as `0x${string}`],
        });
        const ROLE_MAP: Record<number, string> = {
          0: "Unregistered", 1: "Client", 2: "FreelancerOwner",
        };
        const roleStr = ROLE_MAP[Number(rawRole)] ?? "Unregistered";
        if (!cancelled && roleStr !== "Unregistered") {
          setOnChainRegState("done");
        }
      } catch {
        // On-chain read failed — leave it to manual registration
      }
    })();
    return () => { cancelled = true; };
  }, [step, walletAddress]);

  // Auto-advance once wallet connects on step 0.
  // If the wallet already has a Supabase signup row AND is registered
  // on-chain, bypass to landing. If only Supabase exists, skip to activation.
  useEffect(() => {
    if (step !== 0 || !ready || !authenticated || !walletAddress) return;
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/signup?wallet=${walletAddress}`);
        const json = await res.json();
        if (json.ok && json.exists) {
          // Check on-chain role
          try {
            const publicClient = createPublicClient({
              chain: ogNewton,
              transport: http(),
            });
            const rawRole = await publicClient.readContract({
              address: CONTRACT_CONFIG.UserRegistry.address as `0x${string}`,
              abi: CONTRACT_CONFIG.UserRegistry.abi,
              functionName: "getUserRole",
              args: [walletAddress as `0x${string}`],
            });
            const ROLE_MAP: Record<number, string> = {
              0: "Unregistered", 1: "Client", 2: "FreelancerOwner",
            };
            const roleStr = ROLE_MAP[Number(rawRole)] ?? "Unregistered";
            const isActivating =
              typeof window !== "undefined" &&
              sessionStorage.getItem("zerogig:onboarding:activate") === "1";

            if (roleStr !== "Unregistered" && !isActivating) {
              try { sessionStorage.setItem("zerogig:onboarding:completed", "1"); } catch {}
              router.replace("/");
              return;
            }
            // Has Supabase but not on-chain, or is in activation — skip to step 4
            setStep(4);
            return;
          } catch {
            // On-chain read failed — let them continue to activation
            setStep(4);
            return;
          }
        }
      } catch {
        // Network failure — fall through to step 1
      }
      setStep(1);
    })();
  }, [step, ready, authenticated, walletAddress, router]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countryQuery]);

  // Indonesia-specific city autocomplete suggestions
  const filteredIdCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return ID_CITIES;
    return ID_CITIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q),
    );
  }, [cityQuery]);

  // When country switches AWAY from ID, clear the Indonesia-only fields so
  // they don't ride along into a non-ID submission.
  useEffect(() => {
    if (countryCode !== "ID") {
      setCity("");
      setCityQuery("");
      setKecamatan("");
    }
  }, [countryCode]);

  // For Indonesian users, city is required so the globe can plot them
  // distinctly. Non-ID users skip this requirement.
  const canNextFromProfile =
    displayName.trim().length >= 2 &&
    !!role &&
    !!countryCode &&
    (countryCode !== "ID" || city.trim().length > 0);
  const canSubmit = canNextFromProfile && !!modelId;

  async function submit() {
    if (!canSubmit || !walletAddress) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          walletAddress,
          role,
          preferredModel: modelId,
          countryCode,
          city:      countryCode === "ID" ? city.trim() : undefined,
          kecamatan: countryCode === "ID" ? kecamatan.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Submission failed");
      setSubmitting(false);
      // Persist role so a refresh on step 4 doesn't lose it
      try {
        if (role) sessionStorage.setItem("zerogig:onboarding:role", role);
        sessionStorage.setItem("zerogig:onboarding:activate", "1");
      } catch {}
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  async function handleRegisterOnChain() {
    if (!role) {
      setOnChainRegState("error");
      return;
    }

    // ── Wallet validation ───────────────────────────────────────────────
    if (!isConnected || !walletAddress) {
      setOnChainRegState("error");
      setSubmitError("No wallet connected. Please reconnect.");
      console.error("[Onboarding] No wallet connected via wagmi");
      return;
    }

    // ── Network validation ──────────────────────────────────────────────
    if (chainId !== ogNewton.id) {
      setOnChainRegState("switching");
      try {
        await switchChain({ chainId: ogNewton.id });
        setOnChainRegState("idle");
        return;
      } catch (e: any) {
        console.error("[Onboarding] Network switch failed:", e);
        setOnChainRegState("error");
        setSubmitError("Failed to switch network. Please switch manually in your wallet.");
        return;
      }
    }

    // ── Wallet mismatch guard (Privy vs wagmi) ──────────────────────────
    if (walletMismatch) {
      const err = `Wallet mismatch: Privy embedded wallet (${privyAddress.slice(0,6)}...) differs from active wallet (${walletAddress.slice(0,6)}...). If you have MetaMask installed, please disconnect it or disable the extension temporarily.`;
      console.error("[Onboarding]", err);
      setOnChainRegState("error");
      setSubmitError(err);
      return;
    }

    // ── Balance check ───────────────────────────────────────────────────
    try {
      const publicClient = createPublicClient({ chain: ogNewton, transport: http() });
      const balance = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
      console.log("[Onboarding] Balance check:", walletAddress, "=", balance.toString(), "wei");
      if (balance === 0n) {
        setOnChainRegState("error");
        setSubmitError("Insufficient OG balance. Mainnet has no faucet — buy 0G on Binance / KuCoin and withdraw to your wallet on 0G Aristotle network.");
        return;
      }
    } catch (e) {
      console.warn("[Onboarding] Balance check failed:", e);
    }

    setOnChainRegState("pending");
    const roleNum = role === "agent_owner" ? 2 : 1;
    console.log("[Onboarding] Registering with wallet:", walletAddress, "role:", roleNum, "chain:", chainId);
    register(roleNum);
  }

  async function refreshBalance() {
    if (!walletAddress) return;
    setBalanceCheckState("checking");
    try {
      const publicClient = createPublicClient({ chain: ogNewton, transport: http() });
      const balance = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
      setWalletBalance(balance);
      setBalanceCheckState(balance > 0n ? "funded" : "empty");
    } catch {
      setBalanceCheckState("empty");
    }
  }

  function finishOnboarding() {
    try {
      sessionStorage.removeItem("zerogig:onboarding:activate");
      sessionStorage.setItem("zerogig:onboarding:completed", "1");
    } catch {}
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#050810] text-white font-sans">
      {/* Top bar */}
      <header className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
        <Link href="/" className="text-white/80 hover:text-white text-sm tracking-wide">
          ← zer0Gig
        </Link>
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Community Onboarding</p>
      </header>

      {/* Step indicator */}
      <div className="px-6 py-8 flex items-center justify-center">
        <ol className="flex items-center gap-2 sm:gap-3">
          {(() => {
            const visible = visibleStepsFor(role);
            const currentIdx = visible.findIndex(s => s.id === step);
            return visible.map((s, i) => {
              const Icon   = s.icon;
              const active = s.id === step;
              const done   = currentIdx !== -1 && i < currentIdx;
              return (
                <li key={s.id} className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all
                      ${active ? "bg-white text-black border-white" :
                        done   ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/40" :
                                 "bg-[#0d1525]/90 text-white/40 border-white/10"}
                    `}
                  >
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`hidden sm:inline text-[12px] font-medium tracking-wide
                    ${active ? "text-white" : done ? "text-emerald-400" : "text-white/35"}`}>
                    {s.label}
                  </span>
                  {i < visible.length - 1 && (
                    <span className={`w-6 sm:w-10 h-px ${done ? "bg-emerald-400/40" : "bg-white/10"}`} aria-hidden />
                  )}
                </li>
              );
            });
          })()}
        </ol>
      </div>

      {/* Step container */}
      <div className="flex-1 px-6 pb-16 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepCard key="0">
                <h1 className="text-3xl sm:text-4xl font-medium mb-2">Welcome to zer0Gig.</h1>
                <p className="text-white/55 text-[15px] mb-8 max-w-xl">
                  Join the community of AI agent builders and clients shaping the agentic economy on 0G.
                  We'll record your identity, role, and preferred 0G Compute model — and pin you on the global map.
                </p>

                <button
                  onClick={() => login()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
                  disabled={!ready}
                >
                  <Wallet className="w-4 h-4" />
                  {ready ? "Connect Wallet to Continue" : "Loading…"}
                </button>

                {!ready && <p className="text-white/30 text-xs mt-3">Initializing Privy…</p>}
                {ready && authenticated && (
                  <div className="mt-3 space-y-2">
                    <p className="text-emerald-400 text-xs">Connected as {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</p>
                    {walletMismatch && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2">
                        <p className="text-amber-400 text-[11px] font-medium">⚠️ Wallet mismatch</p>
                        <p className="text-amber-400/70 text-[10px] mt-0.5">
                          Privy wallet ({privyAddress.slice(0,6)}...{privyAddress.slice(-4)}) differs from active wallet. 
                          Make sure you use the same wallet for funding and registration.
                        </p>
                        <button
                          type="button"
                          onClick={() => disconnect()}
                          className="mt-1.5 text-[10px] text-amber-400 underline hover:text-amber-300"
                        >
                          Disconnect wallet and reconnect
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </StepCard>
            )}

            {step === 1 && (
              <StepCard key="1">
                <h1 className="text-3xl sm:text-4xl font-medium mb-2">Tell us about you.</h1>
                <p className="text-white/55 text-[15px] mb-8">
                  Initials are fine. We use this on the leaderboard and the community globe.
                </p>

                <Field label="Display name or initials">
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value.slice(0, 64))}
                    placeholder="e.g. Hans, or HG"
                    className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-[15px] focus:border-white/30 focus:outline-none transition-colors"
                  />
                  <p className="text-white/30 text-[11px] mt-1.5">Wallet: {walletAddress.slice(0, 10)}…{walletAddress.slice(-6)}</p>
                </Field>

                <Field label="Role">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RoleCard
                      active={role === "client"}
                      onClick={() => setRole("client")}
                      title="Client"
                      subtitle="I want to hire AI agents"
                      meta="post jobs · create subscriptions"
                    />
                    <RoleCard
                      active={role === "agent_owner"}
                      onClick={() => setRole("agent_owner")}
                      title="Agent Owner"
                      subtitle="I own AI agents"
                      meta="mint iNFTs · earn from work"
                    />
                  </div>
                </Field>

                <Field label="Country / Region">
                  <input
                    value={countryQuery}
                    onChange={e => setCountryQuery(e.target.value)}
                    placeholder="Search countries…"
                    className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-[15px] focus:border-white/30 focus:outline-none transition-colors mb-3"
                  />
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1525]/90 divide-y divide-white/[0.04]">
                    {filteredCountries.map(c => (
                      <CountryRow
                        key={c.code}
                        country={c}
                        active={countryCode === c.code}
                        onClick={() => setCountryCode(c.code)}
                      />
                    ))}
                    {filteredCountries.length === 0 && (
                      <p className="px-4 py-3 text-white/40 text-[13px]">No matches</p>
                    )}
                  </div>
                </Field>

                {/* Indonesia-only: city autocomplete + kecamatan free text */}
                {countryCode === "ID" && (
                  <>
                    <Field label="City / Regency">
                      <input
                        value={cityQuery || city}
                        onChange={e => { setCityQuery(e.target.value); if (city) setCity(""); }}
                        placeholder="Search city — Jakarta, Bandung, Surabaya…"
                        className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-[15px] focus:border-white/30 focus:outline-none transition-colors mb-3"
                      />
                      <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1525]/90 divide-y divide-white/[0.04]">
                        {filteredIdCities.slice(0, 30).map(c => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => { setCity(c.name); setCityQuery(c.name); }}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors ${
                              city === c.name ? "bg-white/[0.06]" : ""
                            }`}
                          >
                            <span className={`text-[14px] ${city === c.name ? "text-white" : "text-white/80"}`}>
                              {c.name}
                            </span>
                            <span className="text-white/30 text-[11px] font-mono">{c.province}</span>
                          </button>
                        ))}
                        {filteredIdCities.length === 0 && (
                          <p className="px-4 py-3 text-white/40 text-[13px]">No matches — type to use your own</p>
                        )}
                      </div>
                      <p className="text-white/30 text-[11px] mt-1.5">
                        Your city isn't on the list? Just type its name — we'll save it as-is.
                      </p>
                    </Field>

                    <Field label="Sub-district (optional)">
                      <input
                        value={kecamatan}
                        onChange={e => setKecamatan(e.target.value.slice(0, 80))}
                        placeholder="e.g. Cengkareng, Sukajadi, Gubeng"
                        className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-[15px] focus:border-white/30 focus:outline-none transition-colors"
                      />
                      <p className="text-white/30 text-[11px] mt-1.5">
                        A specific location helps us plot you on the Indonesia map.
                      </p>
                    </Field>
                  </>
                )}

                <Nav
                  onBack={() => setStep(prevStepFrom(1, role))}
                  onNext={() => setStep(nextStepFrom(1, role))}
                  canNext={canNextFromProfile}
                />
              </StepCard>
            )}

            {step === 2 && (
              <StepCard key="2">
                <h1 className="text-3xl sm:text-4xl font-medium mb-2">Pick your AI model.</h1>
                <p className="text-white/55 text-[15px] mb-8">
                  Live on the 0G Compute testnet. You can change this later — it's a preference, not a commitment.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {OG_MODELS.map(m => (
                    <ModelCard
                      key={m.id}
                      model={m}
                      active={modelId === m.id}
                      onClick={() => setModelId(m.id)}
                    />
                  ))}
                </div>

                <Nav
                  onBack={() => setStep(prevStepFrom(2, role))}
                  onNext={() => setStep(nextStepFrom(2, role))}
                  canNext={!!modelId}
                />
              </StepCard>
            )}

            {step === 3 && (
              <StepCard key="3">
                <h1 className="text-3xl sm:text-4xl font-medium mb-2">Looks good?</h1>
                <p className="text-white/55 text-[15px] mb-8">
                  We'll save this to Supabase and pin you on the globe. You can update anytime by re-running onboarding.
                </p>

                <SummaryGrid
                  walletAddress={walletAddress}
                  displayName={displayName}
                  role={role}
                  countryCode={countryCode}
                  modelId={modelId}
                  hideModel={role === "client"}
                />

                {submitError && (
                  <p className="text-red-400 text-[13px] mt-4">{submitError}</p>
                )}

                <div className="mt-8 flex flex-wrap gap-3 justify-between">
                  <button
                    onClick={() => setStep(prevStepFrom(3, role))}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors text-[13px]"
                    disabled={submitting}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={submit}
                    disabled={!canSubmit || submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[13px]"
                  >
                    {submitting ? "Saving…" : (
                      <>
                        Submit & Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </StepCard>
            )}

            {step === 4 && (
              <StepCard key="4">
                <h1 className="text-3xl sm:text-4xl font-medium mb-2">Activate your account.</h1>
                <p className="text-white/55 text-[15px] mb-8">
                  Fund your wallet with 0G, then register on-chain so the dashboard knows your workspace.
                </p>

                {/* Fund wallet — FIRST, no dependencies */}
                <div className="rounded-xl border border-white/10 bg-[#050810]/60 p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-medium text-[15px]">Fund your wallet</p>
                    {balanceCheckState === "funded" && (
                      <span className="text-emerald-400 text-[12px] font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Funded
                      </span>
                    )}
                  </div>
                  {balanceCheckState === "funded" ? (
                    <>
                      <p className="text-white/40 text-[13px] mb-2">
                        Balance: {walletBalance ? (Number(walletBalance) / 1e18).toFixed(4) : "0"} OG
                        <span className="text-white/30"> · Ready to register on-chain.</span>
                      </p>
                      <a
                        href={`https://chainscan.0g.ai/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#38bdf8] text-[12px] hover:underline"
                      >
                        View wallet on explorer →
                      </a>
                    </>
                  ) : (
                    <>
                      <p className="text-white/40 text-[13px] mb-3">
                        0G Aristotle is a real mainnet — there's no public faucet. You need to fund your wallet with native 0G to pay gas.
                      </p>
                      <div className="rounded-lg border border-white/10 bg-[#0d1525]/40 px-3 py-3 mb-4 text-[12px] space-y-1.5">
                        <p className="text-white/60 font-medium">How to get 0G:</p>
                        <p className="text-white/40">
                          1. Buy 0G on <a href="https://www.binance.com/en/convert" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:underline">Binance Convert</a>, <a href="https://www.kucoin.com/trade/0G-USDT" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:underline">KuCoin</a>, or any CEX listing 0G.
                        </p>
                        <p className="text-white/40">
                          2. Withdraw to <span className="font-mono text-white/60">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "your wallet"}</span> on the <b>0G Aristotle</b> network.
                        </p>
                        <p className="text-white/40">
                          3. ~0.05 OG covers gas for registration + a few jobs.
                        </p>
                      </div>
                      <button
                        onClick={refreshBalance}
                        disabled={balanceCheckState === "checking"}
                        className="w-full px-4 py-2.5 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {balanceCheckState === "checking" ? "Checking balance…" : "I've funded my wallet — check balance"}
                      </button>
                      {balanceCheckState === "empty" && walletBalance === 0n && (
                        <p className="text-amber-400/80 text-[12px] mt-3">
                          Still 0 OG. CEX withdrawals usually arrive within 1-3 minutes. Click again to retry.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* On-chain registration — SECOND, requires balance > 0 */}
                <div className={`rounded-xl border p-5 mb-4 transition-all ${
                  balanceCheckState === "funded"
                    ? "border-white/10 bg-[#050810]/60"
                    : "border-white/[0.04] bg-[#050810]/30 opacity-50"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-medium text-[15px]">Register your account</p>
                    {onChainRegState === "done" && (
                      <span className="text-emerald-400 text-[12px] font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                  </div>
                  {onChainRegState === "done" ? (
                    <p className="text-white/40 text-[13px]">Your role is recorded on the 0G Aristotle mainnet.</p>
                  ) : (
                    <>
                      <p className="text-white/40 text-[13px] mb-4">
                        Record your role permanently on-chain. You need a small amount of OG for gas.
                      </p>
                      <button
                        onClick={handleRegisterOnChain}
                        disabled={balanceCheckState !== "funded" || onChainRegState === "switching" || onChainRegState === "pending"}
                        className="w-full px-4 py-2.5 rounded-full bg-[#0d1525]/90 border border-white/20 text-white text-[13px] font-medium hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {onChainRegState === "switching" ? "Switching network…" :
                         onChainRegState === "pending" ? "Confirm in wallet…" :
                         "Register on-chain"}
                      </button>
                      {walletMismatch && (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 mb-3">
                          <p className="text-amber-400 text-[12px] font-medium">⚠️ Wallet Mismatch Detected</p>
                          <p className="text-amber-400/70 text-[11px] mt-0.5">
                            Privy wallet ({privyAddress.slice(0,6)}...{privyAddress.slice(-4)}) differs from active wallet ({walletAddress.slice(0,6)}...{walletAddress.slice(-4)}).
                            Your funded balance may be on a different address.
                          </p>
                          <button
                            type="button"
                            onClick={() => disconnect()}
                            className="mt-1.5 text-[11px] text-amber-400 underline hover:text-amber-300"
                          >
                            Disconnect and reconnect with correct wallet
                          </button>
                        </div>
                      )}
                      {submitError && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 mb-3">
                          <p className="text-red-400 text-[12px] font-medium">Error</p>
                          <p className="text-red-400/70 text-[11px] mt-0.5">{submitError}</p>
                        </div>
                      )}
                      {regError && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 mb-3">
                          <p className="text-red-400 text-[12px] font-medium">Registration Failed</p>
                          <p className="text-red-400/70 text-[11px] mt-0.5">
                            {regError instanceof Error ? regError.message : String(regError)}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Final CTA */}
                <div className="flex justify-end">
                  <button
                    onClick={finishOnboarding}
                    disabled={onChainRegState !== "done" || balanceCheckState !== "funded"}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[13px]"
                  >
                    Enter Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </StepCard>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </main>
  );
}

// ── presentational atoms ─────────────────────────────────────────────────────

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-6 sm:p-10"
    >
      {children}
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="block text-[12px] uppercase tracking-widest text-white/40 mb-2 font-medium">{label}</label>
      {children}
    </div>
  );
}

function RoleCard({
  active, onClick, title, subtitle, meta,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all
        ${active
          ? "border-white/30 bg-white/[0.05] shadow-[0_0_24px_rgba(56,189,248,0.08)]"
          : "border-white/10 bg-[#050810]/60 hover:border-white/20"
        }`}
    >
      <p className="text-white font-medium text-[15px]">{title}</p>
      <p className="text-white/55 text-[12px] mt-0.5">{subtitle}</p>
      <p className="text-white/30 text-[11px] mt-2 font-mono">{meta}</p>
    </button>
  );
}

function CountryRow({ country, active, onClick }: { country: Country; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors
        ${active ? "bg-white/[0.06]" : ""}`}
    >
      <span className="flex items-center gap-3">
        <span className="text-lg leading-none" aria-hidden>{country.flag}</span>
        <span className={`text-[14px] ${active ? "text-white" : "text-white/80"}`}>{country.name}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-white/30 text-[11px] font-mono">{country.code}</span>
        {active && <Check className="w-4 h-4 text-emerald-400" />}
      </span>
    </button>
  );
}

function ModelCard({
  model, active, onClick,
}: {
  model: OGModel;
  active: boolean;
  onClick: () => void;
}) {
  const tierColor =
    model.tier === "frontier" ? "text-amber-300 border-amber-400/30 bg-amber-400/[0.05]" :
    model.tier === "balanced" ? "text-cyan-300 border-cyan-400/30 bg-cyan-400/[0.05]" :
    model.tier === "fast"     ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/[0.05]" :
                                "text-violet-300 border-violet-400/30 bg-violet-400/[0.05]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-5 transition-all relative overflow-hidden
        ${active
          ? "border-white/30 bg-white/[0.04] shadow-[0_0_24px_rgba(56,189,248,0.08)]"
          : "border-white/10 bg-[#050810]/60 hover:border-white/20"
        }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-white font-medium text-[15px]">{model.name}</p>
          <p className="text-white/40 text-[11px] font-mono mt-0.5">{model.id}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-full border ${tierColor}`}>
          {model.tier}
        </span>
      </div>
      <p className="text-white/60 text-[13px] mb-3">{model.description}</p>
      <div className="flex flex-wrap gap-2 items-center text-[11px] text-white/40">
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">{model.contextWindow}</span>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">{model.provider}</span>
        <span className={`px-2 py-0.5 rounded-md border ${
          model.network === "testnet" ? "border-cyan-400/30 text-cyan-300/80" :
          model.network === "mainnet" ? "border-emerald-400/30 text-emerald-300/80" :
                                         "border-violet-400/30 text-violet-300/80"
        } bg-white/[0.02]`}>
          {model.network}
        </span>
      </div>
      <p className="text-white/35 text-[12px] mt-3">Best for: {model.bestFor}</p>
      {active && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
      )}
    </button>
  );
}

function SummaryGrid({
  walletAddress, displayName, role, countryCode, modelId, hideModel,
}: {
  walletAddress: string;
  displayName: string;
  role: Role | null;
  countryCode: string;
  modelId: string;
  hideModel?: boolean;
}) {
  const country = COUNTRIES.find(c => c.code === countryCode);
  const model   = OG_MODELS.find(m => m.id === modelId);

  const items = [
    { label: "Wallet",     value: `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` },
    { label: "Name",       value: displayName || "—" },
    { label: "Role",       value: role === "client" ? "Client" : role === "agent_owner" ? "Agent Owner" : "—" },
    { label: "Country",    value: country ? `${country.flag}  ${country.name}` : "—" },
    ...(hideModel ? [] : [
      { label: "AI Model",   value: model ? model.name : "—" },
      { label: "Model Tier", value: model ? model.tier : "—" },
    ]),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(it => (
        <div key={it.label} className="rounded-xl border border-white/10 bg-[#050810]/60 px-4 py-3">
          <p className="text-white/35 text-[10px] uppercase tracking-widest mb-1 font-medium">{it.label}</p>
          <p className="text-white text-[14px] font-medium">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function Nav({ onBack, onNext, canNext }: { onBack: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3 justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors text-[13px]"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[13px]"
      >
        Continue
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
