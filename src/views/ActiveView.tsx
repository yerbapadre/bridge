import { useState, useEffect } from "react";
import type { Task, Track, ActiveTimer, TerminalSession } from "@/types";
import { Check, Pause, Play, Star, X } from "lucide-react";
import { formatTimeOnly, getTrackName, getTrackType } from "@/lib/utils";
import TerminalSessionCard from "@/components/TerminalSessionCard";
import TaskListItem from "@/components/TaskListItem";

interface ActiveViewProps {
  tasks: Task[];
  tracks: Track[];
  focusTask: Task | null;
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  totalTimeSeconds: number;
  formatTime: (seconds: number) => string;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
  onUpdateTaskDescription: (taskId: string, description: string | null) => void;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"]) => void;
  switchFocusTask: (taskId: string) => void;
  unfocusTask: () => void;
  stopCurrentTimer: () => void;
  resumeTimer: () => void;
  openNextTaskModal: () => void;
  terminalSessions: TerminalSession[];
  openLinkTerminalModal: () => void;
  openCreateTerminalModal: () => void;
  focusTerminalSession: (session: TerminalSession) => void;
  deleteTerminalSession: (sessionId: string) => void;
}

function ActiveView({
  tasks,
  tracks,
  focusTask,
  activeTimer,
  elapsedSeconds,
  totalTimeSeconds,
  formatTime,
  onUpdateTaskStatus: _onUpdateTaskStatus,
  onUpdateTaskDescription,
  advanceTaskStatus,
  switchFocusTask,
  unfocusTask,
  stopCurrentTimer,
  resumeTimer,
  openNextTaskModal,
  terminalSessions,
  openLinkTerminalModal,
  openCreateTerminalModal,
  focusTerminalSession,
  deleteTerminalSession,
}: ActiveViewProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (focusTask) {
      setDescriptionValue(focusTask.description || "");
      setIsEditingDescription(false);
      setIsDescriptionExpanded(false);
    }
  }, [focusTask?.id]);

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

  return (
    <div className="flex-1 overflow-y-auto space-y-6">      {/* Focus Zone - Takes up half the screen */}
      {focusTask ? (
        <div className="bg-tertiary rounded-lg border-4 border-accent p-4 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
            {/* Left column: Task details + Timer/buttons */}
            <div className="flex-1 flex flex-col gap-8">
              <div>
                <div className="text-xs font-semibold text-tertiary uppercase mb-2 tracking-wide">
                  ⚡ Currently Active
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-primary mb-3 leading-tight">
                  {focusTask.title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-secondary mb-4">
                  <span className="flex items-center gap-1">
                    {getTrackName(tracks, focusTask.track_id)}
                    {getTrackType(tracks, focusTask.track_id) === "main" && <Star size={14} className="text-star fill-star ml-0.5" />}
                  </span>
                </div>

                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      placeholder="Add task description..."
                      className="w-full px-3 py-2 rounded bg-quaternary border border-input text-primary focus:outline-none focus:border-accent min-h-[100px] resize-y"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onUpdateTaskDescription(focusTask.id, descriptionValue || null);
                          setIsEditingDescription(false);
                        }}
                        className="px-3 py-1 rounded bg-accent text-white text-sm hover:bg-accent-hover"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingDescription(false);
                          setDescriptionValue(focusTask.description || "");
                        }}
                        className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {focusTask.description ? (
                      <div className="relative">
                        <p className={`text-base text-secondary leading-relaxed whitespace-pre-wrap ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
                          {focusTask.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setDescriptionValue(focusTask.description || "");
                              setIsEditingDescription(true);
                            }}
                            className="text-xs text-tertiary hover:text-secondary"
                          >
                            Edit
                          </button>
                          {(focusTask.description.split('\n').length > 2 || focusTask.description.length > 150) && (
                            <button
                              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                              className="text-xs text-tertiary hover:text-secondary"
                            >
                              {isDescriptionExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setDescriptionValue("");
                          setIsEditingDescription(true);
                        }}
                        className="text-sm text-tertiary hover:text-secondary"
                      >
                        + Add description
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                {focusTask.status === "done" ? (
                  <div className="mb-8">
                    <div className="text-4xl md:text-5xl font-mono font-bold text-tertiary mb-1">
                      {formatTime(totalTimeSeconds)}
                    </div>
                    <div className="text-xs text-tertiary">
                      Total time spent
                    </div>
                  </div>
                ) : activeTimer ? (
                  <div className="mb-8">
                    <div className="text-4xl md:text-5xl font-mono font-bold text-header-in-progress mb-1">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="text-xs text-tertiary">
                      Started {formatTimeOnly(activeTimer.started_at)}
                    </div>
                  </div>
                ) : (
                  <div className="mb-8">
                    <div className="text-lg text-tertiary">
                      Timer stopped
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 md:gap-3">
                  {focusTask.status === "done" ? (
                    <button
                      disabled
                      className="px-4 md:px-5 py-2.5 rounded-lg bg-status-done-muted text-status-done font-medium text-sm shadow-lg flex-1 sm:flex-initial cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Completed
                    </button>
                  ) : (
                    <button
                      onClick={() => advanceTaskStatus(focusTask.id, focusTask.status)}
                      className="px-4 md:px-5 py-2.5 rounded-lg bg-accent font-medium text-sm shadow-lg flex-1 sm:flex-initial"
                    >
                      {focusTask.status === "ready" ? "Mark In Progress" : "Complete Task"}
                    </button>
                  )}
                  {focusTask.status !== "done" && (activeTimer ? (
                    <button
                      onClick={stopCurrentTimer}
                      className="px-4 md:px-5 py-2.5 rounded-lg bg-button-secondary hover:bg-button-secondary-hover text-secondary font-medium text-sm flex-1 sm:flex-initial flex items-center justify-center gap-2"
                    >
                      <Pause size={16} />
                      Stop Timer
                    </button>
                  ) : (
                    <button
                      onClick={resumeTimer}
                      className="px-4 md:px-5 py-2.5 rounded-lg bg-status-in-progress text-white font-medium text-sm flex-1 sm:flex-initial flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      Start Timer
                    </button>
                  ))}
                  <button
                    onClick={unfocusTask}
                    className="px-4 md:px-5 py-2.5 rounded-lg bg-button-secondary hover:bg-button-secondary-hover text-secondary font-medium text-sm flex-1 sm:flex-initial flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Unfocus
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Terminal sessions */}
            <div className="lg:flex-1 bg-secondary rounded-lg p-4 border border-border-primary flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-tertiary uppercase">
                  Terminal Sessions
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openCreateTerminalModal}
                    className="text-xs px-2 py-1 bg-accent rounded text-white hover:bg-accent-hover"
                  >
                    + Create
                  </button>
                  <button
                    onClick={openLinkTerminalModal}
                    className="text-xs px-2 py-1 bg-button-secondary hover:bg-button-secondary-hover rounded text-secondary"
                  >
                    Link
                  </button>
                </div>
              </div>

              {terminalSessions.length === 0 ? (
                <div className="text-xs text-quaternary text-center py-6 flex-1 flex items-center justify-center">
                  <div>
                    No terminal sessions linked.
                    <br />
                    Click "+ Link" to connect a Ghostty window.
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {terminalSessions.map((session) => (
                    <TerminalSessionCard
                      key={session.id}
                      session={session}
                      tasks={tasks}
                      tracks={tracks}
                      onFocus={focusTerminalSession}
                      onDelete={deleteTerminalSession}
                      variant="compact"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={openNextTaskModal}
          className="w-full bg-tertiary rounded-lg border-4 border-dashed border-border-primary p-12 text-center min-h-[33vh] flex flex-col items-center justify-center hover:bg-secondary hover:border-accent transition-colors cursor-pointer"
        >
          <p className="text-2xl text-tertiary mb-3 font-semibold">No task in focus</p>
          <p className="text-base text-quaternary">
            Click to select a task
          </p>
        </button>
      )}

      {/* Ready for Attention - Top task per track */}
      {topTasksPerTrack.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Ready for Attention
          </h3>
          <div className="space-y-2">
            {topTasksPerTrack.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                tracks={tracks}
                onAction={switchFocusTask}
                showStatusIndicator
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!focusTask && topTasksPerTrack.length === 0 && (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No active tasks</p>
          <p className="text-sm">
            Move tasks to "Ready" or "In Progress" from the Board View to see them here.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActiveView;
