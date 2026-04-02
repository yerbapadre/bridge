import { useState } from "react";
import TaskCard from "./TaskCard";
import { Star, X } from "lucide-react";
import type { Task, Track } from "@/types";

interface TrackColumnProps {
  track: Track;
  tasks: Task[];
  onDeleteTrack: (id: string) => void;
  onUpdateTrackName: (trackId: string, name: string) => void;
  onCreateTask: (trackId: string, parentTaskId?: string | null) => void;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
  onUpdateTaskTitle: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"]) => void;
  getStatusBorderColor: (status: Task["status"]) => string;
  getSubtasks: (parentId: string) => Task[];
  hasSubtasks: (taskId: string) => boolean;
  collapsedTasks: Set<string>;
  toggleTaskCollapsed: (taskId: string) => void;
  selectedTrackId: string | null;
  setSelectedTrackId: (id: string | null) => void;
  selectedParentTaskId: string | null;
  setSelectedParentTaskId: (id: string | null) => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  onOpenBlockModal: (taskId: string) => void;
  onOpenLinkTerminalModal: (taskId: string) => void;

  // Track drag handlers
  onTrackDragStart?: (trackId: string, trackType: string) => void;
  onTrackDragOver?: (e: React.DragEvent, trackId: string) => void;
  onTrackDragLeave?: () => void;
  onTrackDrop?: (e: React.DragEvent, trackId: string) => void;
  onTrackDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;

  // Task drag handlers
  onTaskDragStart?: (taskId: string) => void;
  onTaskDragOver?: (e: React.DragEvent, taskId: string) => void;
  onTaskDragLeave?: () => void;
  onTaskDrop?: (e: React.DragEvent, taskId: string) => void;
  onTaskDragEnd?: () => void;
  draggedTaskId?: string | null;
  dragOverTaskId?: string | null;
}

export default function TrackColumn({
  track,
  tasks,
  onDeleteTrack,
  onUpdateTrackName,
  onCreateTask,
  onUpdateTaskStatus,
  onUpdateTaskTitle,
  onDeleteTask,
  advanceTaskStatus,
  getStatusBorderColor,
  getSubtasks,
  hasSubtasks,
  collapsedTasks,
  toggleTaskCollapsed,
  selectedTrackId,
  setSelectedTrackId,
  selectedParentTaskId,
  setSelectedParentTaskId,
  newTaskTitle,
  setNewTaskTitle,
  onOpenBlockModal,
  onOpenLinkTerminalModal,
  onTrackDragStart,
  onTrackDragOver,
  onTrackDragLeave,
  onTrackDrop,
  onTrackDragEnd,
  isDragging,
  isDragOver,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDrop,
  onTaskDragEnd,
  draggedTaskId,
  dragOverTaskId,
}: TrackColumnProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(track.name);

  const isMainTrack = track.type === "main";
  const canDragTrack = !isEditingName;

  return (
    <div
      className={`bg-track rounded-lg border border-track flex flex-col h-fit min-w-[320px] w-[320px] transition-all select-none ${
        canDragTrack ? (isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab") : ""
      } ${isDragOver ? "ring-2 ring-accent border-accent" : ""}`}
      draggable={canDragTrack}
      onDragStart={(e) => {
        console.log("Track onDragStart in component", track.id);
        // Prevent drag if clicking on delete button
        const target = e.target as HTMLElement;
        if (target.closest('button[title="Delete track"]')) {
          e.preventDefault();
          return;
        }
        if (canDragTrack && onTrackDragStart) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", track.id);
          onTrackDragStart(track.id, track.type);
        } else {
          e.preventDefault();
        }
      }}
      onDrag={() => {
        console.log("onDrag firing (drag in progress)");
      }}
      onDragEnter={(e) => {
        console.log("onDragEnter fired on track", track.id);
        e.preventDefault();
      }}
      onDragOver={(e) => {
        console.log("onDragOver fired on track", track.id);
        e.preventDefault();
        if (onTrackDragOver) {
          console.log("Calling onTrackDragOver");
          onTrackDragOver(e, track.id);
        } else {
          console.log("onTrackDragOver is undefined!");
        }
      }}
      onDragLeave={() => onTrackDragLeave && onTrackDragLeave()}
      onDrop={(e) => {
        e.preventDefault();
        if (onTrackDrop) onTrackDrop(e, track.id);
      }}
      onDragEnd={() => onTrackDragEnd && onTrackDragEnd()}
    >
      <div className="p-4 border-b border-sidebar flex items-center justify-between">
        {isEditingName ? (
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={editingNameValue}
              onChange={(e) => setEditingNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editingNameValue.trim()) {
                  onUpdateTrackName(track.id, editingNameValue.trim());
                  setIsEditingName(false);
                }
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditingNameValue(track.name);
                }
              }}
              className="w-full px-2 py-1 rounded bg-quaternary border border-input text-primary focus:outline-none focus:border-accent"
              autoFocus
              maxLength={255}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editingNameValue.trim()) {
                    onUpdateTrackName(track.id, editingNameValue.trim());
                    setIsEditingName(false);
                  }
                }}
                className="px-3 py-1 rounded bg-accent text-white text-sm hover:bg-accent-hover"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setEditingNameValue(track.name);
                }}
                className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h2
                className="font-semibold flex items-center gap-2 text-primary cursor-text"
                onDoubleClick={() => {
                  setIsEditingName(true);
                  setEditingNameValue(track.name);
                }}
              >
                {isMainTrack && <Star size={16} className="text-star fill-star" />}
                {track.name}
              </h2>
              <p className="text-xs text-tertiary mt-0.5">
                {isMainTrack ? "Main Track" : "Side Track"}
              </p>
            </div>
            {track.type !== "main" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTrack(track.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                className="text-tertiary hover:text-error pointer-events-auto z-10 relative"
                title="Delete track"
                draggable="false"
              >
                <X size={16} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-3 flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            trackId={track.id}
            getStatusBorderColor={getStatusBorderColor}
            hasSubtasks={hasSubtasks}
            collapsedTasks={collapsedTasks}
            toggleTaskCollapsed={toggleTaskCollapsed}
            onTaskDragStart={onTaskDragStart}
            onTaskDragOver={onTaskDragOver}
            onTaskDragLeave={onTaskDragLeave}
            onTaskDrop={onTaskDrop}
            onTaskDragEnd={onTaskDragEnd}
            draggedTaskId={draggedTaskId}
            dragOverTaskId={dragOverTaskId}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onUpdateTaskTitle={onUpdateTaskTitle}
            onDeleteTask={onDeleteTask}
            advanceTaskStatus={advanceTaskStatus}
            onOpenBlockModal={onOpenBlockModal}
            onOpenLinkTerminalModal={onOpenLinkTerminalModal}
            getSubtasks={getSubtasks}
            selectedParentTaskId={selectedParentTaskId}
            setSelectedParentTaskId={setSelectedParentTaskId}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            onCreateTask={onCreateTask}
          />
        ))}

        {tasks.length === 0 && (
          <p className="text-xs text-tertiary text-center py-4">No tasks yet</p>
        )}
      </div>

      <div className="p-3 border-t border-sidebar">
        {selectedTrackId === track.id && selectedParentTaskId === null ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateTask(track.id, null);
                if (e.key === "Escape") setSelectedTrackId(null);
              }}
              onBlur={() => {
                if (!newTaskTitle.trim()) setSelectedTrackId(null);
              }}
              placeholder="Task title..."
              autoFocus
              className="flex-1 bg-input border border-input rounded px-2 py-1.5 text-sm text-primary"
            />
            <button
              onClick={() => onCreateTask(track.id, null)}
              className="bg-accent px-3 py-1.5 rounded text-sm"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setSelectedTrackId(track.id);
              setSelectedParentTaskId(null);
            }}
            className="w-full bg-button-secondary hover:bg-button-secondary-hover border border-sidebar rounded px-3 py-1.5 text-sm text-tertiary hover:text-secondary"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
