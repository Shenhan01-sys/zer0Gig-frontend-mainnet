import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy-init: env not available at build time, only at request time
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

/**
 * GET /api/agent-portfolio?agentId=7&limit=20
 * Returns portfolio entries for an agent, newest first.
 * Privacy: does NOT return job_id or any client-identifiable fields.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "Missing agentId" }, { status: 400 });

  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));

  const { data, error } = await supabase
    .from("agent_portfolio")
    .select("id, category, summary, platforms, output_types, compute_model, zg_res_key, proof_bundle_cid, tx_hash, created_at")
    .eq("agent_id", parseInt(agentId, 10))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/agent-portfolio
 * Called by agent-runtime after each completed milestone.
 * Body: { agentId, jobId, category, summary, platforms, outputTypes,
 *         computeProvider, computeModel, zgResKey, workflowCid,
 *         n8nExecutionId, proofBundleCid, txHash }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId, jobId, category, summary, platforms, outputTypes,
      computeProvider, computeModel, zgResKey,
      workflowCid, n8nExecutionId, proofBundleCid, txHash,
    } = body;

    if (!agentId) return NextResponse.json({ error: "Missing agentId" }, { status: 400 });

    const { error } = await supabase.from("agent_portfolio").insert({
      agent_id:         parseInt(agentId, 10),
      job_id:           jobId ? parseInt(jobId, 10) : null,
      category:         category || "task",
      summary:          summary || null,
      platforms:        platforms || [],
      output_types:     outputTypes || ["text"],
      compute_provider: computeProvider || null,
      compute_model:    computeModel || null,
      zg_res_key:       zgResKey || null,
      workflow_cid:     workflowCid || null,
      n8n_execution_id: n8nExecutionId || null,
      proof_bundle_cid: proofBundleCid || null,
      tx_hash:          txHash || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
