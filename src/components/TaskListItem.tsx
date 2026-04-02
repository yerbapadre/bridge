import { Star } from "lucide-react";
import type { Task, Track } from "@/types";
import { getTrackName, getTrackType } from "@/lib/utils";

interface TaskListItemProps {
  task: Task;
  tracks: Track[];
  onAction: (taskId: string) => void;
  actionLabel?: string;
  showStatusIndicator?: boolean;
}

export default function TaskListItem({
  task,
  tracks,
  onAction,
  actionLabel = "Switch to This",
  showStatusIndicator = false,
}: TaskListItemProps) {
  const isMainTrack = getTrackType(tracks, task.track_id) === "main";

  return (
    <div className="bg-task-card rounded-lg p-4 border border-task-card hover:border-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {showStatusIndicator ? (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-status-in-progress rounded-full"></div>
              <p className="text-base font-medium text-primary">
                {task.title}
              </p>
            </div>
          ) : (
            <p className="text-base font-medium text-primary mb-1">
              {task.title}
            </p>
          )}
          <p className="text-xs text-tertiary flex items-center gap-1">
            {getTrackName(tracks, task.track_id)}
            {isMainTrack && <Star size={12} className="text-star fill-star" />}
          </p>
        </div>
        <button
          onClick={() => onAction(task.id)}
          className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary text-sm font-medium whitespace-nowrap transition-colors"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
