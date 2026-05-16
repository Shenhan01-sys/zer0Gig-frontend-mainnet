import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy-init: env vars are NOT available during `next build` page-data
// collection, only at request time. Module-level createClient() with empty
// strings throws "supabaseKey is required" and breaks the build.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}
const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) { return (getSupabase() as any)[prop]; },
});

/**
 * POST /api/agent-activity
 * Called by the agent runtime to log execution progress.
 *
 * Body:
 * {
 *   jobId: number,
 *   agentId: string,
 *   agentWallet: string,
 *   phase: "downloading_brief" | "processing" | "uploading" | "submitting" | "completed" | "error",
 *   message: string,
 *   milestoneIndex?: number,
 *   metadata?: Record<string, unknown>,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { jobId, agentId, agentWallet, phase, message, milestoneIndex, metadata } = body;

    if (!jobId || !phase || !message) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, phase, message" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("agent_activity").insert({
      job_id: jobId,
      agent_id: agentId || null,
      agent_wallet: agentWallet || null,
      phase,
      message,
      milestone_index: milestoneIndex ?? null,
      metadata: metadata || {},
    });

    if (error) {
      console.error("[API] Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] Agent activity error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-activity?jobId=123
 * GET /api/agent-activity?agentId=7&limit=30
 * Returns activity entries ordered newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId   = searchParams.get("jobId");
    const agentId = searchParams.get("agentId");

    if (!jobId && !agentId) {
      return NextResponse.json(
        { error: "Missing jobId or agentId parameter" },
        { status: 400 }
      );
    }

    if (agentId) {
      const limit = Math.min(100, parseInt(searchParams.get("limit") || "30", 10));
      const { data, error } = await supabase
        .from("agent_activity")
        .select("id, job_id, phase, message, created_at, agent_wallet")
        .eq("agent_id", parseInt(agentId, 10))
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[API] Supabase fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data ?? []);
    }

    const { data, error } = await supabase
      .from("agent_activity")
      .select("*")
      .eq("job_id", parseInt(jobId!, 10))
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[API] Supabase fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API] Agent activity fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
