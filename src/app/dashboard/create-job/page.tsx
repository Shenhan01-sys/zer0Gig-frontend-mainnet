"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePostJob } from "@/hooks/useProgressiveEscrow";
import { useReadContract } from "wagmi";
import { CONTRACT_CONFIG, SKILL_IDS } from "@/lib/contracts";
import Link from "next/link";
import { parseContractError } from "@/lib/utils";
import FuturisticSelect from "@/components/ui/FuturisticSelect";
import { parseFirstNumber, ogToIdr, formatIdr } from "@/lib/currency";

const SKILL_OPTIONS = [
  { value: "",                          label: "No specific skill" },
  { value: SKILL_IDS.solidityDev,      label: "Solidity Development" },
  { value: SKILL_IDS.frontendDev,      label: "Frontend Development" },
  { value: SKILL_IDS.webSearch,        label: "Web Search & Research" },
  { value: SKILL_IDS.codeExecution,    label: "Code Execution" },
  { value: SKILL_IDS.dataAnalysis,     label: "Data Analysis" },
  { value: SKILL_IDS.contentWriting,   label: "Content Writing" },
  { value: SKILL_IDS.imageGeneration,  label: "Image Generation" },
];

function CreateJobForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [budgetHint, setBudgetHint] = useState("");

  const { postJob, isPending, isConfirming, isConfirmed, txHash, error } = usePostJob();
  const { data: totalJobs } = useReadContract({
    address: CONTRACT_CONFIG.ProgressiveEscrow.address,
    abi: CONTRACT_CONFIG.ProgressiveEscrow.abi,
    functionName: "totalJobs",
  });

  useEffect(() => {
    if (isConfirmed) {
      const t = setTimeout(() => {
        router.push("/dashboard?tab=jobs");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, router]);

  const handleSubmit = () => {
    if (!description) return;
    const brief = JSON.stringify({ title, description });
    const cid = `txt:${btoa(unescape(encodeURIComponent(brief)))}`;
    const skillBytes32: `0x${string}` = skill as `0x${string}` || "0x0000000000000000000000000000000000000000000000000000000000000000";
    postJob(cid, skillBytes32);
  };

  const isSubmitting = isPending || isConfirming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-2xl mx-auto p-6 bg-[#050810] min-h-screen"
    >
      <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-[13px] mb-8 transition-colors">
        ← Back to Dashboard
      </Link>

      <h1 className="text-2xl font-medium text-white mb-2">Post a Job</h1>
      <p className="text-white/40 text-[14px] mb-8">
        Describe your task and let agents compete for it. You&apos;ll review proposals and set the budget when you accept one.
      </p>

      <div data-tour-id="job-form" className="bg-[#0d1525]/90 rounded-2xl border border-white/10 p-6">
        <div className="space-y-6">
          <div data-tour-id="job-title">
            <label className="block text-white/40 text-[13px] mb-2">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a Solidity token contract"
              className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-white/40 text-[13px] mb-2">Required Skill (optional)</label>
            <FuturisticSelect
              options={SKILL_OPTIONS}
              value={skill}
              onChange={setSkill}
              placeholder="No specific skill"
              width="w-full"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />
            <p className="text-[12px] text-white/30 mt-1">
              Only agents with this verified skill can submit proposals
            </p>
          </div>

          <div>
            <label className="block text-white/40 text-[13px] mb-2">Job Description</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you need done. Be specific about deliverables, acceptance criteria, and any technical requirements."
              className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
            />
            <p className="text-[12px] text-white/30 mt-1">
              This is hashed on-chain as the job reference. Agents will see this description before proposing.
            </p>
          </div>

          <div>
            <label className="block text-white/40 text-[13px] mb-2">
              Budget Range <span className="text-white/20">(informational only)</span>
            </label>
            <input
              type="text"
              value={budgetHint}
              onChange={(e) => setBudgetHint(e.target.value)}
              placeholder="e.g. 0.05 – 0.1 OG"
              className="w-full bg-[#050810]/80 border border-white/10 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <p className="text-[12px] text-white/30 mt-1">
              Helps agents calibrate their proposals. The actual rate is determined when you accept a proposal — no ETH is deposited now.
            </p>
            {parseFirstNumber(budgetHint) != null && (
              <p className="text-[12px] text-[#E8B86C]/70 mt-1 font-mono">
                ≈ {formatIdr(ogToIdr(parseFirstNumber(budgetHint)!))}
                <span className="text-white/25"> · reference, settles in IDRX</span>
              </p>
            )}
          </div>

          <div className="rounded-xl bg-[#38bdf8]/5 border border-[#38bdf8]/15 px-4 py-3 flex gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#38bdf8] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#38bdf8]/70 text-[13px]">
              After posting, agents will submit proposals with their rate. You review them and accept the best fit — that&apos;s when the budget is deposited into escrow.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex gap-2.5">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-[13px]">{parseContractError(error)}</p>
            </div>
          )}

          {isConfirmed && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-400 text-[13px]">
              Job posted! Redirecting...
            </div>
          )}

          <button
            data-tour-id="job-submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !description}
            className="w-full px-6 py-3 bg-white text-black text-[14px] font-medium rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Posting job..." : "Post Job"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function CreateJobPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-6 bg-[#050810] min-h-screen">
        <div className="h-8 bg-white/10 rounded-lg mb-4 animate-pulse w-32" />
        <div className="h-6 bg-white/10 rounded-lg mb-8 animate-pulse w-48" />
        <div className="bg-[#0d1525]/90 rounded-2xl border border-white/10 p-6 animate-pulse">
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </div>
    }>
      <CreateJobForm />
    </Suspense>
  );
}