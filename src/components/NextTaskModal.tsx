import { useState } from "react";
import Modal from "./Modal";
import TaskListItem from "./TaskListItem";
import type { Task, Track } from "@/types";

interface NextTaskModalProps {
  tasks: Task[];
  tracks: Track[];
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
}

export default function NextTaskModal({
  tasks,
  tracks,
  onClose,
  onSelectTask,
}: NextTaskModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Get top task from each track: prefer in-progress, fallback to ready
  const topTasksPerTrack = tracks
    .map((track) => {
      const trackTasks = tasks.filter(
        (t) => t.track_id === track.id && !t.is_current_focus && (t.status === "in_progress" || t.status === "ready")
      );

      if (trackTasks.length === 0) return null;

      // Sort by status (in_progress first) then by position
      const sorted = trackTasks.sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (a.status !== "in_progress" && b.status === "in_progress") return 1;
        return a.position - b.position;
      });

      return sorted[0];
    })
    .filter((t): t is Task => t !== null);

  // Filter tasks based on search query
  const searchableTasks = tasks.filter(
    (t) => !t.is_current_focus && (t.status === "ready" || t.status === "in_progress")
  );

  const filteredTasks = searchQuery
    ? searchableTasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectTask = (taskId: string) => {
    onSelectTask(taskId);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} maxWidth="2xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-primary mb-2">Select Next Task</h2>
        <p className="text-sm text-secondary">
          Choose your next task to focus on
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full bg-input border border-input rounded px-3 py-2 text-sm text-primary"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto mb-4 max-h-96">
        {!searchQuery && topTasksPerTrack.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-tertiary mb-2">
              Suggested Tasks
            </h3>
            <div className="space-y-2">
              {topTasksPerTrack.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleSelectTask(task.id)}
                  className="w-full"
                >
                  <TaskListItem
                    task={task}
                    tracks={tracks}
                    onAction={handleSelectTask}
                    showStatusIndicator
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {searchQuery && (
          <div>
            <h3 className="text-sm font-semibold text-tertiary mb-2">
              Search Results ({filteredTasks.length})
            </h3>
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-tertiary text-center py-8">No tasks found</p>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    className="w-full"
                  >
                    <TaskListItem
                      task={task}
                      tracks={tracks}
                      onAction={handleSelectTask}
                      showStatusIndicator
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!searchQuery && topTasksPerTrack.length === 0 && (
          <p className="text-sm text-tertiary text-center py-8">
            No ready or in-progress tasks available. Use the search bar to find specific tasks.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
        >
          Skip for now
        </button>
      </div>
    </Modal>
  );
}
