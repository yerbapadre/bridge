import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Task {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  status: "blocked" | "ready" | "in_progress" | "done";
  position: number;
  parent_task_id: string | null;
  depth: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  is_current_focus: boolean;
}

interface Track {
  id: string;
  project_id: string;
  name: string;
  type: "main" | "side";
  color: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}

interface TrackColumnProps {
  track: Track;
  tasks: Task[];
  onDeleteTrack: (id: string) => void;
  onCreateTask: (trackId: string, parentTaskId?: string | null) => void;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
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
  onCreateTask,
  onUpdateTaskStatus,
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
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const isMainTrack = track.type === "main";
  const canDragTrack = true;

  const findTaskById = (taskId: string): Task | undefined => {
    const searchInTasks = (taskList: Task[]): Task | undefined => {
      for (const task of taskList) {
        if (task.id === taskId) return task;
        const subtasks = getSubtasks(task.id);
        const found = searchInTasks(subtasks);
        if (found) return found;
      }
      return undefined;
    };
    return searchInTasks(tasks);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuTaskId(null);
      setShowStatusSubmenu(false);
    };
    if (openMenuTaskId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuTaskId]);

  const renderTask = (task: Task, _isFirstTask: boolean) => {
    const subtasks = getSubtasks(task.id);
    const isCollapsed = collapsedTasks.has(task.id);
    const canHaveSubtasks = task.depth < 2;
    const isAddingSubtask = selectedParentTaskId === task.id;
    const isMenuOpen = openMenuTaskId === task.id;

    const isDraggingThis = draggedTaskId === task.id;
    const isDragOverThis = dragOverTaskId === task.id;

    const marginClass = task.depth === 1 ? "ml-4" : task.depth === 2 ? "ml-8" : "";

    return (
      <div key={task.id} className={marginClass}>
        <div
          className={`bg-task-card rounded p-3 border-t border-l border-r border-task-card border-b-4 ${getStatusBorderColor(
            task.status
          )} group mb-2 relative transition-all select-none ${
            isDraggingThis ? "opacity-50 cursor-grabbing" : "cursor-grab"
          } ${isDragOverThis ? "ring-2 ring-accent mt-4" : ""}`}
          draggable
          onDragStart={(e) => {
            console.log("Task onDragStart in component", task.id);
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", task.id);
            if (onTaskDragStart) {
              onTaskDragStart(task.id);
            }
          }}
          onDrag={() => {
            console.log("Task onDrag firing (drag in progress)");
          }}
          onDragEnter={(e) => {
            console.log("onDragEnter fired on task", task.id);
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragOver={(e) => {
            console.log("onDragOver fired on task", task.id);
            e.preventDefault();
            e.stopPropagation();
            if (onTaskDragOver) {
              console.log("Calling onTaskDragOver");
              onTaskDragOver(e, task.id);
            } else {
              console.log("onTaskDragOver is undefined!");
            }
          }}
          onDragLeave={() => onTaskDragLeave && onTaskDragLeave()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onTaskDrop) {
              onTaskDrop(e, task.id);
            }
          }}
          onDragEnd={() => onTaskDragEnd && onTaskDragEnd()}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1">
              {hasSubtasks(task.id) && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => toggleTaskCollapsed(task.id)}
                    className="text-tertiary hover:text-secondary text-sm mt-0.5"
                  >
                    {isCollapsed ? "▶" : "▼"}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isCollapsed ? "Show subtasks" : "Hide subtasks"}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug text-primary select-text">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-tertiary mt-1 select-text">{task.description}</p>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                ref={(el) => (menuButtonRefs.current[task.id] = el)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuOpen) {
                    setOpenMenuTaskId(null);
                    setMenuPosition(null);
                  } else {
                    const button = menuButtonRefs.current[task.id];
                    if (button) {
                      const rect = button.getBoundingClientRect();
                      setMenuPosition({
                        top: rect.bottom + 4,
                        left: rect.right - 150,
                      });
                    }
                    setOpenMenuTaskId(task.id);
                  }
                }}
                className="text-tertiary hover:text-secondary text-sm transition-opacity"
                title="More options"
                draggable="false"
              >
                ⋯
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {task.status !== "done" ? (
              <button
                onClick={() => advanceTaskStatus(task.id, task.status)}
                className="text-xs px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Advance to next status"
                draggable="false"
              >
                →
              </button>
            ) : (
              <button
                className="text-xs px-2 py-1 rounded bg-status-done-muted text-status-done cursor-default"
                disabled
                title="Completed"
                draggable="false"
              >
                ✓
              </button>
            )}
            {task.status !== "done" && (
              <button
                onClick={() => onOpenBlockModal(task.id)}
                className="text-sm px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Add blocking task"
                draggable="false"
              >
                ⊘
              </button>
            )}
            {canHaveSubtasks && (
              <button
                onClick={() => setSelectedParentTaskId(task.id)}
                className="text-xs px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Add subtask"
                draggable="false"
              >
                + Add Subtask
              </button>
            )}
          </div>

          {isAddingSubtask && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateTask(track.id, task.id);
                  if (e.key === "Escape") setSelectedParentTaskId(null);
                }}
                onBlur={() => {
                  if (!newTaskTitle.trim()) setSelectedParentTaskId(null);
                }}
                placeholder="Subtask title..."
                autoFocus
                className="flex-1 bg-input border border-input rounded px-2 py-1 text-sm text-primary"
              />
              <button
                onClick={() => onCreateTask(track.id, task.id)}
                className="bg-accent px-3 py-1 rounded text-xs"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {!isCollapsed && subtasks.map((subtask) => renderTask(subtask, false))}
      </div>
    );
  };

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
        <div>
          <h2 className="font-semibold flex items-center gap-2 text-primary">
            {isMainTrack && <span className="text-star">★</span>}
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
            className="text-tertiary hover:text-error text-sm pointer-events-auto z-10 relative"
            title="Delete track"
            draggable="false"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-3 flex-1">
        {tasks.map((task, index) => renderTask(task, index === 0))}

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
      {openMenuTaskId && menuPosition && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-button-secondary border border-sidebar rounded shadow-lg min-w-[150px]">
            <div className="relative">
              <button
                onMouseEnter={() => setShowStatusSubmenu(true)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-secondary"
              >
                Change Status ›
              </button>
              {showStatusSubmenu && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: 0,
                    marginLeft: '4px',
                    zIndex: 10000,
                  }}
                  className="bg-button-secondary border border-sidebar rounded shadow-lg min-w-[130px]"
                  onMouseLeave={() => setShowStatusSubmenu(false)}
                >
                  {(["blocked", "ready", "in_progress", "done"] as const).map((status) => {
                    const task = findTaskById(openMenuTaskId);
                    return (
                      <button
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateTaskStatus(openMenuTaskId, status);
                          setOpenMenuTaskId(null);
                          setMenuPosition(null);
                          setShowStatusSubmenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          task?.status === status
                            ? "text-tertiary bg-button-secondary-hover"
                            : "text-secondary hover:bg-button-secondary-hover hover:text-primary"
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(openMenuTaskId);
                setOpenMenuTaskId(null);
                setMenuPosition(null);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-error border-error"
            >
              Delete
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
