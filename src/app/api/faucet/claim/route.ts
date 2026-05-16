import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  isAddress,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/faucet/claim
 *
 * Distributes 0.5 OG to new users from the community faucet wallet.
 * Double-claim prevention via Supabase faucet_claims table.
 *
 * Env:
 *   FAUCET_PRIVATE_KEY — private key of the faucet wallet (0x prefix, 64 hex)
 *   OG_NEWTON_RPC_URL  — optional, defaults to https://evmrpc.0g.ai
 */

const RPC_URL = process.env.OG_NEWTON_RPC_URL ?? "https://evmrpc.0g.ai";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const FAUCET_AMOUNT = "0.5";

const OG_NEWTON_CHAIN = defineChain({
  id: 16661,
  name: "0G Aristotle Mainnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan.0g.ai" },
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/faucet/claim?wallet=0x...
 *
 * Returns whether the wallet has already claimed starter credits.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const walletAddress = url.searchParams.get("wallet");

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { ok: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    const { data: existing } = await supabase
      .from("faucet_claims")
      .select("tx_hash, amount, claimed_at")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        claimed: true,
        txHash: existing.tx_hash,
        amount: existing.amount,
        claimedAt: existing.claimed_at,
      });
    }

    return NextResponse.json({ ok: true, claimed: false });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Check failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { ok: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // ── 1. Double-claim guard ───────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("faucet_claims")
      .select("id")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Starter credits already claimed" },
        { status: 409 }
      );
    }

    // ── 2. Env sanity ───────────────────────────────────────────────────────
    if (!FAUCET_PRIVATE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Faucet not configured" },
        { status: 503 }
      );
    }

    const account = privateKeyToAccount(
      FAUCET_PRIVATE_KEY.startsWith("0x")
        ? (FAUCET_PRIVATE_KEY as `0x${string}`)
        : (`0x${FAUCET_PRIVATE_KEY}` as `0x${string}`)
    );

    const publicClient = createPublicClient({
      chain: OG_NEWTON_CHAIN,
      transport: http(RPC_URL),
    });

    // ── 3. Balance check ────────────────────────────────────────────────────
    const balance = await publicClient.getBalance({ address: account.address });
    const amountWei = parseEther(FAUCET_AMOUNT);

    if (balance < amountWei) {
      return NextResponse.json(
        {
          ok: false,
          error: `Faucet empty. Available ${formatEther(balance)} OG · requested ${FAUCET_AMOUNT} OG.`,
        },
        { status: 503 }
      );
    }

    // ── 4. Broadcast transfer ───────────────────────────────────────────────
    const walletClient = createWalletClient({
      account,
      chain: OG_NEWTON_CHAIN,
      transport: http(RPC_URL),
    });

    const txHash = await walletClient.sendTransaction({
      to: walletAddress as `0x${string}`,
      value: amountWei,
    });

    // ── 5. Record claim (best-effort; tx already broadcast) ─────────────────
    try {
      await supabase.from("faucet_claims").insert({
        wallet_address: normalizedWallet,
        amount: FAUCET_AMOUNT,
        tx_hash: txHash,
      });
    } catch {
      // Supabase insert failed but tx is already on-chain. Still return success
      // so the frontend unlocks the register button.
    }

    return NextResponse.json({
      ok: true,
      txHash,
      amount: FAUCET_AMOUNT,
      explorer: `https://chainscan.0g.ai/tx/${txHash}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Claim failed" },
      { status: 500 }
    );
  }
}
