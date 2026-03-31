import type { Task, Track, ActiveTimer, TerminalSession } from "@/types";

interface ActiveViewProps {
  tasks: Task[];
  tracks: Track[];
  focusTask: Task | null;
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  formatTime: (seconds: number) => string;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"]) => void;
  switchFocusTask: (taskId: string) => void;
  stopCurrentTimer: () => void;
  resumeTimer: () => void;
  terminalSessions: TerminalSession[];
  openLinkTerminalModal: () => void;
  focusTerminalSession: (session: TerminalSession) => void;
  deleteTerminalSession: (sessionId: string) => void;
}

function ActiveView({
  tasks,
  tracks,
  focusTask,
  activeTimer,
  elapsedSeconds,
  formatTime,
  onUpdateTaskStatus,
  advanceTaskStatus,
  switchFocusTask,
  stopCurrentTimer,
  resumeTimer,
  terminalSessions,
  openLinkTerminalModal,
  focusTerminalSession,
  deleteTerminalSession,
}: ActiveViewProps) {
  const readyTasks = tasks.filter(
    (t) => t.status === "ready" && !t.is_current_focus
  );

  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress" && !t.is_current_focus
  );

  const getTrackName = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    return track ? track.name : "Unknown Track";
  };

  const getTrackType = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    return track?.type || "side";
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

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
                  <span>
                    {getTrackName(focusTask.track_id)}
                    {getTrackType(focusTask.track_id) === "main" && <span className="text-star ml-1">★</span>}
                  </span>
                </div>
                {focusTask.description && (
                  <p className="text-base text-secondary leading-relaxed">{focusTask.description}</p>
                )}
              </div>

              <div>
                {activeTimer ? (
                  <div className="mb-8">
                    <div className="text-4xl md:text-5xl font-mono font-bold text-header-in-progress mb-1">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="text-xs text-tertiary">
                      Started {formatTimestamp(activeTimer.started_at)}
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
                  <button
                    onClick={() => advanceTaskStatus(focusTask.id, focusTask.status)}
                    className="px-4 md:px-5 py-2.5 rounded-lg bg-accent font-medium text-sm shadow-lg flex-1 sm:flex-initial"
                  >
                    {focusTask.status === "ready" ? "Mark In Progress →" : "Complete Task →"}
                  </button>
                  {activeTimer ? (
                    <button
                      onClick={stopCurrentTimer}
                      className="px-4 md:px-5 py-2.5 rounded-lg bg-button-secondary hover:bg-button-secondary-hover text-secondary font-medium text-sm flex-1 sm:flex-initial"
                    >
                      ⏸ Stop Timer
                    </button>
                  ) : (
                    <button
                      onClick={resumeTimer}
                      className="px-4 md:px-5 py-2.5 rounded-lg bg-status-in-progress text-white font-medium text-sm flex-1 sm:flex-initial"
                    >
                      ▶ Start Timer
                    </button>
                  )}
                  <button
                    onClick={() => onUpdateTaskStatus(focusTask.id, "blocked")}
                    className="px-4 md:px-5 py-2.5 rounded-lg bg-button-secondary hover:bg-button-secondary-hover text-secondary font-medium text-sm flex-1 sm:flex-initial"
                  >
                    🔴 Block
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Terminal sessions */}
            <div className="lg:w-80 bg-secondary rounded-lg p-4 border border-border-primary self-start">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-tertiary uppercase">
                  Terminal Sessions
                </div>
                <button
                  onClick={openLinkTerminalModal}
                  className="text-xs px-2 py-1 bg-accent rounded text-white hover:bg-accent-hover"
                >
                  + Link
                </button>
              </div>

              {terminalSessions.length === 0 ? (
                <div className="text-xs text-quaternary text-center py-6">
                  No terminal sessions linked.
                  <br />
                  Click "+ Link" to connect a Ghostty window.
                </div>
              ) : (
                <div className="space-y-2">
                  {terminalSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-tertiary rounded p-2 border border-border-secondary hover:border-accent transition-colors"
                    >
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
                          onClick={() => deleteTerminalSession(session.id)}
                          className="text-xs text-error hover:text-red-700 p-1"
                          title="Unlink session"
                        >
                          ✕
                        </button>
                      </div>
                      <button
                        onClick={() => focusTerminalSession(session)}
                        className="mt-2 w-full text-xs px-2 py-1 bg-accent rounded text-white hover:bg-accent-hover"
                      >
                        Focus Terminal
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-tertiary rounded-lg border-4 border-dashed border-border-primary p-12 text-center min-h-[33vh] flex flex-col items-center justify-center">
          <p className="text-2xl text-tertiary mb-3 font-semibold">No task in focus</p>
          <p className="text-base text-quaternary">
            Select a task below to start working on it
          </p>
        </div>
      )}

      {/* Ready for Attention Queue */}
      {readyTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Ready for Attention ({readyTasks.length})
          </h3>
          <div className="space-y-2">
            {readyTasks.map((task) => (
              <div
                key={task.id}
                className="bg-task-card rounded-lg p-4 border border-task-card hover:border-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-base font-medium text-primary mb-1">
                      {task.title}
                    </p>
                    <p className="text-xs text-tertiary">
                      {getTrackName(task.track_id)}
                      {getTrackType(task.track_id) === "main" && <span className="text-star ml-1">★</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => switchFocusTask(task.id)}
                    className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Switch to This
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Background Tasks */}
      {inProgressTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            In Progress (Background) ({inProgressTasks.length})
          </h3>
          <div className="space-y-2">
            {inProgressTasks.map((task) => (
              <div
                key={task.id}
                className="bg-task-card rounded-lg p-4 border border-task-card hover:border-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-status-in-progress rounded-full"></div>
                      <p className="text-base font-medium text-primary">
                        {task.title}
                      </p>
                    </div>
                    <p className="text-xs text-tertiary">
                      {getTrackName(task.track_id)}
                      {getTrackType(task.track_id) === "main" && <span className="text-star ml-1">★</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => switchFocusTask(task.id)}
                    className="px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Switch to This
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!focusTask && readyTasks.length === 0 && inProgressTasks.length === 0 && (
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
