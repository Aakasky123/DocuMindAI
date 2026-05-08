import { Activity } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import { getEvaluationRuns } from "../api/client.js";
import Alert from "../components/Alert.jsx";
import MetricCard from "../components/MetricCard.jsx";

export default function Evaluation({ runs = [], onRefresh }) {
  const [localRuns, setLocalRuns] = useState(runs);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setLocalRuns(runs);
  }, [runs]);

  useEffect(() => {
    getEvaluationRuns()
      .then((data) => {
        setLocalRuns(data);
        setNotice(data.length ? "" : "No evaluation runs yet.");
      })
      .catch(() => setNotice("No evaluation runs yet."));
  }, []);

  const latest = localRuns[0];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white">
            <Activity size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Evaluation coming next</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              This page is ready to display RAGAS and MLflow-backed metrics as evaluation runs are added. Existing backend runs are loaded when available.
            </p>
          </div>
        </div>
      </div>

      <Alert message={notice} tone="info" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faithfulness" value={formatMetric(latest?.faithfulness)} detail="Grounding quality" accent="green" />
        <MetricCard label="Answer Relevancy" value={formatMetric(latest?.answer_relevancy)} detail="Response usefulness" accent="blue" />
        <MetricCard label="Context Precision" value={formatMetric(latest?.context_precision)} detail="Retrieved evidence quality" accent="yellow" />
        <MetricCard label="Context Recall" value={formatMetric(latest?.context_recall)} detail="Evidence coverage" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Latest runs</h2>
            <p className="mt-1 text-sm text-slate-500">Persisted evaluation summaries from the API.</p>
          </div>
          <button className="secondary-button" onClick={onRefresh}>Refresh</button>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {localRuns.map((run) => (
            <div className="grid gap-3 border-b border-slate-200 bg-white p-4 text-sm last:border-b-0 md:grid-cols-[1fr_repeat(5,110px)]" key={run.id}>
              <span className="truncate font-semibold text-slate-950">{run.run_name || "Evaluation run"}</span>
              <span>{formatMetric(run.faithfulness)}</span>
              <span>{formatMetric(run.answer_relevancy)}</span>
              <span>{formatMetric(run.context_precision)}</span>
              <span>{formatMetric(run.context_recall)}</span>
              <span>{run.avg_latency_ms ?? "n/a"} ms</span>
            </div>
          ))}
          {!localRuns.length ? <p className="p-6 text-sm text-slate-500">No evaluation runs yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

function formatMetric(value) {
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}
