import type { Task, Track, TerminalSession } from "@/types";
import TerminalSessionCard from "@/components/TerminalSessionCard";

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
            <TerminalSessionCard
              key={session.id}
              session={session}
              tasks={tasks}
              tracks={tracks}
              onFocus={focusTerminalSession}
              onDelete={deleteTerminalSession}
              variant="full"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TerminalsView;
