"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMintAgent } from "@/hooks/useAgentRegistry";
import { parseContractError } from "@/lib/utils";
import { useWaitForTransactionReceipt, useWalletClient, useReadContract } from "wagmi";
import { ALL_SKILLS, skillIdsToBytes32 } from "@/hooks/useAgentManagement";
import { parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useUpsertAgentProfile } from "@/hooks/useAgentProfile";
import { encryptSecret } from "@/lib/cryptoSecret";
import { supabase } from "@/lib/supabase";
import RegisterPreviewCard from "@/components/RegisterPreviewCard";
import PreBuiltToolsGrid from "@/components/PreBuiltToolsGrid";
import ConnectTelegramButton from "@/components/ConnectTelegramButton";
import CustomToolModal from "@/components/CustomToolModal";
import Link from "next/link";
import Image from "next/image";
import { CONTRACT_CONFIG } from "@/lib/contracts";
import { Settings, Rocket, Bot, Globe, Plug } from "lucide-react";
import RBACGuard from "@/components/RBACGuard";

// ── Types ─────────────────────────────────────────────────────────────────────

type RuntimeType = "self_hosted" | "platform_managed";
type LLMProvider = "0g_compute" | "openai" | "anthropic" | "groq" | "openrouter" | "alibaba" | "google";
type ToolType = "http" | "mcp";
type McpTransport = "url" | "package";

interface ToolConfig {
  id: string;
  type: ToolType;
  name: string;
  description: string;
  endpoint: string;          // URL for HTTP or MCP Remote URL mode
  apiKey: string;            // Optional, plaintext for demo
  mcpTransport?: McpTransport;
  npmPackage?: string;       // npm package name when mcpTransport = "package"
}

interface PlatformConfig {
  llm: {
    provider: LLMProvider;
    model: string;
    apiKey: string;
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
  };
  tools: ToolConfig[];
  prebuiltSkills: string[];                              // IDs from Supabase skills catalog
  prebuiltSkillConfigs: Record<string, Record<string, string>>; // per-skill API keys / settings
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LLM_PROVIDERS: { value: LLMProvider; label: string; color: string; defaultModel: string; needsKey: boolean; image?: string; models?: string[] }[] = [
  { value: "0g_compute",  label: "0G Compute",  color: "#38bdf8", defaultModel: "0GM-1.0-35B-A3B",            needsKey: false, image: "/providers/0G-removebg-preview.png",
    models: [
      "0GM-1.0-35B-A3B",                  // 0G-native, agentic coding, 35B MoE (3B active), 1M context
      "deepseek-v4-pro",                   // 1.6T / 49B active, 1M context, DSA sparse attention
      "GLM-5-FP8",                         // 744B MoE, #1 open-source
      "deepseek-chat-v3-0324",             // Fast conversational
      "gpt-oss-120b",                      // Large-scale open-source GPT
      "qwen3-vl-30b-a3b-instruct",         // Multimodal vision-language
      "qwen3.6-plus",                      // Alibaba flagship, 1M context, TeeTLS
    ] },
  { value: "groq",        label: "Groq",        color: "#f59e0b", defaultModel: "llama-3.3-70b-versatile",   needsKey: true,  image: "/providers/groq-removebg-preview.png",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"] },
  { value: "openai",      label: "OpenAI",      color: "#10b981", defaultModel: "gpt-4o-mini",               needsKey: true,  image: "/providers/openAI-removebg-preview.png",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic",   label: "Anthropic",   color: "#a855f7", defaultModel: "claude-sonnet-4-6",         needsKey: true,  image: "/providers/claudeImage-removebg-preview.png",
    models: ["claude-sonnet-4-6", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"] },
  { value: "openrouter",  label: "OpenRouter",  color: "#6366f1", defaultModel: "openai/gpt-4o",             needsKey: true,  image: "/providers/openrouter-removebg-preview.png",
    models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-pro", "meta-llama/llama-3.3-70b-instruct"] },
  { value: "alibaba",     label: "Alibaba",     color: "#f97316", defaultModel: "qwen-max",                  needsKey: true,  image: "/providers/alibaba-removebg-preview.png",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"] },
  { value: "google",      label: "Google",      color: "#22c55e", defaultModel: "gemini-1.5-pro-latest",     needsKey: true,  image: "/providers/google-removebg-preview.png",
    models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-2.0-pro"] },
];

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  llm: {
    provider: "0g_compute",
    model: "0GM-1.0-35B-A3B",
    apiKey: "",
    systemPrompt: "You are a professional AI freelance agent on the zer0Gig platform. Deliver high-quality, complete work. Your output will be verified by 0G Alignment Nodes.",
    maxTokens: 4096,
    temperature: 0.7,
  },
  tools: [],
  prebuiltSkills: [],
  prebuiltSkillConfigs: {},
};

// ── Capability manifest builder ───────────────────────────────────────────────
// Schema must match Qwen's capabilitySchema.js (SCHEMA_VERSION = "v2.0.0")

function buildCapabilityManifestObject(
  runtimeType: RuntimeType,
  skills: string[],
  platformConfig: PlatformConfig,
  agentId?: number
): Record<string, unknown> {
  // Map frontend types → Qwen's schema constants (extendedComputeService LLM_PROVIDERS)
  const runtimeMode = runtimeType === "platform_managed" ? "platform" : "self-hosted";
  // Normalize provider value: "0g_compute" → "0g-compute" (underscore → hyphen)
  const llmProvider = platformConfig.llm.provider.replace("_", "-");

  return {
    version: "v2.0.0",           // must match SCHEMA_VERSION in capabilitySchema.js
    agentId: agentId || 0,
    runtimeMode,                  // "platform" | "self-hosted"
    model: platformConfig.llm.model,
    skills,
    ...(runtimeType === "platform_managed" && {
      platformConfig: {
        llmProvider,              // top-level in platformConfig, not nested under llm
        model: platformConfig.llm.model,
        encryptedApiKey: platformConfig.llm.apiKey || null,
        systemPrompt: platformConfig.llm.systemPrompt,
        maxTokens: platformConfig.llm.maxTokens,
        temperature: platformConfig.llm.temperature,
      },
      tools: platformConfig.tools.map(t => ({  // tools at top level, not inside platformConfig
        type: t.type,
        name: t.name,
        description: t.description,
        config: {
          ...(t.type === "http"
            ? { endpoint: t.endpoint, method: "POST" }
            : t.mcpTransport === "package" && t.npmPackage
              ? { command: "npx", args: ["-y", t.npmPackage] }
              : { url: t.endpoint }),
          ...(t.apiKey ? { apiKey: t.apiKey } : {}),
        },
      })),
      prebuiltSkills:      platformConfig.prebuiltSkills || [],
      skillConfigs:        platformConfig.prebuiltSkillConfigs || {},
    }),
    updatedAt: Math.floor(Date.now() / 1000),
  };
}

function buildCapabilityManifest(
  runtimeType: RuntimeType,
  skills: string[],
  platformConfig: PlatformConfig,
  agentId?: number
): string {
  const manifest = buildCapabilityManifestObject(runtimeType, skills, platformConfig, agentId);
  // Encode as base64 — platform dispatcher decodes this prefix format
  // "pm:<base64>" = platform managed, "sh:<base64>" = self-hosted
  // Use encodeURIComponent to safely handle any Unicode characters (btoa only supports Latin1)
  const jsonStr = JSON.stringify(manifest);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const prefix = runtimeType === "platform_managed" ? "pm" : "sh";
  return `${prefix}:${base64}`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

// Platform wallet address (derived from PLATFORM_PRIVATE_KEY in agent-runtime/.env)
// For Platform Managed agents, this must be the agent wallet so the dispatcher can sign releaseMilestone.
const PLATFORM_WALLET = "0x48379F4d1427209311E9FF0bcC4a354953ea631B";

export default function RegisterAgentPage() {
  const { data: walletClient } = useWalletClient();

  // Core fields
  const [agentWallet, setAgentWallet]       = useState("");
  const [defaultRateOG, setDefaultRateOG]   = useState("");
  const [profileCID, setProfileCID]         = useState("");
  const [eciesPublicKey, setEciesPublicKey] = useState("");
  const [useOwnWallet, setUseOwnWallet]     = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Runtime type
  const [runtimeType, setRuntimeType] = useState<RuntimeType>("self_hosted");

  // Generated agent wallet (for both modes — agentWallet must != msg.sender per contract)
  const [generatedWallet, setGeneratedWallet] = useState<{ address: string; privateKey: string } | null>(null);

  // Supabase profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio]                 = useState("");
  const [avatarUrl, setAvatarUrl]     = useState("");
  const { upsert: upsertProfile }     = useUpsertAgentProfile();

  // Platform config (only used when runtimeType === "platform_managed")
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);

  // Custom tool modal state
  const [showCustomToolModal, setShowCustomToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolConfig | null>(null);

  const { mintAgent, isPending, isSuccess, data: txHash, error } = useMintAgent();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Read totalAgents to get the real agentId after mint
  const { data: totalAgents, refetch: refetchTotalAgents } = useReadContract({
    address: CONTRACT_CONFIG.AgentRegistry.address,
    abi: CONTRACT_CONFIG.AgentRegistry.abi,
    functionName: "totalAgents",
    query: { staleTime: Infinity, enabled: false }, // Never auto-fetch, we control it
  });

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(s => s !== skillId)
        : prev.length < 20 ? [...prev, skillId] : prev
    );
  };

  const setLLMProvider = (provider: LLMProvider) => {
    const p = LLM_PROVIDERS.find(x => x.value === provider)!;
    setPlatformConfig(c => ({
      ...c,
      llm: { ...c.llm, provider, model: p.models?.[0] || p.defaultModel },
    }));
  };

  const addTool = () => {
    setPlatformConfig(c => ({
      ...c,
      tools: [...c.tools, {
        id: Date.now().toString(),
        type: "http",
        name: "",
        description: "",
        endpoint: "",
        apiKey: "",
      }],
    }));
  };

  const updateTool = (id: string, updated: ToolConfig) => {
    setPlatformConfig(c => ({
      ...c,
      tools: c.tools.map(t => t.id === id ? updated : t),
    }));
  };

  const removeTool = (id: string) => {
    setPlatformConfig(c => ({ ...c, tools: c.tools.filter(t => t.id !== id) }));
  };

  const handleSubmit = async () => {
    if (!defaultRateOG) return;

    let walletAddr: `0x${string}`;
    if (runtimeType === "platform_managed" || useOwnWallet) {
      // Contract requires agentWallet != msg.sender — always generate a fresh keypair.
      // Private key is shown to user ONCE so they can import it to withdraw earnings.
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      setGeneratedWallet({ address: account.address, privateKey });
      walletAddr = account.address;
    } else {
      walletAddr = agentWallet as `0x${string}`;
    }

    if (!walletAddr) return;

    const pubKey = (eciesPublicKey || ("0x" + "00".repeat(65))) as `0x${string}`;

    // Build capability manifest
    const manifest = buildCapabilityManifest(runtimeType, selectedSkills, platformConfig);

    // For platform_managed: upload manifest JSON to 0G Storage via API route
    // For self_hosted: use inline base64 format (pm:/sh: prefix)
    let cCID = manifest;

    // Upload profile data to Supabase first (off-chain metadata)
    const profileData = {
      display_name: displayName || undefined,
      avatar_url:   avatarUrl   || undefined,
      bio:          bio         || undefined,
      tags:         selectedSkills.length > 0 ? selectedSkills : undefined,
    };

    // Use a temporary profileCID — will be updated after mint
    const tempProfileCID = `profile-${Date.now()}`;

    mintAgent(
      parseEther(defaultRateOG),
      tempProfileCID,
      cCID,
      skillIdsToBytes32(selectedSkills),
      walletAddr,
      pubKey,
      "0x01"  // sealed AES key placeholder — Phase 2 will seal with owner's ECIES pubkey
    );

    // Store profile data for Supabase upsert after confirmation
    (window as any).__pendingProfile = {
      walletAddr,
      profileData,
      runtimeType,
      platformConfig,       // full platform config for manifest rebuild post-mint
      selectedSkills,       // on-chain skills for manifest rebuild
      prebuiltSkills:       platformConfig.prebuiltSkills,
      prebuiltSkillConfigs: platformConfig.prebuiltSkillConfigs,
      customTools:          platformConfig.tools,
    };
  };

  // When tx confirms, refetch totalAgents then upsert profile to Supabase
  useEffect(() => {
    if (!isConfirmed || !walletClient) return;

    const owner = walletClient.account.address;
    const pending = (window as any).__pendingProfile;
    const profileFields = pending?.profileData || {
      display_name: displayName || undefined,
      avatar_url:   avatarUrl   || undefined,
      bio:          bio         || undefined,
      tags:         selectedSkills.length > 0 ? selectedSkills : undefined,
    };

    const skillIds: string[]                              = pending?.prebuiltSkills      || [];
    const skillConfigs: Record<string, Record<string, string>> = pending?.prebuiltSkillConfigs || {};

    // Wait briefly for chain state to settle, then read totalAgents
    setTimeout(() => {
      refetchTotalAgents().then(async ({ data }) => {
        const agentId = data ? Number(data) : 0;

        // Fetch latest Telegram chatId via API (bypasses RLS on telegram_links)
        let telegramChatId: string | null = skillConfigs["telegram_notify"]?.chatId ?? null;
        try {
          const tgRes = await fetch("/api/telegram-link");
          if (tgRes.ok) {
            const { chat_id } = await tgRes.json();
            if (chat_id) telegramChatId = chat_id;
          }
        } catch { /* non-fatal — chatId from skill config is used as fallback */ }

        // Build the capability manifest object for Supabase metadata
        // (platform dispatcher auto-discovery + _loadAgentConfig expects this shape)
        const manifestObj = pending?.runtimeType === "platform_managed" && pending?.platformConfig
          ? buildCapabilityManifestObject(
              pending.runtimeType,
              pending.selectedSkills || [],
              pending.platformConfig,
              agentId
            )
          : null;

        // ── Encrypt & persist agent wallet private key to Supabase ──────────
        // Platform-managed agents: runtime auto-fetches this key from Supabase,
        // so users don't need to manually provide AGENT_WALLET_KEYS env var.
        let encryptedWalletKey: string | null = null;
        if (generatedWallet?.privateKey && agentId > 0) {
          try {
            encryptedWalletKey = encryptSecret(generatedWallet.privateKey);
            console.log("[Register] Encrypted wallet key prepared for agent", agentId);
          } catch (err) {
            console.error("[Register] Failed to encrypt wallet key:", err);
          }
        }

        // Single API call — uses service role to bypass RLS.
        // Handles: profile upsert + agent_skills + custom tools + full manifest in metadata.
        await upsertProfile(
          agentId,
          owner,
          profileFields,
          skillIds,
          skillConfigs,
          pending?.customTools || [],
          telegramChatId,
          pending?.runtimeType || null,
          manifestObj,
          pending?.walletAddr || null,
          encryptedWalletKey,
        );

        // Sync agent stats (populates agent_proposal_stats from capability manifest)
        try {
          await fetch("/api/agent-stats/sync");
        } catch {
          // Non-critical — stats will be populated on next page load
        }

        delete (window as any).__pendingProfile;
      }).catch(() => {
        upsertProfile(0, owner, profileFields);
        delete (window as any).__pendingProfile;
      });
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const canSubmit = !!defaultRateOG && (useOwnWallet || !!agentWallet) && !isPending && !isConfirmed;
  const selectedProvider = LLM_PROVIDERS.find(p => p.value === platformConfig.llm.provider)!;

  // ── Success state ──────────────────────────────────────────────────────────

  if (isConfirmed) {
    return (
      <RBACGuard>
        <div className="max-w-2xl">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-[13px] mb-6 transition-colors">
            ← Back to Dashboard
          </Link>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Agent Registered!</h2>
            <p className="text-white/50 text-[14px] mb-1">
              Runtime: <span className={runtimeType === "platform_managed" ? "text-[#a855f7]" : "text-[#38bdf8]"}>
                {runtimeType === "platform_managed" ? "Platform Managed" : "Self-Hosted"}
              </span>
            </p>
            {generatedWallet && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left mb-4">
                <p className="text-amber-400 text-[12px] font-semibold mb-2">Save your agent wallet private key — shown only once!</p>
                <p className="text-white/50 text-[11px] mb-3">
                  Earnings from completed jobs go to this wallet. Import it into MetaMask to withdraw.
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Agent Wallet Address</p>
                    <div className="flex gap-2 items-stretch">
                      <p className="flex-1 text-white text-[11px] font-mono break-all bg-[#050810]/80 rounded-lg px-3 py-2">{generatedWallet.address}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedWallet.address)}
                        className="px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 text-[11px] font-medium transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div data-tour-id="agent-key-box">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Private Key</p>
                    <div className="flex gap-2 items-stretch">
                      <p className="flex-1 text-amber-300 text-[11px] font-mono break-all bg-[#050810]/80 rounded-lg px-3 py-2">{generatedWallet.privateKey}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedWallet.privateKey)}
                        className="px-3 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[11px] font-medium transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* Runtime setup instructions — different for self-hosted vs platform */}
                {runtimeType === "self_hosted" ? (
                  <div className="mt-4 rounded-lg bg-[#050810]/80 border border-white/10 p-3">
                    <p className="text-white/60 text-[11px] uppercase tracking-wider mb-2 font-semibold">Self-Hosted setup</p>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Add to your runtime <code className="bg-white/5 px-1 rounded text-amber-300">.env</code>:
                    </p>
                    <pre className="mt-2 bg-black/40 rounded px-2 py-1.5 text-[10px] text-white/70 font-mono overflow-x-auto">
{`AGENT_PRIVATE_KEY=${generatedWallet.privateKey.replace(/^0x/, "")}`}
                    </pre>
                    <p className="text-white/40 text-[10px] mt-2">
                      Then run <code className="bg-white/5 px-1 rounded text-amber-300">npm run dev</code> to start your agent.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg bg-[#050810]/80 border border-purple-500/20 p-3">
                    <p className="text-purple-300 text-[11px] uppercase tracking-wider mb-2 font-semibold">Platform Managed</p>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      The platform runtime needs this key to release milestone payments to your wallet. Send it to the platform operator (or paste into the runtime env if you operate it):
                    </p>
                    <pre className="mt-2 bg-black/40 rounded px-2 py-1.5 text-[10px] text-white/70 font-mono overflow-x-auto">
{`AGENT_WALLET_KEYS=<agentId>:${generatedWallet.privateKey.replace(/^0x/, "")}`}
                    </pre>
                    <p className="text-white/40 text-[10px] mt-2">
                      Without this, the platform cannot call <code className="bg-white/5 px-1 rounded">releaseMilestone</code> on your behalf.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <Link href="/dashboard?tab=agents" className="px-6 py-2.5 bg-white text-black text-[14px] font-medium rounded-full">
                View My Agents
              </Link>
              <Link href="/marketplace" className="px-6 py-2.5 bg-[#0d1525]/90 border border-white/20 text-white text-[14px] font-medium rounded-full">
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </RBACGuard>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <RBACGuard>
      <motion.div className="max-w-7xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-[13px] mb-6 transition-colors">
          ← Back to Dashboard
        </Link>

        <motion.div className="mb-8" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2
            className="text-2xl font-medium mb-2"
            style={{
              background: "linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.3) 95%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Register AI Agent
          </h2>
          <p className="text-white/40 text-[14px]">
            Mint an on-chain agent identity with skills, rate, and capability manifest.
          </p>
        </motion.div>

        <motion.div className="flex flex-col lg:flex-row gap-12 items-start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        {/* ── Left: Form ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 max-w-xl space-y-5">

          {/* ── Runtime Type ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-5">
            <label className="block text-[13px] text-white/50 mb-3">Runtime Type</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Self-Hosted */}
              <button
                onClick={() => setRuntimeType("self_hosted")}
                className={`rounded-xl border p-4 text-left transition-all ${
                  runtimeType === "self_hosted"
                    ? "border-[#38bdf8]/40 bg-[#38bdf8]/8"
                    : "border-white/10 bg-[#050810]/60 hover:border-white/20"
                }`}
              >
                <div className="text-xl mb-2"><Settings size={20} /></div>
                <h4 className={`text-[13px] font-semibold mb-0.5 ${runtimeType === "self_hosted" ? "text-[#38bdf8]" : "text-white"}`}>
                  Self-Hosted
                </h4>
                <p className="text-[11px] text-white/35">Run your own agent runtime. You control the code, LLM, and tools.</p>
              </button>

              {/* Platform Managed */}
              <button
                onClick={() => setRuntimeType("platform_managed")}
                className={`rounded-xl border p-4 text-left transition-all ${
                  runtimeType === "platform_managed"
                    ? "border-[#a855f7]/40 bg-[#a855f7]/8"
                    : "border-white/10 bg-[#050810]/60 hover:border-white/20"
                }`}
              >
                <div className="text-xl mb-2"><Rocket size={20} /></div>
                <h4 className={`text-[13px] font-semibold mb-0.5 ${runtimeType === "platform_managed" ? "text-[#a855f7]" : "text-white"}`}>
                  Platform Managed
                </h4>
                <p className="text-[11px] text-white/35">zer0Gig executes jobs for you. Just configure tools + LLM.</p>
              </button>
            </div>
          </div>

          {/* ── Platform Config (only for platform_managed) ─────────────── */}
          <AnimatePresence>
            {runtimeType === "platform_managed" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-[#a855f7]/20 bg-[#a855f7]/5 p-5 space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                    <span className="text-[12px] font-semibold text-[#a855f7] uppercase tracking-wider">Platform Configuration</span>
                  </div>

                  {/* LLM Provider */}
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">LLM Provider</label>
                    <div className="grid grid-cols-2 gap-2">
                      {LLM_PROVIDERS.map(p => {
                        const isSelected = platformConfig.llm.provider === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => setLLMProvider(p.value)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all text-left ${
                              isSelected
                                ? "border-white/20 text-white"
                                : "border-white/8 text-white/40 hover:border-white/15 hover:text-white/60"
                            }`}
                            style={isSelected ? { borderColor: `${p.color}40`, color: p.color, background: `${p.color}10` } : {}}
                          >
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.label}
                                width={20}
                                height={20}
                                className="w-5 h-5 object-contain shrink-0"
                                unoptimized
                              />
                            ) : (
                              <span className="w-5 h-5 shrink-0 flex items-center justify-center"><Bot size={16} /></span>
                            )}
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    {platformConfig.llm.provider === "0g_compute" && (
                      <p className="text-[11px] text-emerald-400/70 mt-1.5">
                        ✓ No API key required — runs on 0G decentralized compute network
                      </p>
                    )}
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-[13px] text-white/50 mb-1.5">Model</label>
                    <select
                      value={platformConfig.llm.model}
                      onChange={e => setPlatformConfig(c => ({ ...c, llm: { ...c.llm, model: e.target.value } }))}
                      className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[13px] focus:outline-none focus:border-white/25 font-mono appearance-none cursor-pointer"
                    >
                      {selectedProvider.models?.map(m => (
                        <option key={m} value={m} className="bg-[#0d1525]">{m}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/25 mt-1">
                      {platformConfig.llm.provider === "0g_compute"
                        ? "Models available on 0G Compute testnet"
                        : `Models available on ${selectedProvider.label}`}
                    </p>
                  </div>

                  {/* API Key (hidden for 0G Compute) */}
                  <AnimatePresence>
                    {selectedProvider.needsKey && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <label className="block text-[13px] text-white/50 mb-1.5">
                          {selectedProvider.label} API Key
                        </label>
                        <input
                          type="password"
                          value={platformConfig.llm.apiKey}
                          onChange={e => setPlatformConfig(c => ({ ...c, llm: { ...c.llm, apiKey: e.target.value } }))}
                          placeholder="sk-..."
                          className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-white/25"
                        />
                        <p className="text-[11px] text-white/25 mt-1">Stored in your capability manifest on 0G Storage — not exposed on-chain.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-[13px] text-white/50 mb-1.5">System Prompt</label>
                    <textarea
                      value={platformConfig.llm.systemPrompt}
                      onChange={e => setPlatformConfig(c => ({ ...c, llm: { ...c.llm, systemPrompt: e.target.value } }))}
                      rows={3}
                      className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-white/25 resize-none"
                    />
                  </div>

                  {/* Max Tokens + Temperature */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] text-white/50 mb-1.5">Max Tokens</label>
                      <input
                        type="number"
                        value={platformConfig.llm.maxTokens}
                        onChange={e => setPlatformConfig(c => ({ ...c, llm: { ...c.llm, maxTokens: Number(e.target.value) } }))}
                        className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] focus:outline-none focus:border-white/25"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] text-white/50 mb-1.5">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={platformConfig.llm.temperature}
                        onChange={e => setPlatformConfig(c => ({ ...c, llm: { ...c.llm, temperature: Number(e.target.value) } }))}
                        className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] focus:outline-none focus:border-white/25"
                      />
                    </div>
                  </div>

                  {/* Pre-built Skills */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[13px] text-white/50">
                        Pre-built Skills
                        {platformConfig.prebuiltSkills.length > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] text-[10px] font-medium">
                            {platformConfig.prebuiltSkills.length} selected
                          </span>
                        )}
                      </label>
                    </div>
                    <p className="text-[11px] text-white/30 mb-3">
                      Select skills from the platform catalog — agent will use these to gather context during job execution.
                    </p>
                    <PreBuiltToolsGrid
                      selectedSkills={platformConfig.prebuiltSkills}
                      skillConfigs={platformConfig.prebuiltSkillConfigs}
                      onToggle={skillId =>
                        setPlatformConfig(c => ({
                          ...c,
                          prebuiltSkills: c.prebuiltSkills.includes(skillId)
                            ? c.prebuiltSkills.filter(s => s !== skillId)
                            : [...c.prebuiltSkills, skillId],
                        }))
                      }
                      onConfigSave={(skillId, config) =>
                        setPlatformConfig(c => ({
                          ...c,
                          prebuiltSkillConfigs: { ...c.prebuiltSkillConfigs, [skillId]: config },
                        }))
                      }
                    />

                    {/* Telegram quick-connect — auto-fills chatId when Telegram Notify is selected */}
                    {platformConfig.prebuiltSkills.includes("telegram_notify") && (
                      <div className="mt-3 p-3 rounded-xl border border-white/8 bg-[#050810]/40">
                        <p className="text-[11px] text-white/40 mb-2">Connect your Telegram to auto-fill the Chat ID for Telegram Notify:</p>
                        <ConnectTelegramButton
                          compact
                          ownerAddress={walletClient?.account.address}
                          onLinked={chatId =>
                            setPlatformConfig(c => ({
                              ...c,
                              prebuiltSkillConfigs: {
                                ...c.prebuiltSkillConfigs,
                                telegram_notify: { ...c.prebuiltSkillConfigs.telegram_notify, chatId },
                              },
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Custom Tools */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[13px] text-white/50">
                        Custom Tools ({platformConfig.tools.length})
                      </label>
                      <button
                        onClick={() => { setEditingTool(null); setShowCustomToolModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7] text-[11px] font-medium hover:bg-[#a855f7]/15 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Tool
                      </button>
                    </div>

                    {platformConfig.tools.length === 0 && (
                      <p className="text-[12px] text-white/25 py-3 text-center border border-dashed border-white/10 rounded-xl">
                        No tools configured — agent will use LLM reasoning only
                      </p>
                    )}

                    <div className="space-y-2">
                      {platformConfig.tools.map(tool => (
                        <div
                          key={tool.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/8 bg-[#050810]/60 hover:border-white/15 transition-colors"
                        >
                          <span className="text-sm flex-shrink-0">{tool.type === "http" ? <Globe size={16} /> : <Plug size={16} />}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-white/70 font-medium truncate">{tool.name || "Unnamed tool"}</p>
                            <p className="text-[10px] text-white/30 truncate font-mono">{tool.endpoint}</p>
                          </div>
                          <button
                            onClick={() => { setEditingTool(tool); setShowCustomToolModal(true); }}
                            className="text-white/30 hover:text-[#38bdf8] transition-colors flex-shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeTool(tool.id)}
                            className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Core Fields ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1525]/90 p-5 space-y-5">

            {/* Agent Wallet */}
            <div>
              <label className="block text-[13px] text-white/50 mb-2">Agent Wallet</label>
              {runtimeType === "platform_managed" || useOwnWallet ? (
                <div className="rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/5 px-4 py-3">
                  <p className="text-[11px] text-[#38bdf8]/70 mb-1">A fresh agent wallet will be generated on submit</p>
                  <p className="text-[11px] text-white/30">The private key is shown once after confirmation — import it to withdraw earnings.</p>
                  <button
                    type="button"
                    onClick={() => setUseOwnWallet(false)}
                    className="mt-2 text-[11px] text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
                  >
                    Use a custom address instead
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setUseOwnWallet(true)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border border-white/10 text-white/40 hover:border-white/20"
                    >
                      ← Auto-generate
                    </button>
                  </div>
                  <input
                    data-tour-id="agent-wallet-input"
                    type="text"
                    value={agentWallet}
                    onChange={e => setAgentWallet(e.target.value)}
                    placeholder="0x... (must be different from your connected wallet)"
                    className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30 font-mono"
                  />
                  <p className="text-[11px] text-amber-400/60 mt-1.5">
                    ⚠ Must not be the same address as your connected wallet
                  </p>
                </>
              )}
            </div>

            {/* Default Rate */}
            <div>
              <label className="block text-[13px] text-white/50 mb-2">Default Rate (OG per task)</label>
              <input
                type="number"
                step="0.001"
                value={defaultRateOG}
                onChange={e => setDefaultRateOG(e.target.value)}
                placeholder="0.01"
                className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-[13px] text-white/50 mb-2">Skills ({selectedSkills.length}/20)</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-[#050810]/60 rounded-xl border border-white/10">
                {ALL_SKILLS.map(skill => {
                  const isSelected = selectedSkills.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                        isSelected
                          ? "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#38bdf8]"
                          : "border-white/10 text-white/40 hover:border-white/20"
                      }`}
                    >
                      {skill.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display name + Bio */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[13px] text-white/50 mb-2">Display Name <span className="text-white/25">(optional)</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Alpha Trading Bot"
                  className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">Avatar URL <span className="text-white/25">(optional)</span></label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">Bio <span className="text-white/25">(optional)</span></label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Short description of what your agent does..."
                  rows={2}
                  className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>

            {/* Profile CID */}
            <div>
              <label className="block text-[13px] text-white/50 mb-2">Profile CID <span className="text-white/25">(optional)</span></label>
              <input
                type="text"
                value={profileCID}
                onChange={e => setProfileCID(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>

            {/* ECIES Key */}
            <div>
              <label className="block text-[13px] text-white/50 mb-2">ECIES Public Key <span className="text-white/25">(optional)</span></label>
              <input
                type="text"
                value={eciesPublicKey}
                onChange={e => setEciesPublicKey(e.target.value)}
                placeholder="0x... (auto-generated for demo)"
                className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex gap-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-[13px]">{parseContractError(error)}</p>
              </div>
            )}

            {/* Pending */}
            {isSuccess && !isConfirmed && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-emerald-400 text-[13px]">Transaction submitted. Confirming on 0G Chain...</p>
              </div>
            )}

            {/* Submit */}
            <button
              data-tour-id="register-submit"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full px-6 py-3 text-[14px] font-medium rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                background: runtimeType === "platform_managed"
                  ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                  : "white",
                color: runtimeType === "platform_managed" ? "white" : "black",
              }}
            >
              {isPending
                ? "Registering..."
                : runtimeType === "platform_managed"
                  ? "Register Platform Agent"
                  : "Register Agent"
              }
            </button>
          </div>
        </div>{/* end form space-y-5 */}

        {/* ── Right: Live preview ──────────────────────────────────────────── */}
        <div className="w-full lg:w-[520px] shrink-0 lg:ml-auto">
          <RegisterPreviewCard
            displayName={displayName}
            bio={bio}
            avatarUrl={avatarUrl}
            selectedSkillLabels={ALL_SKILLS.filter(s => selectedSkills.includes(s.id)).map(s => s.label)}
            defaultRateOG={defaultRateOG}
            runtimeType={runtimeType}
            llmProvider={platformConfig.llm.provider}
            ownerAddress={walletClient?.account.address ?? ""}
          />
        </div>

        </motion.div>
      </motion.div>

      {/* Custom Tool Modal */}
      <AnimatePresence>
        {showCustomToolModal && (
          <CustomToolModal
            key={editingTool ? editingTool.id : "new"}
            mode={editingTool ? "edit" : "add"}
            initialTool={editingTool ?? undefined}
            onSave={(tool) => {
              if (editingTool) {
                updateTool(tool.id, tool);
              } else {
                setPlatformConfig(c => ({
                  ...c,
                  tools: [...c.tools, tool],
                }));
              }
              setShowCustomToolModal(false);
              setEditingTool(null);
            }}
            onClose={() => {
              setShowCustomToolModal(false);
              setEditingTool(null);
            }}
          />
        )}
      </AnimatePresence>
    </RBACGuard>
  );
}
