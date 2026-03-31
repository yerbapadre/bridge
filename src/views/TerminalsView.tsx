import type { Task, Track, TerminalSession } from "@/types";

interface TerminalsViewProps {
  tasks: Task[];
  tracks: Track[];
  terminalSessions: TerminalSession[];
  openLinkTerminalModal: () => void;
  focusTerminalSession: (session: TerminalSession) => void;
  deleteTerminalSession: (sessionId: string) => void;
}

function TerminalsView({
  tasks,
  tracks,
  terminalSessions,
  openLinkTerminalModal,
  focusTerminalSession,
  deleteTerminalSession,
}: TerminalsViewProps) {
  const getTaskTitle = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? task.title : "Unknown Task";
  };

  const getTrackName = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return "Unknown Track";
    const track = tracks.find((t) => t.id === task.track_id);
    return track ? track.name : "Unknown Track";
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Terminal Sessions</h2>
          <p className="text-sm text-tertiary mt-1">
            Manage your linked Ghostty terminal sessions
          </p>
        </div>
        <button
          onClick={openLinkTerminalModal}
          className="px-4 py-2 bg-accent rounded text-white hover:bg-accent-hover font-medium"
        >
          + Link New Session
        </button>
      </div>

      {terminalSessions.length === 0 ? (
        <div className="bg-tertiary rounded-lg border-2 border-dashed border-border-primary p-12 text-center">
          <p className="text-xl text-tertiary mb-3 font-semibold">
            No terminal sessions linked
          </p>
          <p className="text-base text-quaternary mb-6">
            Link Ghostty terminal windows to your tasks for quick access
          </p>
          <button
            onClick={openLinkTerminalModal}
            className="px-6 py-3 bg-accent rounded-lg text-white hover:bg-accent-hover font-medium"
          >
            Link Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminalSessions.map((session) => (
            <div
              key={session.id}
              className="bg-tertiary rounded-lg p-6 border border-border-primary hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary truncate mb-1">
                    {session.window_title || "Untitled Terminal"}
                  </h3>
                  <p className="text-sm text-tertiary">
                    {getTaskTitle(session.task_id)}
                  </p>
                  <p className="text-xs text-quaternary">
                    {getTrackName(session.task_id)}
                  </p>
                </div>
                <button
                  onClick={() => deleteTerminalSession(session.id)}
                  className="text-sm text-error hover:text-red-700 p-2"
                  title="Unlink session"
                >
                  ✕
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
                Last focused: {formatTimestamp(session.last_focused_at)}
              </div>

              <button
                onClick={() => focusTerminalSession(session)}
                className="w-full px-4 py-2 bg-accent rounded text-white hover:bg-accent-hover font-medium"
              >
                Focus Terminal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TerminalsView;
