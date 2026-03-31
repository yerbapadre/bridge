import { useState } from "react";
import { Filter } from "lucide-react";
import type { Track, Task } from "@/types";
import { getStatusBorderColor } from "@/lib/theme";
import TrackColumn from "@/views/board/TrackColumn";

interface BoardViewProps {
  tracks: Track[];
  tasks: Task[];
  mainTrack: Track | undefined;
  sideTracks: Track[];
  getTasksForTrack: (trackId: string) => Task[];
  getSubtasks: (parentId: string) => Task[];
  hasSubtasks: (taskId: string) => boolean;
  isTrackComplete: (trackId: string) => boolean;
  onCreateTrack: (name: string) => Promise<void>;
  onDeleteTrack: (id: string) => Promise<void>;
  onReorderTracks: (trackId: string, newPosition: number) => Promise<void>;
  onCreateTask: (trackId: string, title: string, parentTaskId: string | null) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onReorderTasks: (taskId: string, newPosition: number) => Promise<void>;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"]) => Promise<void>;
  onOpenBlockModal: (taskId: string) => void;
  onOpenLinkTerminalModal: (taskId: string) => void;
}

export default function BoardView({
  tracks,
  tasks,
  mainTrack,
  sideTracks,
  getTasksForTrack,
  getSubtasks,
  hasSubtasks,
  isTrackComplete,
  onCreateTrack,
  onDeleteTrack,
  onReorderTracks,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onReorderTasks,
  advanceTaskStatus,
  onOpenBlockModal,
  onOpenLinkTerminalModal,
}: BoardViewProps) {
  const [newTrackName, setNewTrackName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const handleCreateTrack = async () => {
    if (!newTrackName.trim()) return;
    await onCreateTrack(newTrackName);
    setNewTrackName("");
  };

  const handleCreateTask = async (trackId: string, parentTaskId: string | null = null) => {
    if (!newTaskTitle.trim()) return;
    await onCreateTask(trackId, newTaskTitle, parentTaskId);
    setNewTaskTitle("");
    setSelectedTrackId(null);
    setSelectedParentTaskId(null);
  };

  const toggleTaskCollapsed = (taskId: string) => {
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleTrackDragStart = (trackId: string) => setDraggedTrackId(trackId);
  const handleTrackDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTrackId(trackId);
  };
  const handleTrackDragLeave = () => setDragOverTrackId(null);
  const handleTrackDrop = async (e: React.DragEvent, targetTrackId: string) => {
    e.preventDefault();
    if (!draggedTrackId) return;

    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    if (!targetTrack) return;

    await onReorderTracks(draggedTrackId, targetTrack.position);
    setDraggedTrackId(null);
    setDragOverTrackId(null);
  };
  const handleTrackDragEnd = () => {
    setDraggedTrackId(null);
    setDragOverTrackId(null);
  };

  const handleTaskDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const handleTaskDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const draggedTask = tasks.find((t) => t.id === draggedTaskId);
    const targetTask = tasks.find((t) => t.id === targetTaskId);

    if (!draggedTask || !targetTask) return;
    if (draggedTask.track_id !== targetTask.track_id) return;
    if (draggedTask.parent_task_id !== targetTask.parent_task_id) return;

    setDragOverTaskId(targetTaskId);
  };
  const handleTaskDragLeave = () => setDragOverTaskId(null);
  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTaskId) return;

    const draggedTask = tasks.find((t) => t.id === draggedTaskId);
    const targetTask = tasks.find((t) => t.id === targetTaskId);

    if (!draggedTask || !targetTask) return;
    if (draggedTask.id === targetTask.id) return;
    if (draggedTask.track_id !== targetTask.track_id) return;
    if (draggedTask.parent_task_id !== targetTask.parent_task_id) return;

    await onReorderTasks(draggedTaskId, targetTask.position);
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };
  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const filteredMainTrack = mainTrack && (showCompleted || !isTrackComplete(mainTrack.id))
    ? mainTrack
    : undefined;

  const filteredSideTracks = showCompleted
    ? sideTracks
    : sideTracks.filter(track => !isTrackComplete(track.id));

  const completedTrackCount = tracks.filter(track => isTrackComplete(track.id)).length;

  const getFilteredTasksForTrack = (trackId: string) => {
    const trackTasks = getTasksForTrack(trackId);
    return showCompleted ? trackTasks : trackTasks.filter(t => t.status !== "done");
  };

  const getFilteredSubtasks = (parentId: string) => {
    const subtasks = getSubtasks(parentId);
    return showCompleted ? subtasks : subtasks.filter(t => t.status !== "done");
  };

  return (
    <>
      {tracks.length < 8 && (
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            value={newTrackName}
            onChange={(e) => setNewTrackName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTrack()}
            placeholder={`New ${tracks.length === 0 ? "main" : "side"} track name...`}
            className="flex-1 bg-input border border-input rounded px-3 py-2 text-sm text-primary"
          />
          <button
            onClick={handleCreateTrack}
            className="bg-accent px-4 py-2 rounded text-sm font-medium"
          >
            Add Track
          </button>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm border transition-colors ${
              showCompleted
                ? "bg-accent/10 border-accent/30 text-accent-primary"
                : "bg-button-secondary border-sidebar text-tertiary hover:bg-button-secondary-hover hover:text-secondary"
            }`}
          >
            <Filter size={14} />
            <span>Show completed</span>
            {!showCompleted && completedTrackCount > 0 && (
              <>
                <span className="text-tertiary">·</span>
                <span className="font-medium">{completedTrackCount}</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {filteredMainTrack && (
          <TrackColumn
            track={filteredMainTrack}
            tasks={getFilteredTasksForTrack(filteredMainTrack.id)}
            onDeleteTrack={onDeleteTrack}
            onCreateTask={handleCreateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
            advanceTaskStatus={advanceTaskStatus}
            getStatusBorderColor={getStatusBorderColor}
            getSubtasks={getFilteredSubtasks}
            hasSubtasks={hasSubtasks}
            collapsedTasks={collapsedTasks}
            toggleTaskCollapsed={toggleTaskCollapsed}
            selectedTrackId={selectedTrackId}
            setSelectedTrackId={setSelectedTrackId}
            selectedParentTaskId={selectedParentTaskId}
            setSelectedParentTaskId={setSelectedParentTaskId}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            onOpenBlockModal={onOpenBlockModal}
            onOpenLinkTerminalModal={onOpenLinkTerminalModal}
            onTrackDragStart={handleTrackDragStart}
            onTrackDragOver={handleTrackDragOver}
            onTrackDragLeave={handleTrackDragLeave}
            onTrackDrop={handleTrackDrop}
            onTrackDragEnd={handleTrackDragEnd}
            isDragging={draggedTrackId === filteredMainTrack.id}
            isDragOver={dragOverTrackId === filteredMainTrack.id}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragOver={handleTaskDragOver}
            onTaskDragLeave={handleTaskDragLeave}
            onTaskDrop={handleTaskDrop}
            onTaskDragEnd={handleTaskDragEnd}
            draggedTaskId={draggedTaskId}
            dragOverTaskId={dragOverTaskId}
          />
        )}

        {filteredSideTracks.map((track) => (
          <TrackColumn
            key={track.id}
            track={track}
            tasks={getFilteredTasksForTrack(track.id)}
            onDeleteTrack={onDeleteTrack}
            onCreateTask={handleCreateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
            advanceTaskStatus={advanceTaskStatus}
            getStatusBorderColor={getStatusBorderColor}
            getSubtasks={getFilteredSubtasks}
            hasSubtasks={hasSubtasks}
            collapsedTasks={collapsedTasks}
            toggleTaskCollapsed={toggleTaskCollapsed}
            selectedTrackId={selectedTrackId}
            setSelectedTrackId={setSelectedTrackId}
            selectedParentTaskId={selectedParentTaskId}
            setSelectedParentTaskId={setSelectedParentTaskId}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            onOpenBlockModal={onOpenBlockModal}
            onOpenLinkTerminalModal={onOpenLinkTerminalModal}
            onTrackDragStart={handleTrackDragStart}
            onTrackDragOver={handleTrackDragOver}
            onTrackDragLeave={handleTrackDragLeave}
            onTrackDrop={handleTrackDrop}
            onTrackDragEnd={handleTrackDragEnd}
            isDragging={draggedTrackId === track.id}
            isDragOver={dragOverTrackId === track.id}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragOver={handleTaskDragOver}
            onTaskDragLeave={handleTaskDragLeave}
            onTaskDrop={handleTaskDrop}
            onTaskDragEnd={handleTaskDragEnd}
            draggedTaskId={draggedTaskId}
            dragOverTaskId={dragOverTaskId}
          />
        ))}
      </div>

      {tracks.length === 0 && (
        <div className="text-center py-12 text-tertiary">
          <p className="mb-4">No tracks yet. Create your main track to get started.</p>
        </div>
      )}
    </>
  );
}
