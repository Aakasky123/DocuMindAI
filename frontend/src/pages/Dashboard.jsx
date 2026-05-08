import { ArrowRight, CheckCircle2, Database, FileText, MessageSquare, Search } from "lucide-react";
import React from "react";
import Alert from "../components/Alert.jsx";
import MetricCard from "../components/MetricCard.jsx";

export default function Dashboard({ documents = [], evaluationRuns = [], config, apiOnline, error }) {
  const processed = documents.filter((doc) => doc?.status === "completed").length;
  const failed = documents.filter((doc) => doc?.status === "failed").length;
  const latestRun = evaluationRuns[0];
  const averageLatency = latestRun?.avg_latency_ms ? `${latestRun.avg_latency_ms} ms` : "n/a";
  const latestProvider = config?.openai_configured ? "openai" : "fallback";
  const retrievalMode = config?.retrieval_mode || "hybrid";
  const pipeline = ["Upload", "Parse", "Chunk", "Embed", "Retrieve", "Generate", "Cite"];

  return (
    <section className="space-y-6">
      <Alert message={error} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Total documents" value={documents.length} detail={apiOnline ? "Synced with API" : "API unavailable"} accent="blue" />
        <MetricCard label="Processed" value={processed} detail="Ready for chat" accent="green" />
        <MetricCard label="Failed" value={failed} detail="Needs review" accent={failed ? "red" : "slate"} />
        <MetricCard label="Average latency" value={averageLatency} detail="Latest evaluation run" accent="yellow" />
        <MetricCard label="Latest provider" value={latestProvider} detail="Configured generator" />
        <MetricCard label="Retrieval mode" value={retrievalMode} detail="Default search path" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">System Pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">The complete document-to-answer flow used by this MVP.</p>
            </div>
            <Database className="text-slate-400" size={22} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {pipeline.map((step, index) => (
              <div className="flex items-center gap-3" key={step}>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">{step}</span>
                {index < pipeline.length - 1 ? <ArrowRight className="text-slate-300" size={18} /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Operational Snapshot</h2>
          <div className="mt-5 space-y-4">
            <Snapshot icon={FileText} label="Documents indexed" value={processed} />
            <Snapshot icon={Search} label="Retrieval strategy" value={retrievalMode} />
            <Snapshot icon={MessageSquare} label="Provider" value={latestProvider} />
            <Snapshot icon={CheckCircle2} label="API status" value={apiOnline ? "Online" : "Offline"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Snapshot({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="text-slate-500" size={18} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}
