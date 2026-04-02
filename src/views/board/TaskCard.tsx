import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronDown, Check, ArrowRight, Ban, Terminal, Plus, MoreVertical } from "lucide-react";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  trackId: string;
  getStatusBorderColor: (status: Task["status"]) => string;
  hasSubtasks: (taskId: string) => boolean;
  collapsedTasks: Set<string>;
  toggleTaskCollapsed: (taskId: string) => void;
  onTaskDragStart?: (taskId: string) => void;
  onTaskDragOver?: (e: React.DragEvent, taskId: string) => void;
  onTaskDragLeave?: () => void;
  onTaskDrop?: (e: React.DragEvent, taskId: string) => void;
  onTaskDragEnd?: () => void;
  draggedTaskId?: string | null;
  dragOverTaskId?: string | null;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
  onUpdateTaskTitle: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"]) => void;
  onOpenBlockModal: (taskId: string) => void;
  onOpenLinkTerminalModal: (taskId: string) => void;
  getSubtasks: (parentId: string) => Task[];
  selectedParentTaskId: string | null;
  setSelectedParentTaskId: (id: string | null) => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  onCreateTask: (trackId: string, parentTaskId?: string | null) => void;
}

export default function TaskCard({
  task,
  trackId,
  getStatusBorderColor,
  hasSubtasks,
  collapsedTasks,
  toggleTaskCollapsed,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDrop,
  onTaskDragEnd,
  draggedTaskId,
  dragOverTaskId,
  onUpdateTaskStatus,
  onUpdateTaskTitle,
  onDeleteTask,
  advanceTaskStatus,
  onOpenBlockModal,
  onOpenLinkTerminalModal,
  getSubtasks,
  selectedParentTaskId,
  setSelectedParentTaskId,
  newTaskTitle,
  setNewTaskTitle,
  onCreateTask,
}: TaskCardProps) {
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const findTaskById = (taskId: string): Task | undefined => {
    const searchInTasks = (currentTask: Task): Task | undefined => {
      if (currentTask.id === taskId) return currentTask;
      const subtasks = getSubtasks(currentTask.id);
      for (const subtask of subtasks) {
        const found = searchInTasks(subtask);
        if (found) return found;
      }
      return undefined;
    };
    return searchInTasks(task);
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

  const renderTask = (currentTask: Task): JSX.Element => {
    const subtasks = getSubtasks(currentTask.id);
    const isCollapsed = collapsedTasks.has(currentTask.id);
    const canHaveSubtasks = currentTask.depth < 2;
    const isAddingSubtask = selectedParentTaskId === currentTask.id;
    const isMenuOpen = openMenuTaskId === currentTask.id;

    const isDraggingThis = draggedTaskId === currentTask.id;
    const isDragOverThis = dragOverTaskId === currentTask.id;

    const marginClass = currentTask.depth === 1 ? "ml-4" : currentTask.depth === 2 ? "ml-8" : "";

    return (
      <div key={currentTask.id} className={marginClass}>
        <div
          className={`bg-task-card rounded p-3 border-t border-l border-r border-task-card border-b-4 ${getStatusBorderColor(
            currentTask.status
          )} group mb-2 relative transition-all select-none ${
            isDraggingThis ? "opacity-50 cursor-grabbing" : "cursor-grab"
          } ${isDragOverThis ? "ring-2 ring-accent mt-4" : ""}`}
          draggable
          onDragStart={(e) => {
            console.log("Task onDragStart in component", currentTask.id);
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", currentTask.id);
            if (onTaskDragStart) {
              onTaskDragStart(currentTask.id);
            }
          }}
          onDrag={() => {
            console.log("Task onDrag firing (drag in progress)");
          }}
          onDragEnter={(e) => {
            console.log("onDragEnter fired on task", currentTask.id);
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragOver={(e) => {
            console.log("onDragOver fired on task", currentTask.id);
            e.preventDefault();
            e.stopPropagation();
            if (onTaskDragOver) {
              console.log("Calling onTaskDragOver");
              onTaskDragOver(e, currentTask.id);
            } else {
              console.log("onTaskDragOver is undefined!");
            }
          }}
          onDragLeave={() => onTaskDragLeave && onTaskDragLeave()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onTaskDrop) {
              onTaskDrop(e, currentTask.id);
            }
          }}
          onDragEnd={() => onTaskDragEnd && onTaskDragEnd()}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1">
              {hasSubtasks(currentTask.id) && (
                <button
                  onClick={() => toggleTaskCollapsed(currentTask.id)}
                  className="text-tertiary hover:text-secondary mt-0.5"
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
              <div className="flex-1">
                {editingTaskId === currentTask.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingTitleValue.trim()) {
                          onUpdateTaskTitle(currentTask.id, editingTitleValue.trim());
                          setEditingTaskId(null);
                        }
                        if (e.key === "Escape") {
                          setEditingTaskId(null);
                          setEditingTitleValue("");
                        }
                      }}
                      className="w-full px-2 py-1 rounded bg-quaternary border border-input text-sm text-primary focus:outline-none focus:border-accent"
                      autoFocus
                      maxLength={255}
                      draggable="false"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingTitleValue.trim()) {
                            onUpdateTaskTitle(currentTask.id, editingTitleValue.trim());
                            setEditingTaskId(null);
                          }
                        }}
                        className="px-2 py-1 rounded bg-accent text-white text-xs hover:bg-accent-hover"
                        draggable="false"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(null);
                          setEditingTitleValue("");
                        }}
                        className="px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary text-xs"
                        draggable="false"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className="text-sm font-medium leading-snug text-primary select-text cursor-text"
                      onDoubleClick={() => {
                        setEditingTaskId(currentTask.id);
                        setEditingTitleValue(currentTask.title);
                      }}
                    >
                      {currentTask.title}
                    </p>
                    {currentTask.description && (
                      <p className="text-xs text-tertiary mt-1 select-text">{currentTask.description}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                ref={(el) => (menuButtonRefs.current[currentTask.id] = el)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuOpen) {
                    setOpenMenuTaskId(null);
                    setMenuPosition(null);
                  } else {
                    const button = menuButtonRefs.current[currentTask.id];
                    if (button) {
                      const rect = button.getBoundingClientRect();
                      setMenuPosition({
                        top: rect.bottom + 4,
                        left: rect.right - 150,
                      });
                    }
                    setOpenMenuTaskId(currentTask.id);
                  }
                }}
                className="text-tertiary hover:text-secondary transition-opacity"
                title="More options"
                draggable="false"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {currentTask.status !== "done" ? (
              <button
                onClick={() => advanceTaskStatus(currentTask.id, currentTask.status)}
                className="text-xs px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Advance to next status"
                draggable="false"
              >
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="text-xs px-2 py-1 rounded bg-status-done-muted text-status-done cursor-default"
                disabled
                title="Completed"
                draggable="false"
              >
                <Check size={14} />
              </button>
            )}
            {currentTask.status !== "done" && (
              <button
                onClick={() => onOpenBlockModal(currentTask.id)}
                className="text-sm px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Add blocking task"
                draggable="false"
              >
                <Ban size={14} />
              </button>
            )}
            <button
              onClick={() => onOpenLinkTerminalModal(currentTask.id)}
              className="text-xs px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
              title="Link terminal"
              draggable="false"
            >
              <Terminal size={14} />
            </button>
            {canHaveSubtasks && (
              <button
                onClick={() => setSelectedParentTaskId(currentTask.id)}
                className="text-xs px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary flex items-center gap-1"
                title="Add subtask"
                draggable="false"
              >
                <Plus size={14} />
                <span>Add Subtask</span>
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
                  if (e.key === "Enter") onCreateTask(trackId, currentTask.id);
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
                onClick={() => onCreateTask(trackId, currentTask.id)}
                className="bg-accent px-3 py-1 rounded text-xs"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {!isCollapsed && subtasks.map((subtask) => renderTask(subtask))}
      </div>
    );
  };

  return (
    <>
      {renderTask(task)}
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
                    const foundTask = findTaskById(openMenuTaskId);
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
                          foundTask?.status === status
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
                const foundTask = findTaskById(openMenuTaskId);
                if (foundTask) {
                  setEditingTaskId(openMenuTaskId);
                  setEditingTitleValue(foundTask.title);
                }
                setOpenMenuTaskId(null);
                setMenuPosition(null);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-secondary"
            >
              Rename
            </button>
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
    </>
  );
}
