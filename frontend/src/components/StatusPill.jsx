import React from "react";

export default function StatusPill({ status = "unknown" }) {
  const normalized = String(status || "unknown").toLowerCase();
  const styles = {
    completed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    processing: "bg-amber-100 text-amber-800 ring-amber-200",
    queued: "bg-amber-100 text-amber-800 ring-amber-200",
    failed: "bg-rose-100 text-rose-800 ring-rose-200",
    online: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    offline: "bg-rose-100 text-rose-800 ring-rose-200"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[normalized] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {normalized}
    </span>
  );
}
