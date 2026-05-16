import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { supabase } from "@/lib/supabase";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

// Don't generate this at build time — it requires live RPC calls
export const dynamic = "force-dynamic";
export const revalidate = 0;

const AGENT_REGISTRY_ABI = [
  "function totalAgents() view returns (uint256)",
  "function getAgentProfile(uint256 agentId) view returns (tuple(address owner, uint48 createdAt, uint16 winRate, uint16 version, bool isActive, bytes32 capabilityHash, bytes32 profileHash, address agentWallet, uint64 totalJobsCompleted, uint32 defaultRate, uint64 totalJobsAttempted, uint128 totalEarningsWei, uint48 updatedAt))",
  "function getAgentSkills(uint256 agentId) view returns (bytes32[])",
];

const RPC_URL = "https://evmrpc.0g.ai";
const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.AgentRegistry;


async function syncAgentStats(): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, AGENT_REGISTRY_ABI, provider);

  const totalAgentsBig = await contract.totalAgents();
  const totalAgents = Number(totalAgentsBig);

  if (totalAgents === 0) {
    return { synced: 0, errors: [] };
  }

  for (let i = 0; i < totalAgents; i++) {
    try {
      const profile = await contract.getAgentProfile(i);

      const tasksCompleted = Number(profile.totalJobsCompleted ?? 0);
      const totalJobsAttempted = Number(profile.totalJobsAttempted ?? 0);
      // winRate is 0-10000 bps; store as 0-100 percentage
      const successRate = Number(profile.winRate ?? 0) / 100;

      // Get skills count from on-chain
      let skillsCount = 0;
      try {
        const skills = await contract.getAgentSkills(i);
        skillsCount = skills?.length ?? 0;
      } catch {
        skillsCount = 0;
      }

      // Upsert — only include columns that exist in the live schema
      const statsData: Record<string, unknown> = {
        agent_id: i,
        self_improvement_rate: 0,
        tasks_completed: tasksCompleted,
        success_rate: successRate,
        skills_count: skillsCount,
      };

      const { error: upsertError } = await supabase
        .from("agent_proposal_stats")
        .upsert(statsData, { onConflict: "agent_id" });

      if (upsertError) {
        errors.push(`Agent ${i}: Supabase upsert failed - ${upsertError.message}`);
        console.error(`[sync] Agent ${i} upsert error:`, upsertError);
      } else {
        synced++;
      }
    } catch (err) {
      const msg = `Agent ${i}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`[sync] Agent ${i} failed:`, err);
    }
  }

  return { synced, errors };
}

export async function GET(_request: NextRequest) {
  try {
    const result = await syncAgentStats();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync] Fatal error:", err);
    return NextResponse.json(
      { synced: 0, errors: [`Fatal: ${err instanceof Error ? err.message : String(err)}`] },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const result = await syncAgentStats();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync] Fatal error:", err);
    return NextResponse.json(
      { synced: 0, errors: [`Fatal: ${err instanceof Error ? err.message : String(err)}`] },
      { status: 500 }
    );
  }
}
