import React from "react";

export function AssetStatusBadge({ status }: { status: string }) {
  let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";
  const s = (status || "").toLowerCase();
  
  if (s.includes("active") || s.includes("assigned") || s.includes("in service")) {
    badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
    dotColor = "bg-blue-500";
  } else if (s.includes("available") || s.includes("new") || s.includes("stock") || s.includes("spare") || s.includes("standalone")) {
    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotColor = "bg-emerald-500";
  } else if (s.includes("maintenance") || s.includes("repair")) {
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    dotColor = "bg-amber-500";
  } else if (s.includes("damage") || s.includes("broken")) {
    badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
    dotColor = "bg-rose-500";
  } else if (s.includes("retired") || s.includes("inactive")) {
    badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    dotColor = "bg-slate-400";
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass} shadow-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status || "Unknown"}
    </span>
  );
}
