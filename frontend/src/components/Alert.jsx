import { AlertCircle } from "lucide-react";
import React from "react";

export default function Alert({ message, tone = "error" }) {
  if (!message) return null;
  const styles = tone === "info" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <AlertCircle className="mt-0.5 shrink-0" size={16} />
      <p>{message}</p>
    </div>
  );
}
