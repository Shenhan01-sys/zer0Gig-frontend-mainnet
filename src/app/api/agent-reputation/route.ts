import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { keccak256, toBytes } from "viem";

// Lazy-init: env not available at build time, only at request time.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = new Proxy({} as object, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_, prop) { return (getSupabase() as any)[prop]; },
});

const isHash = (s: unknown): s is string =>
  typeof s === "string" && s.startsWith("0x") && s.length >= 10;

/**
 * GET /api/agent-reputation?agentId=1
 *
 * Builds a content-addressed Reputation Manifest from the agent's verifiable
 * track record (agent_portfolio). The manifest hash is deterministic for a
 * given record set — this is the value that gets anchored into the agent's
 * ERC-7857 metadata so reputation travels with the iNFT when it is
 * transferred or cloned via AgentMarketplace (V1.5 on-chain anchoring).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  const id = parseInt(agentId, 10);

  const [{ data: portfolio, error: pErr }, { data: profile }] = await Promise.all([
    supabase
      .from("agent_portfolio")
      .select("category, compute_model, zg_res_key, proof_bundle_cid, tx_hash, created_at")
      .eq("agent_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_profiles")
      .select("display_name, owner_address")
      .eq("agent_id", id)
      .maybeSingle(),
  ]);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const rows: Array<Record<string, unknown>> = portfolio ?? [];

  const verifiedDeliverables = rows.filter(r => isHash(r.zg_res_key) || isHash(r.proof_bundle_cid)).length;
  const onchainSettlements   = rows.filter(r => isHash(r.tx_hash)).length;

  const models = Array.from(
    new Set(rows.map(r => (r.compute_model as string) || "").filter(Boolean))
  ).sort();

  const categories: Record<string, number> = {};
  for (const r of rows) {
    const c = (r.category as string) || "task";
    categories[c] = (categories[c] ?? 0) + 1;
  }

  const firstJobAt = rows.length ? (rows[0].created_at as string) : null;
  const lastJobAt  = rows.length ? (rows[rows.length - 1].created_at as string) : null;

  // Canonical, deterministic core — the part that gets content-hashed.
  // Excludes wall-clock timestamps so the same record set always hashes the
  // same value (a stable anchor for the iNFT metadata).
  const core = {
    schema: "zer0gig.reputation.v1",
    agentId: id,
    jobsCompleted: rows.length,
    verifiedDeliverables,
    onchainSettlements,
    models,
    categories: Object.fromEntries(Object.entries(categories).sort(([a], [b]) => a.localeCompare(b))),
    firstJobAt,
    lastJobAt,
  };

  const manifestHash = keccak256(toBytes(JSON.stringify(core)));

  return NextResponse.json({
    ...core,
    owner: profile?.owner_address ?? null,
    displayName: profile?.display_name ?? null,
    manifestHash,
    generatedAt: new Date().toISOString(),
    // Where this anchor lives once on-chain (V1.5): the iNFT's metadata.
    anchor: { standard: "ERC-7857", field: "reputationManifest", status: "preview" },
  });
}
