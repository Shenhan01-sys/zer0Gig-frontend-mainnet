// ─────────────────────────────────────────────────────────────────────────────
// 0G Compute Network — Available Models
// Sources:
//   https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference
//   https://compute-marketplace.0g.ai/inference
//   https://0g.ai/blog/0gm-1-0-35b-a3b (0GM-1.0 announcement, May 2026)
//   https://0g.ai/blog/glm-5-live-on-0g-compute
//
// The provider/model catalog on 0G Compute is dynamic — providers join and
// leave, pricing is per-provider. This file is the curated list of well-known
// models we surface in the onboarding model picker. Treat this as the source
// of truth for the picker UI; query `broker.inference.listService()` on the
// server when you need live pricing/availability.
// ─────────────────────────────────────────────────────────────────────────────

export type OGModelTier = "frontier" | "balanced" | "fast" | "specialized";
export type OGModelKind = "llm" | "vision" | "audio";

export interface OGModel {
  id: string;            // Canonical model id used in API + DB
  name: string;          // Display name
  tier: OGModelTier;
  kind: OGModelKind;
  contextWindow: string; // Human-readable e.g. "32K tokens"
  network: "testnet" | "mainnet" | "both";
  description: string;
  bestFor: string;
  provider: string;      // Upstream provider name (Alibaba / OpenAI / Google / etc.)
  status: "live" | "coming_soon";
}

export const OG_MODELS: OGModel[] = [
  // ───── 0G-NATIVE (sovereign tier) ─────────────────────────────────────────
  {
    id: "0GM-1.0-35B-A3B",
    name: "0GM-1.0 (35B-A3B)",
    tier: "frontier",
    kind: "vision",
    contextWindow: "262K → 1M tokens",
    network: "mainnet",
    description: "0G's first proprietary AI model. Trained, deployed, and served end-to-end on 0G Compute itself. 35B MoE (3B active), Qwen 3.6 architecture, fine-tuned for agentic coding and multi-step tool use.",
    bestFor: "Agentic coding, autonomous task execution, multi-step reasoning",
    provider: "0G Labs (sovereign)",
    status: "live",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    tier: "frontier",
    kind: "llm",
    contextWindow: "1M tokens",
    network: "mainnet",
    description: "DeepSeek's flagship reasoning model. 1.6T total / 49B active params with DSA sparse attention. Strongest general reasoning available on 0G.",
    bestFor: "Complex reasoning, planning, code generation, long-context tasks",
    provider: "DeepSeek (self-hosted on 0G)",
    status: "live",
  },
  // ───── FOUNDATION MAINNET CATALOG ────────────────────────────────────────
  {
    id: "GLM-5-FP8",
    name: "GLM-5 FP8",
    tier: "frontier",
    kind: "llm",
    contextWindow: "128K tokens",
    network: "mainnet",
    description: "Zhipu AI's 744B MoE model — ranked #1 open-source by Artificial Analysis. FP8 quantized for performance.",
    bestFor: "High-quality reasoning, research, complex analysis",
    provider: "Zhipu AI (self-hosted on 0G)",
    status: "live",
  },
  {
    id: "deepseek-chat-v3-0324",
    name: "DeepSeek Chat V3",
    tier: "balanced",
    kind: "llm",
    contextWindow: "64K tokens",
    network: "mainnet",
    description: "Optimized conversational model. Fast turn-around with strong general capabilities.",
    bestFor: "Customer service, conversational subscriptions, day-to-day agents",
    provider: "DeepSeek (self-hosted on 0G)",
    status: "live",
  },
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    tier: "frontier",
    kind: "llm",
    contextWindow: "32K tokens",
    network: "mainnet",
    description: "Large-scale open-source GPT model. Strong general-purpose performance.",
    bestFor: "General agents, writing, code generation",
    provider: "OpenAI-compatible",
    status: "live",
  },
  {
    id: "qwen3-vl-30b-a3b-instruct",
    name: "Qwen3-VL 30B-A3B",
    tier: "balanced",
    kind: "vision",
    contextWindow: "128K tokens",
    network: "mainnet",
    description: "Efficient multimodal model (vision + text). 30B MoE, 3B active.",
    bestFor: "Multimodal agents, document understanding, image analysis",
    provider: "Alibaba (self-hosted on 0G)",
    status: "live",
  },
  {
    id: "qwen3.6-plus",
    name: "Qwen3.6-Plus",
    tier: "frontier",
    kind: "llm",
    contextWindow: "1M tokens",
    network: "mainnet",
    description: "Alibaba's flagship LLM with hybrid linear attention and sparse MoE routing. Optimized for agentic coding, multi-step workflows. 119 languages. Via TeeTLS (Alibaba Cloud).",
    bestFor: "Multi-lingual agents, long-context analysis, agentic workflows",
    provider: "Alibaba Cloud (TeeTLS proxy)",
    status: "live",
  },
  // ───── TESTNET (Galileo, chain 16602) — kept for cross-network reference ──
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    tier: "balanced",
    kind: "llm",
    contextWindow: "32K tokens",
    network: "testnet",
    description: "Alibaba's lightweight model — available on testnet for free development.",
    bestFor: "Development, testing, low-stakes agents",
    provider: "Alibaba",
    status: "live",
  },
  {
    id: "gpt-oss-20b",
    name: "GPT-OSS 20B",
    tier: "fast",
    kind: "llm",
    contextWindow: "8K tokens",
    network: "testnet",
    description: "Open-weights GPT alternative for testnet development.",
    bestFor: "Development, conversational testing",
    provider: "OpenAI-compatible",
    status: "live",
  },
  {
    id: "gemma-3-27b",
    name: "Gemma 3 27B",
    tier: "balanced",
    kind: "llm",
    contextWindow: "16K tokens",
    network: "testnet",
    description: "Google's open-weights model — testnet only.",
    bestFor: "Development, analysis tasks",
    provider: "Google",
    status: "live",
  },
];

export function getModelById(id: string): OGModel | undefined {
  return OG_MODELS.find(m => m.id === id);
}

// Default model — 0G's own model, optimized for agentic coding (zer0Gig's primary use case)
export const DEFAULT_MODEL_ID: string = "0GM-1.0-35B-A3B";
