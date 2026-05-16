import { defineChain, parseGwei } from "viem";

/**
 * 0G Aristotle Mainnet — chain 16661.
 *
 * RPC: https://evmrpc.0g.ai
 * Explorer: https://chainscan.0g.ai
 * Native token: 0G (18 decimals)
 *
 * No public faucet — fund wallets via CEX (Binance/KuCoin) → withdraw to
 * BNB Smart Chain network, then bridge via thirdweb/RocketX/Khalani.
 */
export const ogAristotle = defineChain({
  id: 16661,
  name: "0G Aristotle Mainnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan.0g.ai" },
  },
  testnet: false,
  fees: {
    // 0G mainnet gas runs around 4 Gwei. Cap priority fee at 5 Gwei to
    // prevent MetaMask from overestimating and over-charging small wallets.
    defaultPriorityFee: parseGwei("5"),
    baseFeeMultiplier: 1.1,
  },
});

/**
 * Legacy export alias.
 *
 * The testnet codebase imports `ogNewton` in ~20 files. To avoid touching
 * every import, re-export the mainnet chain definition under the same name.
 * If you ever want to run testnet from this repo, swap the value below to
 * defineChain({ id: 16602, ... }) and the rest of the app reacts.
 */
export const ogNewton = ogAristotle;
