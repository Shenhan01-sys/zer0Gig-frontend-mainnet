"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, MessageSquare, Activity, ChevronDown, ChevronUp,
  Copy, Check, Clock, Users, Briefcase, RefreshCw, AlertCircle,
  Hash, Inbox,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityEntry {
  job_id: number;
  phase: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
  milestone_index: number | null;
}

interface MessageEntry {
  id: number;
  job_id: number;
  sender: "user" | "agent";
  message: string;
  msg_type: string;
  created_at: string;
}

interface ProgressiveJob {
  jobId: number;
  title: string | null;
  description: string;
  clientAddress: string;
  createdAt: string;
  activity: ActivityEntry[];
  messages: MessageEntry[];
  outputHash: string | null;
}

interface SubscriptionRecord {
  id: string;
  clientAddress: string;
  taskDescription: string;
  intervalSeconds: number;
  checkInRate: string;
  alertRate: string;
  status: string;
  createdAt: string;
  budgetOg: string;
  checkpointHash: string | null;
}

interface StorageData {
  isOwner: boolean;
  progressive: ProgressiveJob[];
  subscriptions: SubscriptionRecord[];
}

interface Props {
  agentId: number;
  viewerAddress: string | undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  if (!addr) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtInterval(secs: number) {
  if (!secs) return "—";
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h`;
  return `${Math.round(secs / 86400)}d`;
}

const PHASE_COLOR: Record<string, string> = {
  downloading_brief: "text-[#38bdf8]",
  processing:        "text-[#a855f7]",
  uploading:         "text-amber-400",
  submitting:        "text-amber-400",
  alignment_attestation: "text-indigo-400",
  completed:         "text-emerald-400",
  error:             "text-red-400",
};

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-amber-400/10 text-amber-400 border-amber-400/20",
  approved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  rejected: "bg-red-400/10 text-red-400 border-red-400/20",
  active:   "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20",
};

// ─── CopyHash ────────────────────────────────────────────────────────────────

function CopyHash({ hash, label = "Hash" }: { hash: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#050810]/80 border border-white/[0.07] px-3 py-2">
      <Hash className="w-3 h-3 text-white/30 shrink-0" />
      <span className="text-[10px] font-mono text-white/40 truncate flex-1">{hash}</span>
      <button
        onClick={copy}
        className="text-white/30 hover:text-white/60 transition-colors shrink-0"
        title={`Copy ${label}`}
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ─── MessagesThread ──────────────────────────────────────────────────────────

function MessagesThread({ messages }: { messages: MessageEntry[] }) {
  if (messages.length === 0) return (
    <p className="text-[11px] text-white/25 italic px-1">No messages recorded.</p>
  );
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex flex-col gap-0.5 ${m.sender === "user" ? "items-end" : "items-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
              m.sender === "user"
                ? "bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]"
                : "bg-white/[0.04] border border-white/[0.07] text-white/70"
            }`}
          >
            {m.message}
          </div>
          <span className="text-[9px] text-white/20 px-1">{fmtDate(m.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ActivityTimeline ────────────────────────────────────────────────────────

function ActivityTimeline({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0) return (
    <p className="text-[11px] text-white/25 italic px-1">No activity recorded.</p>
  );
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {activity.map((a, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`text-[9px] font-mono uppercase mt-0.5 shrink-0 w-24 truncate ${PHASE_COLOR[a.phase] ?? "text-white/40"}`}>
            {a.phase.replace(/_/g, " ")}
          </span>
          <span className="text-[11px] text-white/50 flex-1 leading-snug">{a.message}</span>
          <span className="text-[9px] text-white/20 shrink-0">{fmtDate(a.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── JobCard ─────────────────────────────────────────────────────────────────

function JobCard({ job, showClient }: { job: ProgressiveJob; showClient: boolean }) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState<"messages" | "activity">("messages");

  const lastActivity = job.activity.at(-1);
  const phase        = lastActivity?.phase ?? "—";
  const phaseColor   = PHASE_COLOR[phase] ?? "text-white/40";

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#050810]/60 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Briefcase className="w-3.5 h-3.5 text-white/25 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-white/70 truncate">
              {job.title || `Job #${job.jobId}`}
            </span>
            <span className={`text-[9px] font-mono uppercase shrink-0 ${phaseColor}`}>{phase.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {showClient && (
              <span className="text-[10px] text-white/30 font-mono">{shortAddr(job.clientAddress)}</span>
            )}
            <span className="text-[10px] text-white/25">{fmtDate(job.createdAt)}</span>
            <span className="text-[10px] text-white/25">{job.messages.length} msg · {job.activity.length} events</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05]">
              {/* Description */}
              {job.description && (
                <p className="text-[11px] text-white/40 leading-relaxed mt-3">{job.description}</p>
              )}

              {/* Sub-tab toggle */}
              <div className="flex gap-1 mt-2">
                {(["messages", "activity"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider transition-all ${
                      view === v
                        ? "bg-white/8 text-white/70 border border-white/10"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {v === "messages" ? <MessageSquare className="w-3 h-3 inline mr-1" /> : <Activity className="w-3 h-3 inline mr-1" />}
                    {v}
                  </button>
                ))}
              </div>

              {view === "messages"
                ? <MessagesThread messages={job.messages} />
                : <ActivityTimeline activity={job.activity} />
              }

              {/* Output hash */}
              {job.outputHash && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">0G Storage — Output</p>
                  <CopyHash hash={job.outputHash} label="output root hash" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SubscriptionCard ────────────────────────────────────────────────────────

function SubscriptionCard({ sub, showClient }: { sub: SubscriptionRecord; showClient: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#050810]/60 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5 text-[#a855f7]/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-white/70 truncate">
              {sub.taskDescription.slice(0, 60)}{sub.taskDescription.length > 60 ? "…" : ""}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider shrink-0 ${STATUS_STYLE[sub.status] ?? "bg-white/5 text-white/40 border-white/10"}`}>
              {sub.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {showClient && (
              <span className="text-[10px] text-white/30 font-mono">{shortAddr(sub.clientAddress)}</span>
            )}
            <span className="text-[10px] text-white/25">every {fmtInterval(sub.intervalSeconds)}</span>
            <span className="text-[10px] text-white/25">{fmtDate(sub.createdAt)}</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
              {/* Task full description */}
              <p className="text-[11px] text-white/50 leading-relaxed">{sub.taskDescription}</p>

              {/* Rate grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Check-in rate", value: `${sub.checkInRate} OG` },
                  { label: "Alert rate",    value: `${sub.alertRate} OG` },
                  { label: "Budget",        value: `${sub.budgetOg ?? "—"} OG` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-[#050810]/80 border border-white/[0.06] px-3 py-2">
                    <p className="text-[9px] text-white/30 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-[12px] font-medium text-white/60">{value}</p>
                  </div>
                ))}
              </div>

              {/* Client address (full, for owner) */}
              {showClient && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30">Client:</span>
                  <span className="text-[10px] font-mono text-white/40">{sub.clientAddress}</span>
                </div>
              )}

              {/* Checkpoint hash */}
              {sub.checkpointHash && (
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">0G Storage — Checkpoint</p>
                  <CopyHash hash={sub.checkpointHash} label="checkpoint root hash" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function AgentStoragePanel({ agentId, viewerAddress }: Props) {
  const [data, setData]       = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [tab, setTab]         = useState<"jobs" | "subscriptions">("jobs");

  useEffect(() => {
    if (!agentId || !viewerAddress) return;
    setLoading(true);
    setError(null);
    fetch(`/api/agent-storage?agentId=${agentId}&viewerAddress=${viewerAddress}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [agentId, viewerAddress]);

  const showClient = data?.isOwner ?? false;
  const jobs = data?.progressive ?? [];
  const subs = data?.subscriptions ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-[#0d1525]/90 overflow-hidden"
    >
      {/* Panel header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-3.5 h-3.5 text-[#38bdf8]/70" />
          <h2 className="text-[13px] font-medium text-white/70 uppercase tracking-wider">
            {data?.isOwner ? "Agent Storage — All Clients" : "My Activity with this Agent"}
          </h2>
        </div>
        <p className="text-[11px] text-white/30 pl-5">
          {data?.isOwner
            ? "All job outputs, conversations, and subscription checkpoints stored by this agent"
            : "Your jobs, conversations, and subscription data with this agent"}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/5">
        {([
          { id: "jobs" as const,          label: "Progressive Jobs", icon: <Briefcase className="w-3 h-3" />,  count: jobs.length },
          { id: "subscriptions" as const, label: "Subscriptions",     icon: <RefreshCw className="w-3 h-3" />, count: subs.length },
        ]).map(({ id, label, icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-[12px] transition-colors relative ${
              tab === id ? "text-white/80" : "text-white/30 hover:text-white/50"
            }`}
          >
            {icon}
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              tab === id ? "bg-white/10 text-white/60" : "bg-white/[0.04] text-white/25"
            }`}>
              {count}
            </span>
            {tab === id && (
              <motion.div
                layoutId="storage-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#38bdf8]/60"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="p-5">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="w-4 h-4 border-2 border-[#38bdf8]/40 border-t-[#38bdf8] rounded-full animate-spin" />
            <span className="text-[12px] text-white/30">Loading storage data…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/8 border border-red-500/15 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {/* No wallet connected */}
        {!viewerAddress && !loading && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Inbox className="w-8 h-8 text-white/15" />
            <p className="text-[12px] text-white/30">Connect your wallet to view storage data.</p>
          </div>
        )}

        {/* Jobs tab */}
        {!loading && !error && data && tab === "jobs" && (
          <div className="space-y-2">
            {showClient && jobs.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="w-3 h-3 text-white/25" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  {new Set(jobs.map(j => j.clientAddress)).size} unique client{new Set(jobs.map(j => j.clientAddress)).size !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Briefcase className="w-7 h-7 text-white/10" />
                <p className="text-[12px] text-white/25">No progressive jobs found.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <JobCard key={job.jobId} job={job} showClient={showClient} />
              ))
            )}
          </div>
        )}

        {/* Subscriptions tab */}
        {!loading && !error && data && tab === "subscriptions" && (
          <div className="space-y-2">
            {showClient && subs.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="w-3 h-3 text-white/25" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  {new Set(subs.map(s => s.clientAddress)).size} unique client{new Set(subs.map(s => s.clientAddress)).size !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {subs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <RefreshCw className="w-7 h-7 text-white/10" />
                <p className="text-[12px] text-white/25">No subscriptions found.</p>
              </div>
            ) : (
              subs.map((sub) => (
                <SubscriptionCard key={sub.id} sub={sub} showClient={showClient} />
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
