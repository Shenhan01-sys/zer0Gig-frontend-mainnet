"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, ExternalLink, X, Check, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";

interface MilestoneItem {
  index: number;
  percentage: number;
  amountWei: bigint;
  status: number;
  outputCID: string;
  alignmentScore: number;
  retryCount: number;
  submittedAt: string | null;
  completedAt: string | null;
}

interface AgentActivity {
  phase: string;
  message: string;
  milestone_index: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface DeliverableData {
  jobId: number;
  jobTitle: string;
  jobDescription?: string;
  jobSkill?: string;
  jobCreatedAt?: string;
  clientAddress: string;
  agentName: string;
  agentId: number;
  milestoneIndex: number;
  milestoneDescription: string;
  outputCID?: string;
  outputUrl?: string;
  outputSummary: string;
  alignmentScore?: number;
  milestones: MilestoneItem[];
  activities: AgentActivity[];
}

const STATUS_ICON: Record<number, React.ReactNode> = {
  0: <Clock className="w-3.5 h-3.5 text-white/30" />,
  1: <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />,
  2: <Check className="w-3.5 h-3.5 text-emerald-400" />,
  3: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  4: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
};

const STATUS_LABEL: Record<number, string> = {
  0: "Pending", 1: "Submitted", 2: "Approved", 3: "Rejected", 4: "Retrying",
};

export default function DeliverableViewer({
  data,
  onClose,
}: {
  data: DeliverableData;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "process">("overview");

  const handleDownloadPDF = () => {
    generateDeliverablePDF(data);
  };

  const handleDownloadTXT = () => {
    const content = generateDeliverableText(data);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zer0Gig-deliverable-job-${data.jobId}-milestone-${data.milestoneIndex + 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-[#0d1525]/95 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 bg-[#050810]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#38bdf8] to-[#a855f7] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white text-[14px] font-semibold">Milestone Deliverable</h3>
            <p className="text-white/40 text-[11px]">
              Job #{data.jobId} · Milestone {data.milestoneIndex + 1}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white/70 text-[12px] hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={handleDownloadTXT}
            title="Export as plain text"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 text-[12px] hover:text-white/70 hover:bg-white/[0.06] transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            .txt
          </button>
          {data.outputCID && (
            <a
              href={`https://indexer-storage-turbo.0g.ai/download/${data.outputCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white/70 text-[12px] hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              0G
            </a>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {(["overview", "timeline", "process"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 text-[12px] font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-white border-b-2 border-[#38bdf8] bg-white/[0.03]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "timeline" && <TimelineTab milestones={data.milestones} />}
        {activeTab === "process" && <ProcessTab activities={data.activities} milestoneIndex={data.milestoneIndex} />}
      </div>
    </motion.div>
  );
}

function OverviewTab({ data }: { data: DeliverableData }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="space-y-5">
      {/* Brand */}
      <div className="text-center pb-4 border-b border-white/[0.06]">
        <p className="text-white text-[18px] font-bold tracking-tight">
          zer0<span className="text-[#38bdf8]">Gig</span>
        </p>
        <p className="text-white/40 text-[11px] mt-1">
          Turns AI Into Productive Economy Assets — starting from Indonesia
        </p>
      </div>

      {/* Job Context */}
      <div>
        <h4 className="text-white/50 text-[11px] uppercase tracking-wider font-medium mb-2">Job Context</h4>
        <div className="bg-[#050810]/60 rounded-xl border border-white/[0.06] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MetaItem label="Job ID" value={`#${data.jobId}`} />
            <MetaItem label="Job Title" value={data.jobTitle || "Untitled"} />
            <MetaItem label="Client" value={`${data.clientAddress.slice(0, 6)}…${data.clientAddress.slice(-4)}`} />
            <MetaItem label="Skill Required" value={data.jobSkill ? `${data.jobSkill.slice(0, 10)}…` : "General"} />
            <MetaItem label="AI Agent" value={`${data.agentName} (#${data.agentId})`} />
            <MetaItem label="Created" value={data.jobCreatedAt ? new Date(data.jobCreatedAt).toLocaleDateString() : "N/A"} />
          </div>
          {data.jobDescription && (
            <p className="text-white/60 text-[12px] leading-relaxed border-t border-white/[0.06] pt-3">
              {data.jobDescription}
            </p>
          )}
        </div>
      </div>

      {/* Current Milestone */}
      <div>
        <h4 className="text-white/50 text-[11px] uppercase tracking-wider font-medium mb-2">
          Milestone {data.milestoneIndex + 1} Deliverable
        </h4>
        <div className="bg-[#050810]/60 rounded-xl border border-white/[0.06] p-4">
          <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">
            {showFull ? data.outputSummary : truncate(data.outputSummary, 500)}
          </p>
          {data.outputSummary.length > 500 && (
            <button
              onClick={() => setShowFull(!showFull)}
              className="text-[#38bdf8] text-[12px] mt-2 hover:underline"
            >
              {showFull ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>

      {/* Quality */}
      {data.alignmentScore !== undefined && (
        <div className="grid grid-cols-2 gap-3">
          <MetaItem label="Alignment Score" value={`${(data.alignmentScore / 100).toFixed(2)}/100`} />
          <MetaItem label="Milestone" value={data.milestoneDescription} />
        </div>
      )}

      {/* Storage */}
      {data.outputCID && (
        <div>
          <h4 className="text-white/50 text-[11px] uppercase tracking-wider font-medium mb-2">On-Chain Output</h4>
          <a
            href={`https://indexer-storage-turbo.0g.ai/download/${data.outputCID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#050810]/60 border border-white/[0.06] text-[#38bdf8] text-[12px] hover:bg-white/[0.03] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="font-mono">{data.outputCID}</span>
            <span className="text-white/30 ml-auto">0G Storage</span>
          </a>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ milestones }: { milestones: MilestoneItem[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-white/50 text-[11px] uppercase tracking-wider font-medium">Milestone Timeline</h4>
      {milestones.length === 0 ? (
        <p className="text-white/30 text-[13px] text-center py-6">No milestones defined.</p>
      ) : (
        milestones.map((m) => (
          <div
            key={m.index}
            className={`rounded-xl border p-3 ${m.status === 2 ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/[0.06] bg-[#050810]/40"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {STATUS_ICON[m.status]}
                <span className="text-white text-[13px] font-medium">Milestone {m.index + 1}</span>
                <span className="text-white/30 text-[11px]">({m.percentage}%)</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                m.status === 2 ? "bg-emerald-500/10 text-emerald-400" :
                m.status === 1 ? "bg-yellow-500/10 text-yellow-400" :
                m.status === 3 ? "bg-red-500/10 text-red-400" :
                "bg-white/5 text-white/40"
              }`}>
                {STATUS_LABEL[m.status] || "Unknown"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-white/40">Budget: <span className="text-white/70">{formatOG(m.amountWei)}</span></span>
              <span className="text-white/40">Alignment: <span className="text-white/70">{(m.alignmentScore / 100).toFixed(2)}/100</span></span>
              <span className="text-white/40">Retries: <span className="text-white/70">{m.retryCount}/5</span></span>
              {m.outputCID && (
                <span className="text-white/40 truncate">CID: <span className="text-[#38bdf8] font-mono">{m.outputCID.slice(0, 16)}…</span></span>
              )}
            </div>
            {m.submittedAt && <p className="text-white/25 text-[10px] mt-1">Submitted: {m.submittedAt}</p>}
            {m.completedAt && <p className="text-white/25 text-[10px]">Completed: {m.completedAt}</p>}
          </div>
        ))
      )}
    </div>
  );
}

function ProcessTab({ activities, milestoneIndex }: { activities: AgentActivity[]; milestoneIndex: number }) {
  const relevant = activities.filter(
    a => a.milestone_index === milestoneIndex || a.milestone_index === null
  );

  return (
    <div className="space-y-3">
      <h4 className="text-white/50 text-[11px] uppercase tracking-wider font-medium">
        Agent Process Log — Milestone {milestoneIndex + 1}
      </h4>
      {relevant.length === 0 ? (
        <p className="text-white/30 text-[13px] text-center py-6">No process log available.</p>
      ) : (
        <div className="space-y-2">
          {relevant.map((a, i) => (
            <div key={i} className="flex gap-3 text-[12px]">
              <span className="text-white/25 font-mono shrink-0 w-[52px] text-right">
                {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="flex-1">
                <span className="text-[#38bdf8] font-medium">{a.phase}</span>
                <p className="text-white/50 mt-0.5">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#050810]/40 border border-white/[0.04] px-3 py-2">
      <p className="text-white/30 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-white text-[13px] font-medium truncate">{value}</p>
    </div>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function formatOG(wei: bigint) {
  try {
    const og = Number(wei) / 1e18;
    return `${og.toFixed(4)} OG`;
  } catch {
    return "—";
  }
}

function generateDeliverablePDF(data: DeliverableData): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const footerHeight = 30;
  let y = margin;

  const checkPageBreak = (neededSpace: number = 60) => {
    if (y + neededSpace > pageHeight - footerHeight) {
      doc.addPage();
      y = margin;
    }
  };

  const addText = (text: string, x: number, fontSize = 10, color: [number, number, number] = [30, 30, 30], lineHeight = 14) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth - (x - margin));
    const blockHeight = lines.length * lineHeight;
    checkPageBreak(blockHeight + 10);
    doc.text(lines, x, y);
    y += blockHeight;
  };

  const addSectionTitle = (title: string) => {
    checkPageBreak(50);
    doc.setFont("helvetica", "bold");
    addText(title, margin, 12, [16, 24, 40], 16);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y - 4, pageWidth - margin, y - 4);
    y += 8;
    doc.setFont("helvetica", "normal");
  };

  const addKeyValue = (label: string, value: string) => {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    addText(`${label}:`, margin, 10, [80, 80, 80]);
    doc.setFont("helvetica", "normal");
    addText(value, margin + 12, 10, [30, 30, 30]);
    y += 4;
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  addText("zer0Gig", margin, 22, [16, 24, 40], 26);
  doc.setFont("helvetica", "italic");
  addText("Turns AI Into Productive Economy Assets", margin, 10, [100, 100, 100], 14);
  doc.setFont("helvetica", "normal");
  y += 16;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // ── Job Context ───────────────────────────────────────────────────────────
  addSectionTitle("Job Context");
  addKeyValue("Job ID", `#${data.jobId}`);
  addKeyValue("Title", data.jobTitle || "Untitled");
  if (data.jobDescription) {
    addKeyValue("Description", data.jobDescription);
  }
  addKeyValue("Skill Required", data.jobSkill || "General");
  addKeyValue("Client", data.clientAddress);
  addKeyValue("Created", data.jobCreatedAt ? new Date(data.jobCreatedAt).toLocaleString() : "N/A");
  y += 8;

  // ── AI Agent ──────────────────────────────────────────────────────────────
  addSectionTitle("AI Agent");
  addKeyValue("Name", data.agentName);
  addKeyValue("Agent ID", `#${data.agentId}`);
  y += 8;

  // ── Milestone Timeline ────────────────────────────────────────────────────
  addSectionTitle("Milestone Timeline");
  data.milestones.forEach((m) => {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    addText(`Milestone ${m.index + 1} (${m.percentage}%) — ${STATUS_LABEL[m.status] || "Unknown"}`, margin, 10, [16, 24, 40]);
    doc.setFont("helvetica", "normal");
    addText(`Budget: ${formatOG(m.amountWei)}  ·  Alignment: ${(m.alignmentScore / 100).toFixed(2)}/100  ·  Retries: ${m.retryCount}/5`, margin + 8, 9, [80, 80, 80], 12);
    if (m.outputCID) {
      addText(`Output CID: ${m.outputCID}`, margin + 8, 9, [80, 80, 80], 12);
    }
    if (m.submittedAt) {
      addText(`Submitted: ${m.submittedAt}`, margin + 8, 9, [120, 120, 120], 12);
    }
    if (m.completedAt) {
      addText(`Completed: ${m.completedAt}`, margin + 8, 9, [120, 120, 120], 12);
    }
    y += 10;
  });
  y += 8;

  // ── Focus Milestone ───────────────────────────────────────────────────────
  addSectionTitle(`Focus: Milestone ${data.milestoneIndex + 1}`);
  addKeyValue("Description", data.milestoneDescription);
  if (data.alignmentScore !== undefined) {
    addKeyValue("Alignment Score", `${(data.alignmentScore / 100).toFixed(2)}/100`);
  }
  y += 8;

  // ── Deliverable Summary ───────────────────────────────────────────────────
  addSectionTitle("Deliverable Summary");
  doc.setFont("helvetica", "normal");
  addText(data.outputSummary, margin, 10, [30, 30, 30], 14);
  y += 8;

  // ── Agent Process Log ─────────────────────────────────────────────────────
  addSectionTitle("Agent Process Log");
  const relevantActivities = data.activities.filter(
    (a) => a.milestone_index === data.milestoneIndex || a.milestone_index === null
  );
  if (relevantActivities.length === 0) {
    addText("No process log available.", margin, 10, [120, 120, 120]);
  } else {
    relevantActivities.forEach((a) => {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = margin;
      }
      const time = new Date(a.created_at).toLocaleString();
      doc.setFont("helvetica", "bold");
      addText(`[${time}] ${a.phase}`, margin, 9, [16, 24, 40], 12);
      doc.setFont("helvetica", "normal");
      addText(a.message, margin + 12, 9, [60, 60, 60], 12);
      y += 4;
    });
  }
  y += 8;

  // ── On-Chain Output ───────────────────────────────────────────────────────
  addSectionTitle("On-Chain Output");
  if (data.outputCID) {
    addKeyValue("0G Storage CID", data.outputCID);
    addKeyValue("Download URL", `https://indexer-storage-turbo.0g.ai/download/${data.outputCID}`);
  } else {
    addText("No on-chain file reference available.", margin, 10, [120, 120, 120]);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Generated by zer0Gig AI Agent Economy on 0G Aristotle Mainnet  ·  Page ${i} of ${totalPages}`,
      margin,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text("https://chainscan.0g.ai", pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`zer0Gig-deliverable-job-${data.jobId}-milestone-${data.milestoneIndex + 1}.pdf`);
}

function generateDeliverableText(data: DeliverableData): string {
  const milestonesText = data.milestones.map((m) => {
    return `  Milestone ${m.index + 1} (${m.percentage}%)
    Status:     ${STATUS_LABEL[m.status] || "Unknown"}
    Budget:     ${formatOG(m.amountWei)}
    Alignment:  ${(m.alignmentScore / 100).toFixed(2)}/100
    Retries:    ${m.retryCount}/5
    Output CID: ${m.outputCID || "N/A"}
    Submitted:  ${m.submittedAt || "N/A"}
    Completed:  ${m.completedAt || "N/A"}`;
  }).join("\n\n");

  const activitiesText = data.activities
    .filter(a => a.milestone_index === data.milestoneIndex || a.milestone_index === null)
    .map(a => `  [${new Date(a.created_at).toLocaleString()}] ${a.phase}: ${a.message}`)
    .join("\n");

  return `═══════════════════════════════════════════════════════════════
  zer0Gig — AI Agent Deliverable Report
  Turns AI Into Productive Economy Assets — starting from Indonesia
═══════════════════════════════════════════════════════════════

JOB CONTEXT
───────────────────────────────────────────────────────────────
  Job ID:       #${data.jobId}
  Title:        ${data.jobTitle || "Untitled"}
  Description:  ${data.jobDescription || "N/A"}
  Skill:        ${data.jobSkill || "General"}
  Client:       ${data.clientAddress}
  Created:      ${data.jobCreatedAt ? new Date(data.jobCreatedAt).toLocaleString() : "N/A"}

AI AGENT
───────────────────────────────────────────────────────────────
  Name:         ${data.agentName}
  Agent ID:     #${data.agentId}

MILESTONE TIMELINE (ALL MILESTONES)
───────────────────────────────────────────────────────────────
${milestonesText}

FOCUS: MILESTONE ${data.milestoneIndex + 1}
───────────────────────────────────────────────────────────────
  Description:  ${data.milestoneDescription}
  Alignment:    ${data.alignmentScore !== undefined ? (data.alignmentScore / 100).toFixed(2) : "N/A"}/100

DELIVERABLE SUMMARY
───────────────────────────────────────────────────────────────
${data.outputSummary}

AGENT PROCESS LOG
───────────────────────────────────────────────────────────────
${activitiesText || "  No process log available."}

ON-CHAIN OUTPUT
───────────────────────────────────────────────────────────────
${data.outputCID ? `  0G Storage CID: ${data.outputCID}
  https://indexer-storage-turbo.0g.ai/download/${data.outputCID}` : "  No on-chain file reference"}
${data.outputUrl ? `  External URL: ${data.outputUrl}` : ""}

───────────────────────────────────────────────────────────────
Generated by zer0Gig AI Agent Economy on 0G Aristotle Mainnet
Contract: ${data.clientAddress}
https://chainscan.0g.ai
───────────────────────────────────────────────────────────────
`;
}
