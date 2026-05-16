import { NextResponse } from "next/server";
import {
  createPublicClient, createWalletClient, http,
  parseEther, formatEther,
  recoverMessageAddress, isAddress, defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACT_CONFIG, NETWORK_CONFIG } from "@/lib/contracts";

/**
 * POST /api/agent/withdraw
 *
 * Real withdrawal endpoint. Flow:
 *
 *   1. Validates the request body.
 *   2. Recovers the signer from `signature(message)` and confirms it matches
 *      AgentRegistry.ownerOf(agentId). Rejects 403 on mismatch.
 *   3. Looks up the agent's private key in process.env.AGENT_WALLET_KEYS
 *      (format documented below). Returns 503 with a clear error if missing.
 *   4. Reads the agent wallet's on-chain balance and rejects if amount + gas
 *      reserve would overdraft.
 *   5. Signs and broadcasts a native OG transfer from agent.agentWallet to
 *      destination via the 0G Aristotle RPC.
 *   6. Returns the real tx hash for chainscan.
 *
 * AGENT_WALLET_KEYS env format:
 *   AGENT_WALLET_KEYS=42:abc123...64hex,43:def456...64hex
 *   - Comma-separated entries
 *   - Each entry: <agentId>:<privateKeyHex> (0x prefix optional)
 *   - The same format Hans was shown during register-agent
 *
 * When the env is missing or doesn't contain the requested agent's key, the
 * route returns a deterministic mock response so the UX still demonstrates
 * the multi-state button. The mock txHash is a properly-formed 32-byte hex
 * so chainscan returns "tx not found" instead of a parse error.
 */

const RPC_URL = process.env.OG_NEWTON_RPC_URL ?? "https://evmrpc.0g.ai";

const OG_NEWTON_CHAIN = defineChain({
  id:               NETWORK_CONFIG.chainId,
  name:             NETWORK_CONFIG.chainName,
  nativeCurrency:   NETWORK_CONFIG.nativeCurrency,
  rpcUrls:          { default: { http: [RPC_URL] } },
  blockExplorers:   { default: { name: "0G Chainscan", url: NETWORK_CONFIG.blockExplorer } },
});

// Reserve for gas — 0.001 OG is wildly generous for a native transfer.
const GAS_RESERVE_WEI = parseEther("0.001");

// Replay-protection window — the signed message includes a timestamp and we
// reject anything older than this. 5 minutes is forgiving enough for slow
// wallet UIs while preventing month-old signatures from being replayed.
const MAX_SIGNATURE_AGE_MS = 5 * 60_000;

interface WithdrawRequest {
  agentId:     string;
  amount:      string;
  destination: string;
  signature:   string;
  message:     string;
}

function parseAgentKeys(env: string | undefined): Map<number, `0x${string}`> {
  const map = new Map<number, `0x${string}`>();
  if (!env) return map;
  for (const raw of env.split(",")) {
    const pair = raw.trim();
    if (!pair) continue;
    const [idStr, ...keyParts] = pair.split(":");
    const keyHex = keyParts.join(":").trim();
    const id     = Number(idStr.trim());
    if (!Number.isFinite(id) || !keyHex) continue;
    const normalized = keyHex.startsWith("0x") ? keyHex : `0x${keyHex}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) continue;
    map.set(id, normalized as `0x${string}`);
  }
  return map;
}

function extractTimestampFromMessage(message: string): number | null {
  // Canonical message format from the page:
  //   "...\nTimestamp: <ms>"
  const m = /Timestamp:\s*(\d+)/i.exec(message);
  if (!m) return null;
  const ts = Number(m[1]);
  return Number.isFinite(ts) ? ts : null;
}

// Produce a syntactically-valid 32-byte tx hash for mock responses so
// chainscan returns 'tx not found' instead of the 'hex64' parse error.
function deterministicMockHash(agentId: string, timestamp: number): `0x${string}` {
  const seed   = `${agentId}-${timestamp}`;
  const hex    = Array.from(seed).map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  const padded = (hex + "0".repeat(64)).slice(0, 64);
  return `0x${padded}` as `0x${string}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<WithdrawRequest>;
    const { agentId, amount, destination, signature, message } = body;

    if (!agentId || !amount || !destination || !signature || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: agentId, amount, destination, signature, message" },
        { status: 400 },
      );
    }
    if (!isAddress(destination)) {
      return NextResponse.json(
        { ok: false, error: "Invalid destination address" },
        { status: 400 },
      );
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid amount" },
        { status: 400 },
      );
    }

    // ── 1. Recover signer + verify against on-chain owner ─────────────────
    let recovered: `0x${string}`;
    try {
      recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not recover signer from signature" },
        { status: 400 },
      );
    }

    const publicClient = createPublicClient({
      chain:     OG_NEWTON_CHAIN,
      transport: http(RPC_URL),
    });

    let onChainOwner: `0x${string}`;
    try {
      onChainOwner = (await publicClient.readContract({
        address:      CONTRACT_CONFIG.AgentRegistry.address as `0x${string}`,
        abi:          CONTRACT_CONFIG.AgentRegistry.abi,
        functionName: "ownerOf",
        args:         [BigInt(agentId)],
      })) as `0x${string}`;
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `Agent #${agentId} not found on AgentRegistry: ${err instanceof Error ? err.message : String(err)}` },
        { status: 404 },
      );
    }

    if (recovered.toLowerCase() !== onChainOwner.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Signature does not match the on-chain owner of this agent" },
        { status: 403 },
      );
    }

    // ── 2. Replay protection ──────────────────────────────────────────────
    const ts = extractTimestampFromMessage(message);
    if (ts === null) {
      return NextResponse.json(
        { ok: false, error: "Signed message is missing a timestamp" },
        { status: 400 },
      );
    }
    const age = Date.now() - ts;
    if (age < 0 || age > MAX_SIGNATURE_AGE_MS) {
      return NextResponse.json(
        { ok: false, error: `Signature too old or in the future (age: ${Math.round(age / 1000)}s, max: ${MAX_SIGNATURE_AGE_MS / 1000}s)` },
        { status: 400 },
      );
    }

    // ── 3. Resolve agent's private key from env ───────────────────────────
    const keyMap   = parseAgentKeys(process.env.AGENT_WALLET_KEYS);
    const agentKey = keyMap.get(Number(agentId));

    if (!agentKey) {
      // Phase-1 demo fallback — env not configured for this agent. Return a
      // valid-format mock hash so the success UI works AND chainscan returns
      // a clean "tx not found" instead of the malformed-hash parse error.
      return NextResponse.json({
        ok:     true,
        txHash: deterministicMockHash(agentId, ts),
        mock:   true,
        reason:
          `Agent #${agentId} wallet key not configured on the server. Add ` +
          `AGENT_WALLET_KEYS=${agentId}:<keyhex> (the key shown during register-agent) ` +
          `to the Vercel project env so real on-chain withdrawals can sign.`,
      });
    }

    // ── 4. Build, sign, broadcast ─────────────────────────────────────────
    const agentAccount = privateKeyToAccount(agentKey);

    // Sanity: the env's key must produce the same address the AgentRegistry
    // has recorded as agent.agentWallet. Otherwise we'd be sending from the
    // wrong wallet.
    let onChainAgentWallet: `0x${string}`;
    try {
      const profile = (await publicClient.readContract({
        address:      CONTRACT_CONFIG.AgentRegistry.address as `0x${string}`,
        abi:          CONTRACT_CONFIG.AgentRegistry.abi,
        functionName: "getAgentProfile",
        args:         [BigInt(agentId)],
      })) as { agentWallet: `0x${string}` };
      onChainAgentWallet = profile.agentWallet;
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `Could not read agent profile: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 },
      );
    }

    if (agentAccount.address.toLowerCase() !== onChainAgentWallet.toLowerCase()) {
      return NextResponse.json({
        ok: false,
        error:
          `Configured key for agent #${agentId} resolves to ${agentAccount.address} ` +
          `but on-chain agentWallet is ${onChainAgentWallet}. Update the env value.`,
      }, { status: 500 });
    }

    // Balance check
    const balance   = await publicClient.getBalance({ address: agentAccount.address });
    const amountWei = parseEther(String(amount));
    if (balance < amountWei + GAS_RESERVE_WEI) {
      return NextResponse.json({
        ok: false,
        error:
          `Insufficient balance. Available ${formatEther(balance)} OG · ` +
          `requested ${amount} OG · gas reserve ${formatEther(GAS_RESERVE_WEI)} OG.`,
      }, { status: 400 });
    }

    const walletClient = createWalletClient({
      account:   agentAccount,
      chain:     OG_NEWTON_CHAIN,
      transport: http(RPC_URL),
    });

    const txHash = await walletClient.sendTransaction({
      to:    destination as `0x${string}`,
      value: amountWei,
    });

    return NextResponse.json({
      ok:     true,
      txHash,
      mock:   false,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Withdraw failed" },
      { status: 500 },
    );
  }
}
