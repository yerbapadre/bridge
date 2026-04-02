import { X } from "lucide-react";
import type { Task, Track, TerminalSession } from "@/types";
import { getTaskTitle, getTrackNameForTask, formatDateTime } from "@/lib/utils";

interface TerminalSessionCardProps {
  session: TerminalSession;
  tasks: Task[];
  tracks: Track[];
  onFocus: (session: TerminalSession) => void;
  onDelete: (sessionId: string) => void;
  variant?: "compact" | "full";
}

export default function TerminalSessionCard({
  session,
  tasks,
  tracks,
  onFocus,
  onDelete,
  variant = "full",
}: TerminalSessionCardProps) {
  if (variant === "compact") {
    return (
      <div className="bg-tertiary rounded p-2 border border-border-secondary hover:border-accent transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-primary truncate">
              {session.window_title || "Untitled"}
            </div>
            {session.working_dir && (
              <div className="text-xs text-tertiary truncate mt-0.5">
                {session.working_dir}
              </div>
            )}
          </div>
          <button
            onClick={() => onDelete(session.id)}
            className="text-xs text-error hover:text-red-700 p-1"
            title="Unlink session"
          >
            <X size={14} />
          </button>
        </div>
        <button
          onClick={() => onFocus(session)}
          className="mt-2 w-full text-xs px-2 py-1 bg-accent rounded text-white hover:bg-accent-hover"
        >
          Focus Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="bg-tertiary rounded-lg p-6 border border-border-primary hover:border-accent transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-primary truncate mb-1">
            {session.window_title || "Untitled Terminal"}
          </h3>
          <p className="text-sm text-tertiary">
            {getTaskTitle(tasks, session.task_id)}
          </p>
          <p className="text-xs text-quaternary">
            {getTrackNameForTask(tasks, tracks, session.task_id)}
          </p>
        </div>
        <button
          onClick={() => onDelete(session.id)}
          className="text-sm text-error hover:text-red-700 p-2"
          title="Unlink session"
        >
          <X size={16} />
        </button>
      </div>

      {session.working_dir && (
        <div className="mb-4 p-2 bg-secondary rounded">
          <p className="text-xs text-tertiary mb-1">Working Directory</p>
          <p className="text-xs font-mono text-primary truncate">
            {session.working_dir}
          </p>
        </div>
      )}

      <div className="mb-4 text-xs text-quaternary">
        Last focused: {formatDateTime(session.last_focused_at)}
      </div>

      <button
        onClick={() => onFocus(session)}
        className="w-full px-4 py-2 bg-accent rounded text-white hover:bg-accent-hover font-medium"
      >
        Focus Terminal
      </button>
    </div>
  );
}
