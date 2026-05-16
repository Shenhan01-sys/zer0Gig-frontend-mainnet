import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { createClient } from "@supabase/supabase-js";
import AgentRegistryABI from "@/lib/abis/AgentRegistry.json";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const RPC_URL = process.env.OG_NEWTON_RPC_URL || "https://evmrpc.0g.ai";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AgentProfile {
  agentId: number;
  owner: string;
  agentWallet: string;
  capabilityHash: string;
  profileHash: string;
  winRate: number;
  version: number;
  totalJobsCompleted: number;
  totalJobsAttempted: number;
  totalEarningsWei: string;
  defaultRateRaw: number;   // uint32 in 1e10-wei units
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  displayName: string | null;
  tags: string[] | null;
}

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.AgentRegistry,
      AgentRegistryABI.abi,
      provider
    );

    const totalAgentsBig = await contract.totalAgents();
    const totalAgents = Number(totalAgentsBig);

    const agents: AgentProfile[] = [];

    const fetchTasks = Array.from({ length: totalAgents }, (_, i) => i + 1).map(async (agentId) => {
      try {
        const p = await contract.getAgentProfile(agentId);
        if (!p || p.owner === ethers.ZeroAddress) return;
        agents.push({
          agentId,
          owner: p.owner as string,
          agentWallet: p.agentWallet as string,
          capabilityHash: p.capabilityHash as string,
          profileHash: p.profileHash as string,
          winRate: Number(p.winRate),
          version: Number(p.version),
          totalJobsCompleted: Number(p.totalJobsCompleted),
          totalJobsAttempted: Number(p.totalJobsAttempted),
          totalEarningsWei: (p.totalEarningsWei as bigint).toString(),
          defaultRateRaw: Number(p.defaultRate),
          createdAt: Number(p.createdAt),
          updatedAt: Number(p.updatedAt),
          isActive: p.isActive as boolean,
          displayName: null,
          tags: null,
        });
      } catch {
        // agent id doesn't exist or reverted — skip
      }
    });

    await Promise.all(fetchTasks);

    // Enrich with Supabase off-chain metadata
    const agentIds = agents.map(a => a.agentId);
    const admin = getAdminClient();
    const { data: profiles } = await admin
      .from("agent_profiles")
      .select("agent_id, display_name, tags, bio, avatar_url")
      .in("agent_id", agentIds.length > 0 ? agentIds : [-1]);

    const profileMap = new Map<number, { displayName: string | null; tags: string[] | null; bio: string | null; avatarUrl: string | null }>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.agent_id, {
        displayName: p.display_name,
        tags: p.tags,
        bio: p.bio,
        avatarUrl: p.avatar_url,
      });
    });

    const result = agents
      .sort((a, b) => a.agentId - b.agentId)
      .map(a => {
        const sp = profileMap.get(a.agentId);
        // defaultRate stored as uint32 in 1e10-wei units → multiply for actual wei value
        const defaultRateWei = BigInt(a.defaultRateRaw) * BigInt(10_000_000_000);
        return {
          agentId: a.agentId,
          owner: a.owner,
          agentWallet: a.agentWallet,
          capabilityHash: a.capabilityHash,
          profileHash: a.profileHash,
          winRate: a.winRate,
          overallScore: a.winRate,  // legacy field for backward-compat with marketplace
          version: a.version,
          totalJobsCompleted: a.totalJobsCompleted,
          totalJobsAttempted: a.totalJobsAttempted,
          totalEarningsWei: a.totalEarningsWei,
          defaultRate: defaultRateWei.toString(),
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          isActive: a.isActive,
          displayName: sp?.displayName || null,
          tags: sp?.tags || [],
          bio: sp?.bio || null,
          avatarUrl: sp?.avatarUrl || null,
        };
      });

    return NextResponse.json({ agents: result, total: totalAgents });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}