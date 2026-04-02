import { useState } from "react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import type { Task, Track, TaskDependency } from "@/types";
import { getTrackName } from "@/lib/utils";

interface BlockTaskModalProps {
  taskId: string;
  tasks: Task[];
  tracks: Track[];
  dependencies: TaskDependency[];
  onClose: () => void;
  onAddDependency: (taskId: string, blocksTaskId: string) => void;
}

export default function BlockTaskModal({
  taskId,
  tasks,
  tracks,
  dependencies,
  onClose,
  onAddDependency,
}: BlockTaskModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const sameTrackTasks = tasks.filter(
    (t) => t.track_id === task.track_id && t.id !== taskId && t.status !== "done"
  );

  const allOtherTasks = tasks.filter((t) => t.id !== taskId && t.status !== "done");

  const existingBlockers = dependencies
    .filter((d) => d.blocks_task_id === taskId)
    .map((d) => d.task_id);

  const filteredTasks = searchQuery
    ? allOtherTasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sameTrackTasks;

  const handleSelectTask = async (blockerTaskId: string) => {
    await onAddDependency(blockerTaskId, taskId);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} maxWidth="2xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-primary mb-2">Add Blocking Task</h2>
        <p className="text-sm text-secondary">
          Select a task that blocks: <span className="font-medium">{task.title}</span>
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all tasks..."
          className="w-full bg-input border border-input rounded px-3 py-2 text-sm text-primary"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto mb-4">
        {!searchQuery && sameTrackTasks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-tertiary mb-2">
              Tasks in {getTrackName(tracks, task.track_id)}
            </h3>
            <div className="space-y-2">
              {sameTrackTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTask(t.id)}
                  disabled={existingBlockers.includes(t.id)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    existingBlockers.includes(t.id)
                      ? "bg-button-secondary border-sidebar text-tertiary cursor-not-allowed"
                      : "bg-task-card border-border-primary hover:border-accent hover:bg-button-secondary-hover"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <span className="text-sm font-medium text-primary">{t.title}</span>
                    {existingBlockers.includes(t.id) && (
                      <span className="ml-auto text-xs text-tertiary">Already blocking</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchQuery && (
          <div>
            <h3 className="text-sm font-semibold text-tertiary mb-2">Search Results</h3>
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-tertiary text-center py-8">No tasks found</p>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t.id)}
                    disabled={existingBlockers.includes(t.id)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      existingBlockers.includes(t.id)
                        ? "bg-button-secondary border-sidebar text-tertiary cursor-not-allowed"
                        : "bg-task-card border-border-primary hover:border-accent hover:bg-button-secondary-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={t.status} />
                      <span className="text-sm font-medium text-primary">{t.title}</span>
                      {existingBlockers.includes(t.id) && (
                        <span className="ml-auto text-xs text-tertiary">Already blocking</span>
                      )}
                    </div>
                    <p className="text-xs text-tertiary">{getTrackName(tracks, t.track_id)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!searchQuery && sameTrackTasks.length === 0 && (
          <p className="text-sm text-tertiary text-center py-8">
            No other tasks in this track. Use the search bar to find tasks from other tracks.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
