// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYED CONTRACT ADDRESSES (0G Aristotle Mainnet - Chain ID: 16661)
// Deployed: 2026-05-16 · Deployer: 0x48379F4d1427209311E9FF0bcC4a354953ea631B
// All 6 contracts verified on https://chainscan.0g.ai
// Authoritative record: project-mainnet/contracts/deployments/aristotle.json
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT ABIs (Imported from Hardhat artifacts)
// ─────────────────────────────────────────────────────────────────────────────

import AgentRegistryABI from './abis/AgentRegistry.json';
import ProgressiveEscrowABI from './abis/ProgressiveEscrow.json';
import SubscriptionEscrowABI from './abis/SubscriptionEscrow.json';
import UserRegistryABI from './abis/UserRegistry.json';
import AgentMarketplaceABI from './abis/AgentMarketplace.json';
import AgentEarningsVaultABI from './abis/AgentEarningsVault.json';
import { type Abi } from 'viem';

export const AGENT_REGISTRY_ABI = AgentRegistryABI.abi as Abi;
export const PROGRESSIVE_ESCROW_ABI = ProgressiveEscrowABI.abi as Abi;
export const SUBSCRIPTION_ESCROW_ABI = SubscriptionEscrowABI.abi as Abi;
export const USER_REGISTRY_ABI = UserRegistryABI.abi as Abi;
export const AGENT_MARKETPLACE_ABI = AgentMarketplaceABI.abi as Abi;
export const AGENT_EARNINGS_VAULT_ABI = AgentEarningsVaultABI.abi as Abi;

// ─────────────────────────────────────────────────────────────────────────────
// SKILL IDS (Well-known keccak256 hashes)
// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_IDS = {
  solidityDev:     "0x8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b" as const,
  frontendDev:     "0x2c5d2e1e0b72e9f9f6c3e0c1d2a1b0a9f8e7d6c5b4a392817060504030201000" as const,
  webSearch:       "0x5c6b7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e00" as const,
  codeExecution:   "0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d00" as const,
  dataAnalysis:    "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a00" as const,
  contentWriting:  "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f00" as const,
  imageGeneration: "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c00" as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYED CONTRACT ADDRESSES (0G Aristotle Mainnet - Chain ID: 16661)
// Deployed: 2026-05-16 · Deployer: 0x48379F4d1427209311E9FF0bcC4a354953ea631B
// Alignment Verifier + Treasury: same as deployer (hackathon — pisahin sebelum production)
// Total gas cost: 0.0407 OG. All contracts verified on chainscan.0g.ai
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRACT_ADDRESSES = {
  // ERC-7857 iNFT — agent identity, skills, per-skill reputation
  // Scan: https://chainscan.0g.ai/address/0x0fAE6342195fdc0007B94Fb3293bF56463C55ff3#code
  AgentRegistry: "0x0fAE6342195fdc0007B94Fb3293bF56463C55ff3",

  // ERC-8183 Agentic Commerce — one-time jobs, milestone escrow, alignment gate
  // Scan: https://chainscan.0g.ai/address/0x5A18F8D33D551666233701025754274dCA9B2929#code
  ProgressiveEscrow: "0x5A18F8D33D551666233701025754274dCA9B2929",

  // ERC-8183 Recurring Extension — subscriptions, 3 interval modes, OKX session voucher
  // Scan: https://chainscan.0g.ai/address/0x7A072465AC232709C114C5DAa842a9b7010D1d4f#code
  SubscriptionEscrow: "0x7A072465AC232709C114C5DAa842a9b7010D1d4f",

  // Wallet role management (Client / FreelancerOwner)
  // Scan: https://chainscan.0g.ai/address/0x10421Eb1A230F484eEdB64642505d073e791823c#code
  UserRegistry: "0x10421Eb1A230F484eEdB64642505d073e791823c",

  // P2P agent resale market (2.5% protocol fee to treasury)
  // Scan: https://chainscan.0g.ai/address/0x3D33c7E30c9FC1AE387387dabb5a8fcc3333d83e#code
  AgentMarketplace: "0x3D33c7E30c9FC1AE387387dabb5a8fcc3333d83e",

  // Keyless agent earnings custody — owner-of-iNFT gated withdrawals
  // Scan: https://chainscan.0g.ai/address/0x38f22fe2fF8f2e0bF346D2889a276c1b872B6880#code
  AgentEarningsVault: "0x38f22fe2fF8f2e0bF346D2889a276c1b872B6880",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// WAGMI CONTRACT CONFIG (Type-safe)
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRACT_CONFIG = {
  AgentRegistry: {
    address: CONTRACT_ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
  },
  ProgressiveEscrow: {
    address: CONTRACT_ADDRESSES.ProgressiveEscrow,
    abi: PROGRESSIVE_ESCROW_ABI,
  },
  SubscriptionEscrow: {
    address: CONTRACT_ADDRESSES.SubscriptionEscrow,
    abi: SUBSCRIPTION_ESCROW_ABI,
  },
  UserRegistry: {
    address: CONTRACT_ADDRESSES.UserRegistry,
    abi: USER_REGISTRY_ABI,
  },
  AgentMarketplace: {
    address: CONTRACT_ADDRESSES.AgentMarketplace,
    abi: AGENT_MARKETPLACE_ABI,
  },
  AgentEarningsVault: {
    address: CONTRACT_ADDRESSES.AgentEarningsVault,
    abi: AGENT_EARNINGS_VAULT_ABI,
  },
} as const;

export type ContractName = keyof typeof CONTRACT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// NETWORK CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const NETWORK_CONFIG = {
  chainId: 16661,
  chainName: '0G Aristotle Mainnet',
  rpcUrl: 'https://evmrpc.0g.ai',
  blockExplorer: 'https://chainscan.0g.ai',
  nativeCurrency: {
    name: 'OG',
    symbol: 'OG',
    decimals: 18,
  },
} as const;
