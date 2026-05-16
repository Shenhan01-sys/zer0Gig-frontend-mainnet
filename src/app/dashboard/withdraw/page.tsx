"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Cpu, ArrowRight, ShieldCheck, CheckCircle2,
  Activity, Fingerprint, Coins, Zap, Landmark, ExternalLink,
  AlertCircle, ChevronLeft, KeyRound, Shield, Plus, Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  useAccount, useBalance, useReadContracts, useSignMessage,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import type { Address } from "viem";
import { useOwnerAgents } from "@/hooks/useAgentRegistry";
import { useAllAgents } from "@/hooks/useAllAgents";
import { useAgentProfiles } from "@/hooks/useAgentProfile";
import { useUserRole, UserRole } from "@/hooks/useUserRegistry";
import { CONTRACT_CONFIG, CONTRACT_ADDRESSES } from "@/lib/contracts";

// ─────────────────────────────────────────────────────────────────────────────
// Agent Wallet Withdrawal Hub — /dashboard/withdraw
//
// Two paths exist for an iNFT owner to harvest their agent's yield:
//
//   1. Vault path (preferred, keyless) — earnings deposited into
//      AgentEarningsVault are withdrawn via a direct user-signed contract
//      call. No backend, no API, no private keys held anywhere. The vault
//      contract verifies AgentRegistry.ownerOf(agentId) == msg.sender on
//      every withdraw.
//
//   2. Legacy EOA path — earnings sent directly to agent.agentWallet (the
//      original ERC-7857 design). Withdrawal requires the agent's private
//      key on the server, configured via the AGENT_WALLET_KEYS env var.
//      Falls back to a clearly-labeled demo response when the env is missing
//      so the UX never silently lies.
//
// The page detects which pool has balance and routes accordingly. Both
// balances are surfaced to the user so the source of funds is never ambiguous.
//
// Flow documented at Docs/Frontend/Components/Page/WithdrawalFlow.md.
// ─────────────────────────────────────────────────────────────────────────────

// Deterministic accent color per agentId so the holographic ring is stable
// across re-renders.
const ACCENT_PALETTE = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899"];
function accentFor(agentId: number) {
  return ACCENT_PALETTE[agentId % ACCENT_PALETTE.length];
}

type WithdrawState = "idle" | "signing" | "processing" | "success" | "error";
type WithdrawSource = "vault" | "eoa";

interface AgentChoice {
  agentId:     number;
  name:        string;
  agentWallet: `0x${string}`;
  category:    string;
  isActive:    boolean;
  color:       string;
  avatarUrl:   string | null;
}

const VAULT_ADDRESS    = CONTRACT_ADDRESSES.AgentEarningsVault as `0x${string}`;
const VAULT_DEPLOYED   = VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000";

export default function WithdrawPage() {
  const { address: owner } = useAccount();
  const { role, isLoading: roleLoading } = useUserRole(owner);
  const { data: ownerAgentIds, isLoading: idsLoading } = useOwnerAgents(owner);
  const { agents: allAgents, isLoading: allLoading } = useAllAgents();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const ownerIds: number[] = useMemo(() => {
    if (!ownerAgentIds) return [];
    return (ownerAgentIds as bigint[]).map(b => Number(b));
  }, [ownerAgentIds]);

  // Batched profile reads from AgentRegistry — source of truth for agentWallet.
  const profileContracts = useMemo(
    () =>
      ownerIds.map(id => ({
        address:      CONTRACT_CONFIG.AgentRegistry.address as Address,
        abi:          CONTRACT_CONFIG.AgentRegistry.abi,
        functionName: "getAgentProfile" as const,
        args:         [BigInt(id)] as const,
      })),
    [ownerIds],
  );
  const { data: profileResults, isLoading: profilesLoading } = useReadContracts({
    contracts: profileContracts,
    query:     { enabled: ownerIds.length > 0 },
  });

  const { profiles: agentProfiles } = useAgentProfiles(ownerIds);

  const myAgents: AgentChoice[] = useMemo(() => {
    return ownerIds
      .map((id, i) => {
        const fromApi  = allAgents.find(a => a.agentId === id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onChain  = profileResults?.[i]?.result as any;
        const supaProf = agentProfiles[id];
        const wallet   = (fromApi?.agentWallet as `0x${string}` | undefined)
                      ?? (onChain?.agentWallet as `0x${string}` | undefined);
        if (!wallet || wallet === "0x0000000000000000000000000000000000000000") return null;
        return {
          agentId:     id,
          name:        supaProf?.display_name ?? fromApi?.name ?? `Agent #${id}`,
          agentWallet: wallet,
          category:    fromApi?.tags?.[0] ?? fromApi?.skills?.[0] ?? "AI Agent",
          isActive:    fromApi?.isActive ?? true,
          color:       accentFor(id),
          avatarUrl:   supaProf?.avatar_url ?? null,
        };
      })
      .filter((a): a is AgentChoice => !!a);
  }, [ownerIds, allAgents, profileResults, agentProfiles]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedId === null && myAgents.length > 0) setSelectedId(myAgents[0].agentId);
  }, [myAgents, selectedId]);
  const selected = myAgents.find(a => a.agentId === selectedId) ?? null;

  // ── Dual-source balance reads ───────────────────────────────────────────
  // EOA balance: live native OG balance on the agent's autonomous wallet.
  const { data: eoaBalance, isLoading: eoaBalLoading, refetch: refetchEoa } = useBalance({
    address: selected?.agentWallet,
    chainId: 16661,
    query:   { enabled: !!selected, refetchInterval: 15_000 },
  });
  // Vault balance: agentId-keyed mapping inside AgentEarningsVault.
  const { data: vaultBalanceRaw, refetch: refetchVault } = useReadContracts({
    contracts: selected
      ? [{
          address:      VAULT_ADDRESS,
          abi:          CONTRACT_CONFIG.AgentEarningsVault.abi,
          functionName: "balanceOf" as const,
          args:         [BigInt(selected.agentId)] as const,
        }]
      : [],
    query: { enabled: !!selected && VAULT_DEPLOYED, refetchInterval: 15_000 },
  });

  const eoaBalanceOG   = eoaBalance ? Number(formatEther(eoaBalance.value)) : 0;
  const vaultBalanceWei = (vaultBalanceRaw?.[0]?.result as bigint | undefined) ?? 0n;
  const vaultBalanceOG  = Number(formatEther(vaultBalanceWei));

  // Form state
  const [source,      setSource]      = useState<WithdrawSource>("vault");
  const [amount,      setAmount]      = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [state,       setState]       = useState<WithdrawState>("idle");
  const [error,       setError]       = useState<string | null>(null);
  const [txHash,      setTxHash]      = useState<`0x${string}` | null>(null);
  const [txMock,      setTxMock]      = useState<boolean>(false);
  const [mockReason,  setMockReason]  = useState<string | null>(null);

  // Deposit form state — used to top up the vault for testing / demo.
  // Until escrow contracts route earnings into vault directly, this is the
  // only way to give the vault a balance to withdraw against.
  const [depositOpen,    setDepositOpen]    = useState(false);
  const [depositAmount,  setDepositAmount]  = useState<string>("");
  const [depositState,   setDepositState]   = useState<WithdrawState>("idle");
  const [depositTxHash,  setDepositTxHash]  = useState<`0x${string}` | null>(null);
  const [depositError,   setDepositError]   = useState<string | null>(null);

  // Wait for deposit tx receipt so the balance refetch happens after
  // confirmation rather than racing against block inclusion.
  const { data: depositReceipt } = useWaitForTransactionReceipt({
    hash:   depositTxHash ?? undefined,
    chainId: 16661,
    query:   { enabled: !!depositTxHash && depositState === "processing" },
  });
  useEffect(() => {
    if (depositReceipt && depositState === "processing") {
      setDepositState("success");
      setTimeout(() => refetchVault(), 1200);
      setTimeout(() => {
        setDepositState("idle");
        setDepositAmount("");
        setDepositTxHash(null);
        setDepositOpen(false);
      }, 3500);
    }
  }, [depositReceipt, depositState, refetchVault]);

  async function handleDeposit() {
    if (!selected) return;
    const amt = Number(depositAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setDepositError(null);
    setDepositTxHash(null);
    setDepositState("signing");
    try {
      const hash = await writeContractAsync({
        address:      VAULT_ADDRESS,
        abi:          CONTRACT_CONFIG.AgentEarningsVault.abi,
        functionName: "deposit",
        args:         [BigInt(selected.agentId)],
        value:        parseEther(depositAmount),
      });
      setDepositTxHash(hash);
      setDepositState("processing");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Deposit failed";
      setDepositError(raw.split("\n")[0].slice(0, 200));
      setDepositState("error");
      setTimeout(() => setDepositState("idle"), 5000);
    }
  }

  // Wait for vault tx receipt so the UI can wait for confirmation before
  // declaring success.
  const { data: receipt } = useWaitForTransactionReceipt({
    hash:   source === "vault" && txHash ? txHash : undefined,
    chainId: 16661,
    query:   { enabled: source === "vault" && !!txHash },
  });
  useEffect(() => {
    if (receipt && state === "processing" && source === "vault") {
      setState("success");
      setTimeout(() => refetchVault(), 1500);
      setTimeout(() => refetchEoa(), 1500);
      setTimeout(() => { setState("idle"); setAmount(""); }, 5000);
    }
  }, [receipt, state, source, refetchVault, refetchEoa]);

  // Default destination = connected owner wallet
  useEffect(() => {
    if (owner && !destination) setDestination(owner);
  }, [owner, destination]);

  // Reset amount + auto-pick best source whenever agent or balances change
  useEffect(() => {
    setAmount("");
    setTxHash(null);
    setError(null);
    if (!VAULT_DEPLOYED)            setSource("eoa");
    else if (vaultBalanceOG > 0)    setSource("vault");
    else if (eoaBalanceOG > 0)      setSource("eoa");
  }, [selectedId, vaultBalanceOG, eoaBalanceOG]);

  const activeBalanceOG = source === "vault" ? vaultBalanceOG : eoaBalanceOG;
  const activeBalanceLoading = source === "vault" ? false : eoaBalLoading;

  const setPercentage = (percent: number) => {
    if (activeBalanceOG <= 0) return;
    setAmount((activeBalanceOG * percent).toFixed(6));
  };

  const amountNum = Number(amount);
  const canSubmit =
    state === "idle" &&
    !!selected &&
    !!destination &&
    /^0x[a-fA-F0-9]{40}$/.test(destination) &&
    amountNum > 0 &&
    amountNum <= activeBalanceOG;

  async function handleHarvest() {
    if (!canSubmit || !selected || !owner) return;
    setError(null);
    setTxHash(null);
    setTxMock(false);
    setMockReason(null);

    if (source === "vault") {
      // Direct on-chain call — user signs the actual tx in their wallet.
      // No backend, no API, no private keys involved.
      setState("signing");
      try {
        const hash = await writeContractAsync({
          address:      VAULT_ADDRESS,
          abi:          CONTRACT_CONFIG.AgentEarningsVault.abi,
          functionName: "withdraw",
          args:         [BigInt(selected.agentId), destination as `0x${string}`, parseEther(amount)],
        });
        setTxHash(hash);
        setState("processing"); // useWaitForTransactionReceipt promotes to success
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Withdraw failed";
        // Trim verbose viem errors down to the headline
        setError(raw.split("\n")[0].slice(0, 240));
        setState("error");
        setTimeout(() => setState("idle"), 5000);
      }
      return;
    }

    // Legacy EOA path — message signing + backend dispatch.
    setState("signing");
    try {
      const timestamp = Date.now();
      const message =
        `zer0Gig agent wallet withdrawal\n` +
        `Agent: #${selected.agentId} (${selected.name})\n` +
        `Amount: ${amount} OG\n` +
        `Destination: ${destination}\n` +
        `Timestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });
      setState("processing");
      const res = await fetch("/api/agent/withdraw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          agentId:     String(selected.agentId),
          amount,
          destination,
          signature,
          message,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Withdraw failed");
      setTxHash(json.txHash);
      setTxMock(!!json.mock);
      setMockReason(json.reason ?? null);
      setState("success");
      if (!json.mock) setTimeout(() => refetchEoa(), 4000);
      setTimeout(() => { setState("idle"); setAmount(""); }, json.mock ? 8000 : 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  // ── Role guard ──────────────────────────────────────────────────────────
  if (!roleLoading && role !== null && role !== UserRole.FreelancerOwner) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#0d1525]/90 p-10 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-amber-400/70" />
        <h2 className="text-2xl font-medium text-white mb-2">Agent owners only</h2>
        <p className="text-white/55 text-[14px] mb-6">
          This page is for harvesting yield from agents you own. Clients use the
          job + subscription flows instead.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-black text-[13px] font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isLoading = roleLoading || idsLoading || (ownerIds.length > 0 && profilesLoading) || allLoading;

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!isLoading && myAgents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#0d1525]/90 p-10 text-center">
        <Landmark className="w-10 h-10 mx-auto mb-4 text-white/40" />
        <h2 className="text-2xl font-medium text-white mb-2">No agents to harvest from</h2>
        <p className="text-white/55 text-[14px] mb-6">
          You don&apos;t own any agents yet. Register one to start earning, or buy a
          mature agent from the marketplace.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/dashboard/register-agent" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-black text-[13px] font-medium">
            Register Agent
          </Link>
          <Link href="/marketplace/agents-for-sale" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-white/15 text-white/75 text-[13px] font-medium hover:border-white/30">
            Buy Agents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.agentId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 pointer-events-none -z-10"
            style={{ background: `radial-gradient(ellipse 60% 50% at 30% 30%, ${selected.color}, transparent 60%)` }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[12px] text-white/55 mb-4 font-mono uppercase tracking-widest">
          <Activity className="w-3.5 h-3.5" />
          Agent Yield Harvest
        </div>
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-3">
          Withdraw Agent Earnings
        </h1>
        <p className="text-white/55 text-[15px] max-w-2xl">
          Pull autonomous OG earnings from your agent to your owner address. Vault path is keyless &mdash; you sign the transaction yourself, no backend or private key custody involved.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[420px] rounded-2xl border border-white/10 bg-[#0d1525]/60 animate-pulse" />
          <div className="h-[420px] rounded-2xl border border-white/10 bg-[#0d1525]/60 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_56px_1fr] gap-6 lg:gap-4 items-stretch">

          {/* LEFT — Agent picker + holographic profile + dual balance */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-8 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                Source · Agent
              </span>
              {selected && (
                <span className={`text-[10px] font-mono uppercase tracking-widest ${selected.isActive ? "text-emerald-400/80" : "text-white/35"}`}>
                  {selected.isActive ? "ACTIVE" : "IDLE"}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.agentId}
                  initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1,    filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="relative w-44 h-44 rounded-full flex items-center justify-center mb-6">
                    <div className="absolute inset-0 rounded-full border border-dashed opacity-40 animate-[spin_10s_linear_infinite]" style={{ borderColor: selected.color }} />
                    <div className="absolute inset-2 rounded-full border opacity-20 animate-[spin_15s_linear_infinite_reverse]" style={{ borderColor: selected.color }} />
                    <div
                      className="relative w-28 h-28 rounded-full overflow-hidden bg-[#050810] border z-10"
                      style={{
                        borderColor: `${selected.color}55`,
                        boxShadow: `0 0 40px ${selected.color}40, inset 0 0 20px ${selected.color}20`,
                      }}
                    >
                      {selected.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.avatarUrl} alt={selected.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Landmark className="w-10 h-10" style={{ color: selected.color }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xl font-medium text-white mb-1">{selected.name}</p>
                  <div className="flex items-center gap-1.5 mb-5">
                    <Cpu className="w-3 h-3 text-white/35" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{selected.category}</span>
                  </div>

                  {/* Dual balance — vault + EOA side by side */}
                  <div data-tour-id="balance-tiles" className="w-full grid grid-cols-2 gap-2 mb-2">
                    <BalanceTile
                      label="Vault"
                      sublabel="keyless"
                      value={vaultBalanceOG}
                      active={source === "vault"}
                      disabled={!VAULT_DEPLOYED}
                      onClick={() => VAULT_DEPLOYED && setSource("vault")}
                      icon={<Shield className="w-3 h-3" />}
                    />
                    <BalanceTile
                      label="Wallet"
                      sublabel="legacy"
                      value={eoaBalanceOG}
                      active={source === "eoa"}
                      onClick={() => setSource("eoa")}
                      icon={<KeyRound className="w-3 h-3" />}
                      loading={eoaBalLoading}
                    />
                  </div>

                  {/* Top-up vault — small disclosure that owner (or anyone)
                      can use to fund the vault directly. For demo + before
                      escrow upgrade. */}
                  {VAULT_DEPLOYED && (
                    <div data-tour-id="vault-deposit" className="w-full mb-3">
                      {!depositOpen ? (
                        <button
                          type="button"
                          onClick={() => setDepositOpen(true)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/15 text-white/55 text-[11px] font-medium hover:border-white/30 hover:text-white/80 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Top up vault
                        </button>
                      ) : (
                        <div className="rounded-xl border border-white/15 bg-[#050810]/80 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-white/45">
                              Deposit to vault · Agent #{selected.agentId}
                            </p>
                            <button
                              onClick={() => { setDepositOpen(false); setDepositAmount(""); setDepositError(null); }}
                              disabled={depositState !== "idle" && depositState !== "error"}
                              className="text-white/35 hover:text-white/70 text-[14px] leading-none disabled:opacity-30"
                              aria-label="Close deposit form"
                            >
                              ×
                            </button>
                          </div>
                          <div className="relative mb-2">
                            <input
                              type="number"
                              step="any"
                              value={depositAmount}
                              onChange={e => setDepositAmount(e.target.value)}
                              disabled={depositState !== "idle" && depositState !== "error"}
                              placeholder="0.0500"
                              className="w-full bg-[#0d1525]/90 border border-white/10 rounded-lg py-2 pl-3 pr-12 text-[14px] font-mono text-white placeholder-white/15 focus:outline-none focus:border-white/30 disabled:opacity-50 tabular-nums"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-white/45">
                              OG
                            </span>
                          </div>
                          <button
                            onClick={handleDeposit}
                            disabled={
                              !Number.isFinite(Number(depositAmount)) ||
                              Number(depositAmount) <= 0 ||
                              (depositState !== "idle" && depositState !== "error")
                            }
                            className="w-full py-2 rounded-lg bg-white text-black text-[12px] font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                          >
                            {depositState === "idle" && (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Confirm Deposit
                              </>
                            )}
                            {depositState === "signing" && (
                              <>
                                <Fingerprint className="w-3.5 h-3.5 animate-pulse" />
                                Awaiting Signature…
                              </>
                            )}
                            {depositState === "processing" && (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Confirming on-chain…
                              </>
                            )}
                            {depositState === "success" && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Deposited
                              </>
                            )}
                            {depositState === "error" && (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" />
                                Retry
                              </>
                            )}
                          </button>
                          {depositTxHash && depositState !== "idle" && (
                            <a
                              href={`https://chainscan.0g.ai/tx/${depositTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block mt-2 text-[10px] font-mono text-white/35 hover:text-white/65 truncate"
                            >
                              {depositTxHash}
                            </a>
                          )}
                          {depositError && (
                            <p className="text-red-400/80 text-[10px] mt-2 leading-snug">
                              {depositError}
                            </p>
                          )}
                          <p className="text-white/30 text-[10px] mt-2 leading-snug">
                            Sends OG from your connected wallet into the vault keyed by this agent.
                            Anyone can fund any agent — useful for testing the harvest flow before
                            escrow contracts auto-route earnings.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] font-mono text-white/30 truncate w-full text-center">
                    {selected.agentWallet}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent switcher tile row */}
            {myAgents.length > 0 && (
              <div data-tour-id="agent-switcher" className="w-full mt-6">
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/35 mb-2">
                  Switch Agent · {myAgents.length}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {myAgents.map(a => {
                    const active = selectedId === a.agentId;
                    return (
                      <button
                        key={a.agentId}
                        type="button"
                        onClick={() => state === "idle" && setSelectedId(a.agentId)}
                        disabled={state !== "idle"}
                        aria-label={`Select ${a.name}`}
                        aria-pressed={active}
                        className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          active ? "border-white/30 bg-white/[0.06]" : "border-white/10 bg-[#050810]/60 hover:border-white/25 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color, boxShadow: active ? `0 0 10px ${a.color}` : "none" }} />
                        <span className={`text-[12px] font-medium whitespace-nowrap ${active ? "text-white" : "text-white/65"}`}>{a.name}</span>
                        <span className="text-[10px] font-mono text-white/35">#{a.agentId}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CENTER — flow connector */}
          <div className="hidden lg:flex flex-col items-center justify-center relative">
            <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-white/15 to-transparent" />
            <AnimatePresence>
              {state === "processing" && selected && (
                <motion.div
                  initial={{ top: "0%", opacity: 0 }}
                  animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute w-1 h-12 rounded-full"
                  style={{ background: `linear-gradient(to bottom, transparent, ${selected.color})`, boxShadow: `0 0 10px ${selected.color}` }}
                />
              )}
            </AnimatePresence>
            <div className="w-9 h-9 rounded-full bg-[#0d1525] border border-white/10 z-10 flex items-center justify-center shadow-xl">
              <ArrowRight className="w-4 h-4 text-white/40" />
            </div>
          </div>

          {/* RIGHT — Withdrawal terminal */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-7 flex flex-col gap-5">

            {/* Path explainer */}
            <div className={`rounded-xl border px-3 py-2 text-[11px] flex items-start gap-2 ${
              source === "vault"
                ? "border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-300/80"
                : "border-amber-400/25 bg-amber-400/[0.05] text-amber-300/80"
            }`}>
              {source === "vault" ? <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <KeyRound className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span className="leading-relaxed">
                {source === "vault"
                  ? "Vault path · you sign the transaction directly. No private keys, no backend custody."
                  : "Legacy wallet path · backend signs using AGENT_WALLET_KEYS env. Phase-1 (env-based)."}
              </span>
            </div>

            {/* Destination */}
            <div data-tour-id="withdraw-destination">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">
                Destination · Owner Wallet
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#050810]/80 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 border border-white/10">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <input
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  disabled={state !== "idle"}
                  spellCheck={false}
                  placeholder="0x…"
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-white font-mono focus:outline-none disabled:opacity-50"
                />
                {destination === owner ? <ShieldCheck className="w-4 h-4 text-emerald-400/80 shrink-0" aria-label="Connected wallet" /> : null}
              </div>
              {destination && !/^0x[a-fA-F0-9]{40}$/.test(destination) && (
                <p className="text-amber-400/80 text-[11px] mt-1.5">Invalid address format.</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Amount
                </p>
                <span className="text-[11px] font-mono text-white/45">
                  Max: {activeBalanceOG.toLocaleString("en-US", { maximumFractionDigits: 6 })} OG
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={state !== "idle"}
                  placeholder="0.000000"
                  className="w-full bg-[#050810]/80 border border-white/10 rounded-xl py-4 pl-4 pr-16 text-2xl font-mono text-white placeholder-white/15 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-white/45">OG</span>
              </div>
              <div className="flex gap-2 mt-3">
                {[{ label: "25%",  v: 0.25 }, { label: "50%",  v: 0.50 }, { label: "MAX",  v: 1 }].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setPercentage(opt.v)}
                    disabled={state !== "idle" || activeBalanceOG <= 0}
                    className={`flex-1 py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[12px] font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${opt.label === "MAX" ? "text-white font-semibold" : "text-white/65"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {activeBalanceLoading && (
                <p className="text-white/30 text-[11px] mt-1.5">Loading balance…</p>
              )}
              {amountNum > activeBalanceOG && (
                <p className="text-amber-400/80 text-[11px] mt-1.5">Amount exceeds available balance.</p>
              )}
            </div>

            {/* Action button */}
            <button
              data-tour-id="harvest-button"
              onClick={handleHarvest}
              disabled={!canSubmit}
              className="relative w-full py-3.5 rounded-full font-medium transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90"
            >
              <AnimatePresence mode="wait">
                {state === "idle" && (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Harvest Yield
                  </motion.span>
                )}
                {state === "signing" && (
                  <motion.span key="signing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center justify-center gap-2 text-amber-700">
                    <Fingerprint className="w-4 h-4 animate-pulse" />
                    Awaiting Wallet Signature…
                  </motion.span>
                )}
                {state === "processing" && (
                  <motion.span key="processing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center justify-center gap-2 text-black/70">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    {source === "vault" ? "Waiting for confirmation…" : "Processing On-Chain…"}
                  </motion.span>
                )}
                {state === "success" && (
                  <motion.span key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Harvest Successful
                  </motion.span>
                )}
                {state === "error" && (
                  <motion.span key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-red-700 px-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">{error ?? "Failed"}</span>
                  </motion.span>
                )}
              </AnimatePresence>

              {state === "processing" && (
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: source === "vault" ? 6 : 1.8, ease: "linear" }}
                  className="absolute left-0 top-0 bottom-0 bg-black/10 pointer-events-none"
                />
              )}
            </button>

            {/* Success receipt */}
            {state === "success" && txHash && (
              <div className={`rounded-xl border px-4 py-3 text-[12px] ${
                txMock
                  ? "border-amber-400/25 bg-amber-400/[0.05]"
                  : "border-emerald-400/20 bg-emerald-400/[0.04]"
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium mb-0.5 ${txMock ? "text-amber-300" : "text-emerald-300"}`}>
                      {txMock ? "Demo mode · no funds moved" : "Withdrawal broadcast"}
                    </p>
                    <p className={`font-mono truncate ${txMock ? "text-amber-300/60" : "text-emerald-300/70"}`}>
                      {txHash}
                    </p>
                  </div>
                  {!txMock && (
                    <a
                      href={`https://chainscan.0g.ai/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 text-[11px] font-medium shrink-0"
                    >
                      Chainscan
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {txMock && mockReason && (
                  <p className="text-amber-300/70 text-[11px] leading-relaxed mt-2 pt-2 border-t border-amber-400/15">
                    {mockReason}
                  </p>
                )}
              </div>
            )}

            {/* Network info */}
            <div className="flex justify-between items-center text-[10px] font-mono text-white/30 pt-2 border-t border-white/[0.05]">
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" /> Est. fee · ~0.001 OG
              </span>
              <span>Network · 0G Aristotle · 16661</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BalanceTile ─────────────────────────────────────────────────────────────

function BalanceTile({
  label, sublabel, value, active, disabled, loading, icon, onClick,
}: {
  label:    string;
  sublabel: string;
  value:    number;
  active:   boolean;
  disabled?: boolean;
  loading?:  boolean;
  icon:     React.ReactNode;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2.5 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "border-white/30 bg-white/[0.06]"
          : "border-white/10 bg-[#050810]/80 hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={active ? "text-white" : "text-white/45"}>{icon}</span>
        <span className={`text-[11px] font-medium ${active ? "text-white" : "text-white/55"}`}>{label}</span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-white/35">{sublabel}</span>
      </div>
      <p className={`text-[16px] font-mono tabular-nums ${active ? "text-white" : "text-white/75"}`}>
        {loading
          ? <span className="text-white/30">—</span>
          : value.toLocaleString("en-US", { maximumFractionDigits: 4 })}
        <span className="text-[10px] text-white/35 ml-1">OG</span>
      </p>
    </button>
  );
}
