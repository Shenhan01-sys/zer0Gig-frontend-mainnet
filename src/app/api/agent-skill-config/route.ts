import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

// PATCH /api/agent-skill-config
// Body: { agentId: number, skillId: string, config: object }
export async function PATCH(req: NextRequest) {
  try {
    const { agentId, skillId, config } = await req.json();
    if (!agentId || !skillId || !config) {
      return NextResponse.json({ error: "agentId, skillId, config required" }, { status: 400 });
    }

    // Upsert agent_skills row
    const { error } = await supabase
      .from("agent_skills")
      .upsert(
        { agent_id: agentId, skill_id: skillId, config, is_active: true },
        { onConflict: "agent_id,skill_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/agent-skill-config?agentId=X&skillId=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const skillId = searchParams.get("skillId");
  if (!agentId || !skillId) return NextResponse.json({ error: "agentId and skillId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("agent_skills")
    .select("config, is_active")
    .eq("agent_id", agentId)
    .eq("skill_id", skillId)
    .single();

  if (error) return NextResponse.json({ config: null });
  return NextResponse.json(data);
}
