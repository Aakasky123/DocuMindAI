import React from "react";

export default function MetricCard({ label, value, detail, accent = "slate" }) {
  const accents = {
    slate: "from-slate-50 to-white border-slate-200",
    green: "from-emerald-50 to-white border-emerald-200",
    yellow: "from-amber-50 to-white border-amber-200",
    red: "from-rose-50 to-white border-rose-200",
    blue: "from-sky-50 to-white border-sky-200"
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${accents[accent] || accents.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 truncate text-3xl font-semibold tracking-tight text-slate-950">{value ?? "n/a"}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}
