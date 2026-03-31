import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePreferences } from "@/hooks";
import { useProjectStore, useTaskStore, useFocusStore, useTerminalStore } from "@/stores";
import { formatTime } from "@/lib/theme";
import type { GhosttyWindow, Task } from "@/types";
import Sidebar from "@/components/Sidebar";
import Clock from "@/components/Clock";
import SettingsView from "@/views/SettingsView";
import ActiveView from "@/views/ActiveView";
import RetroView from "@/views/RetroView";
import TerminalsView from "@/views/TerminalsView";
import BoardView from "@/views/BoardView";
import BlockTaskModal from "@/components/BlockTaskModal";

export default function App() {
  usePreferences();

  const projects = useProjectStore(state => state.projects);
  const currentProject = useProjectStore(state => state.currentProject());
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  const setCurrentProjectId = useProjectStore(state => state.setCurrentProjectId);
  const createProject = useProjectStore(state => state.createProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const getProjectTaskCount = useProjectStore(state => state.getProjectTaskCount);
  const projectsError = useProjectStore(state => state.error);
  const setProjectsError = useProjectStore(state => state.setError);

  const tracks = useTaskStore(state => state.tracks);
  const tasks = useTaskStore(state => state.tasks);
  const dependencies = useTaskStore(state => state.dependencies);
  const createTrack = useTaskStore(state => state.createTrack);
  const deleteTrack = useTaskStore(state => state.deleteTrack);
  const reorderTracks = useTaskStore(state => state.reorderTracks);
  const createTask = useTaskStore(state => state.createTask);
  const updateTaskStatus = useTaskStore(state => state.updateTaskStatus);
  const deleteTask = useTaskStore(state => state.deleteTask);
  const reorderTasks = useTaskStore(state => state.reorderTasks);
  const addDependency = useTaskStore(state => state.addDependency);
  const getTasksForTrack = useTaskStore(state => state.getTasksForTrack);
  const getSubtasks = useTaskStore(state => state.getSubtasks);
  const hasSubtasks = useTaskStore(state => state.hasSubtasks);
  const advanceTaskStatus = useTaskStore(state => state.advanceTaskStatus);
  const loadTaskData = useTaskStore(state => state.loadData);
  const tasksError = useTaskStore(state => state.error);
  const setTasksError = useTaskStore(state => state.setError);

  const focusTask = useFocusStore(state => state.focusTask);
  const activeTimer = useFocusStore(state => state.activeTimer);
  const elapsedSeconds = useFocusStore(state => state.elapsedSeconds);
  const switchFocusTask = useFocusStore(state => state.switchFocusTask);
  const stopCurrentTimer = useFocusStore(state => state.stopCurrentTimer);
  const resumeTimer = useFocusStore(state => state.resumeTimer);
  const syncFocusFromTasks = useFocusStore(state => state.syncFocusFromTasks);
  const focusError = useFocusStore(state => state.error);
  const setFocusError = useFocusStore(state => state.setError);

  const terminalSessions = useTerminalStore(state => state.terminalSessions);
  const allTerminalSessions = useTerminalStore(state => state.allTerminalSessions);
  const availableWindows = useTerminalStore(state => state.availableWindows);
  const loadAvailableWindows = useTerminalStore(state => state.loadAvailableWindows);
  const linkTerminalWindow = useTerminalStore(state => state.linkTerminalWindow);
  const createNewTerminal = useTerminalStore(state => state.createNewTerminal);
  const focusTerminalSession = useTerminalStore(state => state.focusTerminalSession);
  const deleteTerminalSession = useTerminalStore(state => state.deleteTerminalSession);
  const deleteTerminalSessionFromAllView = useTerminalStore(state => state.deleteTerminalSessionFromAllView);
  const terminalsError = useTerminalStore(state => state.error);
  const setTerminalsError = useTerminalStore(state => state.setError);

  // Compute derived state
  const mainTrack = tracks.find(t => t.type === 'main');
  const sideTracks = tracks.filter(t => t.type === 'side');

  // Filter terminal sessions to only those for tasks in the current project
  const taskIds = new Set(tasks.map(t => t.id));
  const projectTerminalSessions = allTerminalSessions.filter(session =>
    taskIds.has(session.task_id)
  );

  // Load initial data
  useEffect(() => {
    const loadProjects = useProjectStore.getState().loadProjects;
    const loadAllTerminalSessions = useTerminalStore.getState().loadAllTerminalSessions;
    loadProjects();
    loadAllTerminalSessions();
  }, []);

  // Load tasks and focus when project changes
  useEffect(() => {
    if (currentProjectId) {
      loadTaskData(currentProjectId);
      const loadFocusAndTimer = useFocusStore.getState().loadFocusAndTimer;
      loadFocusAndTimer(currentProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Sync focus task when tasks change
  useEffect(() => {
    syncFocusFromTasks(tasks);
  }, [tasks, syncFocusFromTasks]);

  // Load terminal sessions for the current focus task
  useEffect(() => {
    const loadTerminalSessions = useTerminalStore.getState().loadTerminalSessions;
    if (focusTask) {
      loadTerminalSessions(focusTask.id);
    }
  }, [focusTask]);

  const [currentView, setCurrentView] = useState<"board" | "active" | "retro" | "terminals" | "settings">("active");
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [deleteConfirmTaskCount, setDeleteConfirmTaskCount] = useState(0);
  const [deleteConfirmTrackId, setDeleteConfirmTrackId] = useState<string | null>(null);
  const [deleteConfirmTrackTaskCount, setDeleteConfirmTrackTaskCount] = useState(0);
  const [blockModalTaskId, setBlockModalTaskId] = useState<string | null>(null);
  const [showLinkTerminalModal, setShowLinkTerminalModal] = useState(false);
  const [showCreateTerminalModal, setShowCreateTerminalModal] = useState(false);
  const [createTerminalTaskId, setCreateTerminalTaskId] = useState<string | null>(null);
  const [newTerminalWorkingDir, setNewTerminalWorkingDir] = useState("");
  const [newTerminalInitialCmd, setNewTerminalInitialCmd] = useState("");
  const [saveAsProjectRoot, setSaveAsProjectRoot] = useState(false);

  const error = projectsError || tasksError || focusError || terminalsError;
  const setError = (e: string | null) => {
    setProjectsError(e);
    setTasksError(e);
    setFocusError(e);
    setTerminalsError(e);
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    if (currentView === "settings") {
      setCurrentView("active");
    }
  };

  const handleCreateProject = async (name: string) => {
    const project = await createProject(name);
    if (project) {
      setCurrentView("active");
    }
  };

  const handleUpdateProject = async (id: string, name: string) => {
    await updateProject(id, name);
  };

  const handleDeleteProject = async (projectId: string) => {
    const taskCount = await getProjectTaskCount(projectId);
    setDeleteConfirmProjectId(projectId);
    setDeleteConfirmTaskCount(taskCount);
  };

  const confirmDeleteProject = async () => {
    if (deleteConfirmProjectId) {
      await deleteProject(deleteConfirmProjectId);
      setDeleteConfirmProjectId(null);
      setDeleteConfirmTaskCount(0);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    const taskCount = tasks.filter(t => t.track_id === trackId).length;
    setDeleteConfirmTrackId(trackId);
    setDeleteConfirmTrackTaskCount(taskCount);
  };

  const confirmDeleteTrack = async () => {
    if (deleteConfirmTrackId && currentProjectId) {
      await deleteTrack(deleteConfirmTrackId, currentProjectId);
      setDeleteConfirmTrackId(null);
      setDeleteConfirmTrackTaskCount(0);
    }
  };

  const handleCreateTrack = async (name: string) => {
    if (!currentProjectId) return;
    await createTrack(name, currentProjectId);
  };

  const handleCreateTask = async (trackId: string, title: string, parentTaskId: string | null) => {
    if (!currentProjectId) return;
    await createTask(trackId, title, parentTaskId, currentProjectId);
  };

  const handleReorderTracks = async (trackId: string, newPosition: number) => {
    if (!currentProjectId) return;
    await reorderTracks(trackId, newPosition, currentProjectId);
  };

  const handleReorderTasks = async (taskId: string, newPosition: number) => {
    if (!currentProjectId) return;
    await reorderTasks(taskId, newPosition, currentProjectId);
  };

  const handleOpenLinkTerminalModal = async () => {
    const success = await loadAvailableWindows();
    if (success) setShowLinkTerminalModal(true);
  };

  const handleLinkTerminalWindow = async (window: GhosttyWindow) => {
    if (!focusTask) return;
    await linkTerminalWindow(window, focusTask.id);
    setShowLinkTerminalModal(false);
  };

  const handleOpenCreateTerminalModal = () => {
    if (!focusTask) return;
    setCreateTerminalTaskId(focusTask.id);
    setShowCreateTerminalModal(true);
  };

  const handleCreateTerminal = async () => {
    if (!createTerminalTaskId) return;

    const task = tasks.find(t => t.id === createTerminalTaskId);
    if (!task) return;

    const session = await createNewTerminal(
      createTerminalTaskId,
      task.title,
      newTerminalWorkingDir || undefined,
      newTerminalInitialCmd || undefined
    );

    if (session && saveAsProjectRoot && newTerminalWorkingDir) {
      // Find the track to get the project_id
      const track = tracks.find(t => t.id === task.track_id);
      if (track) {
        try {
          const { updateProjectRootPath } = await import("@/lib/api");
          await updateProjectRootPath(track.project_id, newTerminalWorkingDir);
        } catch (e) {
          console.error("Failed to update project root path:", e);
        }
      }
    }

    if (session) {
      setShowCreateTerminalModal(false);
      setNewTerminalWorkingDir("");
      setNewTerminalInitialCmd("");
      setSaveAsProjectRoot(false);
      setCreateTerminalTaskId(null);
    }
  };

  const handleSwitchFocusTask = async (taskId: string) => {
    if (!currentProjectId) return;
    await switchFocusTask(currentProjectId, taskId);
    await loadTaskData(currentProjectId);
  };

  // Wrapper functions to inject currentProjectId
  const wrappedUpdateTaskStatus = async (taskId: string, status: Task["status"]) => {
    if (!currentProjectId) return;
    await updateTaskStatus(taskId, status, currentProjectId);
  };

  const wrappedDeleteTask = async (taskId: string) => {
    if (!currentProjectId) return;
    await deleteTask(taskId, currentProjectId);
  };

  const wrappedAdvanceTaskStatus = async (taskId: string, currentStatus: Task["status"]) => {
    if (!currentProjectId) return;
    await advanceTaskStatus(taskId, currentStatus, currentProjectId);
  };

  const wrappedAddDependency = async (taskId: string, blocksTaskId: string) => {
    if (!currentProjectId) return;
    await addDependency(taskId, blocksTaskId, currentProjectId);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        projects={projects}
        currentProjectId={currentProjectId}
        currentView={currentView}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onNavigateToSettings={() => setCurrentView("settings")}
      />

      <div className="flex-1 flex flex-col overflow-y-auto h-full p-6">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-primary">
              {currentView === "settings" ? "Settings" : currentProject?.name || "Bridge"}
            </h1>
            <p className="text-sm text-tertiary">
              {currentView === "settings" ? "Customize your application" : "Parallelization Command Center"}
            </p>
          </div>
          <div className="text-right">
            <Clock />
            {focusTask && (
              <div className="text-sm text-tertiary mt-1">
                Focus: {formatTime(elapsedSeconds)}
              </div>
            )}
          </div>
        </div>

        {currentView !== "settings" && (
          <div className="flex gap-2 mb-6 border-b border-sidebar">
            <button
              onClick={() => setCurrentView("active")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "active"
                  ? "text-accent border-b-2 border-accent"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Active View
            </button>
            <button
              onClick={() => setCurrentView("board")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "board"
                  ? "text-accent border-b-2 border-accent"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Board View
            </button>
            <button
              onClick={() => setCurrentView("terminals")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "terminals"
                  ? "text-accent border-b-2 border-accent"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Terminals
            </button>
            <button
              onClick={() => setCurrentView("retro")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "retro"
                  ? "text-accent border-b-2 border-accent"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Retro
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error border border-error rounded p-4 mb-6 flex items-start justify-between gap-4">
            <p className="text-sm text-primary flex-1">Error: {error}</p>
            <div className="flex gap-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger
                  onClick={() => navigator.clipboard.writeText(error)}
                  className="text-primary hover:opacity-70 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy error message</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setError(null)}
                  className="text-primary hover:opacity-70 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dismiss error</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {currentView === "settings" ? (
          <SettingsView />
        ) : currentView === "retro" ? (
          <RetroView tasks={tasks} tracks={tracks} />
        ) : currentView === "terminals" ? (
          <TerminalsView
            tasks={tasks}
            tracks={tracks}
            terminalSessions={projectTerminalSessions}
            openLinkTerminalModal={handleOpenLinkTerminalModal}
            focusTerminalSession={focusTerminalSession}
            deleteTerminalSession={deleteTerminalSessionFromAllView}
          />
        ) : currentView === "board" ? (
          <BoardView
            tracks={tracks}
            tasks={tasks}
            mainTrack={mainTrack}
            sideTracks={sideTracks}
            getTasksForTrack={getTasksForTrack}
            getSubtasks={getSubtasks}
            hasSubtasks={hasSubtasks}
            onCreateTrack={handleCreateTrack}
            onDeleteTrack={handleDeleteTrack}
            onReorderTracks={handleReorderTracks}
            onCreateTask={handleCreateTask}
            onUpdateTaskStatus={wrappedUpdateTaskStatus}
            onDeleteTask={wrappedDeleteTask}
            onReorderTasks={handleReorderTasks}
            advanceTaskStatus={wrappedAdvanceTaskStatus}
            onOpenBlockModal={setBlockModalTaskId}
          />
        ) : (
          <ActiveView
            tasks={tasks}
            tracks={tracks}
            focusTask={focusTask}
            activeTimer={activeTimer}
            elapsedSeconds={elapsedSeconds}
            formatTime={formatTime}
            onUpdateTaskStatus={wrappedUpdateTaskStatus}
            advanceTaskStatus={wrappedAdvanceTaskStatus}
            switchFocusTask={handleSwitchFocusTask}
            stopCurrentTimer={stopCurrentTimer}
            resumeTimer={resumeTimer}
            terminalSessions={terminalSessions}
            openLinkTerminalModal={handleOpenLinkTerminalModal}
            openCreateTerminalModal={handleOpenCreateTerminalModal}
            focusTerminalSession={focusTerminalSession}
            deleteTerminalSession={(sessionId) => focusTask && deleteTerminalSession(sessionId, focusTask.id)}
          />
        )}
      </div>

      {blockModalTaskId && (
        <BlockTaskModal
          taskId={blockModalTaskId}
          tasks={tasks}
          tracks={tracks}
          dependencies={dependencies}
          onClose={() => setBlockModalTaskId(null)}
          onAddDependency={wrappedAddDependency}
        />
      )}

      {showLinkTerminalModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowLinkTerminalModal(false)}
        >
          <div
            className="bg-tertiary rounded-lg p-6 max-w-md w-full mx-4 border border-border-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary mb-4">Link Ghostty Window</h3>

            {availableWindows.length === 0 ? (
              <div className="text-sm text-quaternary text-center py-6">
                No Ghostty windows found.
                <br />
                Make sure Ghostty is running.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableWindows.map((window) => (
                  <button
                    key={window.id}
                    onClick={() => handleLinkTerminalWindow(window)}
                    className="w-full text-left p-3 bg-secondary hover:bg-quaternary rounded border border-border-secondary hover:border-accent transition-colors"
                  >
                    <div className="text-sm font-medium text-primary">
                      {window.title}
                    </div>
                    <div className="text-xs text-tertiary mt-1">
                      ID: {window.id}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowLinkTerminalModal(false)}
              className="mt-4 w-full px-4 py-2 bg-button-secondary hover:bg-button-secondary-hover text-secondary rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCreateTerminalModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowCreateTerminalModal(false);
            setNewTerminalWorkingDir("");
            setNewTerminalInitialCmd("");
            setCreateTerminalTaskId(null);
          }}
        >
          <div
            className="bg-tertiary rounded-lg p-6 max-w-md w-full mx-4 border border-border-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary mb-4">
              Create New Terminal
              {createTerminalTaskId && tasks.find(t => t.id === createTerminalTaskId) && (
                <span className="text-sm font-normal text-secondary ml-2">
                  for {tasks.find(t => t.id === createTerminalTaskId)?.title}
                </span>
              )}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Working Directory (Optional)
                </label>
                <input
                  type="text"
                  value={newTerminalWorkingDir}
                  onChange={(e) => setNewTerminalWorkingDir(e.target.value)}
                  placeholder="/path/to/directory"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full px-3 py-2 rounded bg-input-bg border border-input-border text-primary focus:outline-none focus:border-accent-primary"
                />
                <p className="text-xs text-tertiary mt-1">
                  Leave empty to use home directory
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-secondary mb-2">
                  <input
                    type="checkbox"
                    checked={saveAsProjectRoot}
                    onChange={(e) => setSaveAsProjectRoot(e.target.checked)}
                    className="w-4 h-4 rounded border-input-border bg-input-bg text-accent-primary focus:ring-accent-primary"
                  />
                  Save as project root path
                </label>
                <p className="text-xs text-tertiary">
                  Use this directory as the default for new terminals in this project
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Initial Command (Optional)
                </label>
                <input
                  type="text"
                  value={newTerminalInitialCmd}
                  onChange={(e) => setNewTerminalInitialCmd(e.target.value)}
                  placeholder="npm run dev"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full px-3 py-2 rounded bg-input-bg border border-input-border text-primary focus:outline-none focus:border-accent-primary"
                />
                <p className="text-xs text-tertiary mt-1">
                  Command to run when terminal opens
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateTerminal}
                className="flex-1 px-4 py-2 rounded bg-accent-primary hover:bg-accent-hover text-white font-medium"
              >
                Create & Link
              </button>
              <button
                onClick={() => {
                  setShowCreateTerminalModal(false);
                  setNewTerminalWorkingDir("");
                  setNewTerminalInitialCmd("");
                  setCreateTerminalTaskId(null);
                }}
                className="px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmProjectId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setDeleteConfirmProjectId(null);
            setDeleteConfirmTaskCount(0);
          }}
        >
          <div
            className="bg-secondary rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4 text-primary">Delete Project</h2>

            {deleteConfirmTaskCount > 0 ? (
              <div>
                <p className="text-secondary mb-4">
                  This project contains <strong>{deleteConfirmTaskCount}</strong> task{deleteConfirmTaskCount !== 1 ? 's' : ''}.
                  All tasks and tracks will be permanently deleted.
                </p>
                <p className="text-error text-sm mb-6">
                  This action cannot be undone.
                </p>
              </div>
            ) : (
              <p className="text-secondary mb-6">
                Are you sure you want to delete this project?
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmProjectId(null);
                  setDeleteConfirmTaskCount(0);
                }}
                className="px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProject}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmTrackId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setDeleteConfirmTrackId(null);
            setDeleteConfirmTrackTaskCount(0);
          }}
        >
          <div
            className="bg-secondary rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4 text-primary">Delete Track</h2>

            {deleteConfirmTrackTaskCount > 0 ? (
              <div>
                <p className="text-secondary mb-4">
                  This track contains <strong>{deleteConfirmTrackTaskCount}</strong> task{deleteConfirmTrackTaskCount !== 1 ? 's' : ''}.
                  All tasks will be permanently deleted.
                </p>
                <p className="text-error text-sm mb-6">
                  This action cannot be undone.
                </p>
              </div>
            ) : (
              <p className="text-secondary mb-6">
                Are you sure you want to delete this track?
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmTrackId(null);
                  setDeleteConfirmTrackTaskCount(0);
                }}
                className="px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTrack}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Delete Track
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
