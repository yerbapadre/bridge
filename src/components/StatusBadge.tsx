import type { Task } from "@/types";

interface StatusBadgeProps {
  status: Task["status"];
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const statusClass =
    status === "blocked" ? "bg-status-blocked" :
    status === "ready" ? "bg-status-ready" :
    status === "in_progress" ? "bg-status-in-progress" :
    "bg-status-done";

  const label =
    status === "in_progress" ? "in progress" : status;

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${statusClass} text-white ${className}`}>
      {label}
    </span>
  );
}
