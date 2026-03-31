import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects, useTasks, useFocus, useTerminals, usePreferences } from "@/hooks";
import { getStatusBorderColor, formatTime } from "@/lib/theme";
import type { GhosttyWindow } from "@/types";
import SettingsView from "@/views/SettingsView";
import ActiveView from "@/views/ActiveView";
import RetroView from "@/views/RetroView";
import TerminalsView from "@/views/TerminalsView";
import TrackColumn from "@/views/TrackColumn";
import BlockTaskModal from "@/components/BlockTaskModal";

export default function App() {
  usePreferences();

  const {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    createProject,
    updateProject,
    deleteProject,
    getProjectTaskCount,
    error: projectsError,
    setError: setProjectsError,
  } = useProjects();

  const {
    tracks,
    tasks,
    dependencies,
    mainTrack,
    sideTracks,
    createTrack,
    deleteTrack,
    reorderTracks,
    createTask,
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    addDependency,
    getTasksForTrack,
    getSubtasks,
    hasSubtasks,
    advanceTaskStatus,
    loadData,
    error: tasksError,
    setError: setTasksError,
  } = useTasks(currentProjectId);

  const {
    focusTask,
    activeTimer,
    elapsedSeconds,
    switchFocusTask,
    stopCurrentTimer,
    resumeTimer,
    error: focusError,
    setError: setFocusError,
  } = useFocus(tasks);

  const {
    terminalSessions,
    allTerminalSessions,
    availableWindows,
    loadAllTerminalSessions,
    loadAvailableWindows,
    linkTerminalWindow,
    focusTerminalSession,
    deleteTerminalSession,
    deleteTerminalSessionFromAllView,
    error: terminalsError,
    setError: setTerminalsError,
  } = useTerminals(focusTask);

  const [currentView, setCurrentView] = useState<"board" | "active" | "retro" | "terminals" | "settings">("active");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [deleteConfirmTaskCount, setDeleteConfirmTaskCount] = useState(0);
  const [deleteConfirmTrackId, setDeleteConfirmTrackId] = useState<string | null>(null);
  const [deleteConfirmTrackTaskCount, setDeleteConfirmTrackTaskCount] = useState(0);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [blockModalTaskId, setBlockModalTaskId] = useState<string | null>(null);
  const [showLinkTerminalModal, setShowLinkTerminalModal] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const error = projectsError || tasksError || focusError || terminalsError;
  const setError = (e: string | null) => {
    setProjectsError(e);
    setTasksError(e);
    setFocusError(e);
    setTerminalsError(e);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuProjectId(null);
    if (openMenuProjectId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuProjectId]);

  useEffect(() => {
    if (currentView === "terminals") {
      loadAllTerminalSessions();
    }
  }, [currentView]);

  const handleCreateProject = async () => {
    const project = await createProject(newProjectName);
    if (project) {
      setNewProjectName("");
      setIsAddingProject(false);
      setCurrentView("active");
    }
  };

  const handleUpdateProject = async () => {
    if (editingProjectId) {
      const success = await updateProject(editingProjectId, editingProjectName);
      if (success) {
        setEditingProjectId(null);
        setEditingProjectName("");
      }
    }
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

  const handleCreateTrack = async () => {
    const success = await createTrack(newTrackName);
    if (success) setNewTrackName("");
  };

  const handleDeleteTrack = async (trackId: string) => {
    const taskCount = tasks.filter(t => t.track_id === trackId).length;
    setDeleteConfirmTrackId(trackId);
    setDeleteConfirmTrackTaskCount(taskCount);
  };

  const confirmDeleteTrack = async () => {
    if (deleteConfirmTrackId) {
      await deleteTrack(deleteConfirmTrackId);
      setDeleteConfirmTrackId(null);
      setDeleteConfirmTrackTaskCount(0);
    }
  };

  const handleCreateTask = async (trackId: string, parentTaskId: string | null = null) => {
    const success = await createTask(trackId, newTaskTitle, parentTaskId);
    if (success) {
      setNewTaskTitle("");
      setSelectedTrackId(null);
      setSelectedParentTaskId(null);
    }
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

    await reorderTracks(draggedTrackId, targetTrack.position);
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

    await reorderTasks(draggedTaskId, targetTask.position);
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };
  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleOpenLinkTerminalModal = async () => {
    const success = await loadAvailableWindows();
    if (success) setShowLinkTerminalModal(true);
  };

  const handleLinkTerminalWindow = async (window: GhosttyWindow) => {
    if (!focusTask) return;
    const success = await linkTerminalWindow(window, focusTask.id);
    if (success) setShowLinkTerminalModal(false);
  };

  const handleSwitchFocusTask = async (taskId: string) => {
    await switchFocusTask(taskId);
    await loadData();
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`bg-sidebar border-r border-sidebar flex flex-col flex-shrink-0 h-full transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-80"
        }`}
      >
        <div className={`p-4 border-b border-sidebar flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && <h2 className="font-bold text-lg text-primary">Bridge</h2>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`text-tertiary hover:text-secondary transition-colors ${sidebarCollapsed ? 'text-xl' : 'text-sm'}`}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        {sidebarCollapsed ? (
          <div className="flex-1"></div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-tertiary hover:text-secondary flex items-center justify-between gap-2"
              >
                <span>PROJECTS</span>
                <span>{projectsExpanded ? "▼" : "▶"}</span>
              </button>

              {projectsExpanded && (
                <div className="mt-1 ml-2">
                  {projects.map((project) => (
                    editingProjectId === project.id ? (
                      <div key={project.id} className="flex gap-2 px-2 py-1 mb-1">
                        <input
                          type="text"
                          value={editingProjectName}
                          onChange={(e) => setEditingProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateProject();
                            if (e.key === "Escape") {
                              setEditingProjectId(null);
                              setEditingProjectName("");
                            }
                          }}
                          onBlur={() => {
                            if (editingProjectName.trim()) {
                              handleUpdateProject();
                            } else {
                              setEditingProjectId(null);
                              setEditingProjectName("");
                            }
                          }}
                          autoFocus
                          className="flex-1 bg-tertiary border border-border-primary rounded px-2 py-1 text-sm text-primary"
                        />
                      </div>
                    ) : (
                      <div key={project.id} className="group relative mb-1">
                        <button
                          onClick={() => {
                            setCurrentProjectId(project.id);
                            if (currentView === "settings") {
                              setCurrentView("active");
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                            currentProjectId === project.id && currentView !== "settings"
                              ? "bg-accent font-medium"
                              : "text-secondary hover:bg-button-secondary"
                          }`}
                        >
                          <span>{project.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id);
                            }}
                            className="text-tertiary hover:text-secondary text-sm px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="More options"
                          >
                            ⋯
                          </button>
                        </button>
                        {openMenuProjectId === project.id && (
                          <div className="absolute right-2 top-10 bg-button-secondary border border-sidebar rounded shadow-lg z-10 min-w-[150px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(project.id);
                                setEditingProjectName(project.name);
                                setOpenMenuProjectId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-secondary"
                            >
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                                setOpenMenuProjectId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-error"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ))}

                  {isAddingProject ? (
                    <div className="flex gap-2 px-3 py-2">
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateProject();
                          if (e.key === "Escape") {
                            setIsAddingProject(false);
                            setNewProjectName("");
                          }
                        }}
                        onBlur={() => {
                          if (!newProjectName.trim()) {
                            setIsAddingProject(false);
                          }
                        }}
                        placeholder="Project name..."
                        autoFocus
                        className="flex-1 bg-input border border-input rounded px-2 py-1 text-sm text-primary"
                      />
                      <button
                        onClick={handleCreateProject}
                        className="bg-accent px-2 py-1 rounded text-xs"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingProject(true)}
                      className="w-full text-left px-3 py-2 rounded text-sm text-tertiary hover:text-secondary hover:bg-button-secondary"
                    >
                      + New Project
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-sidebar p-2">
          <button
            onClick={() => setCurrentView("settings")}
            className={`w-full px-3 py-2 rounded transition-colors ${
              sidebarCollapsed ? 'text-center' : 'text-left flex items-center gap-2'
            } ${
              currentView === "settings"
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            {sidebarCollapsed ? (
              <span className="text-2xl">⚙</span>
            ) : (
              <>
                <span className="text-2xl">⚙</span>
                <span className="text-sm">Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto h-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-primary">
            {currentView === "settings" ? "Settings" : currentProject?.name || "Bridge"}
          </h1>
          <p className="text-sm text-tertiary">
            {currentView === "settings" ? "Customize your application" : "Parallelization Command Center"}
          </p>
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
              onClick={() => setCurrentView("retro")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "retro"
                  ? "text-accent border-b-2 border-accent"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Retro
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
            terminalSessions={allTerminalSessions}
            openLinkTerminalModal={handleOpenLinkTerminalModal}
            focusTerminalSession={focusTerminalSession}
            deleteTerminalSession={deleteTerminalSessionFromAllView}
          />
        ) : currentView === "board" ? (
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

            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {mainTrack && (
                <TrackColumn
                  track={mainTrack}
                  tasks={getTasksForTrack(mainTrack.id)}
                  onDeleteTrack={handleDeleteTrack}
                  onCreateTask={handleCreateTask}
                  onUpdateTaskStatus={updateTaskStatus}
                  onDeleteTask={deleteTask}
                  advanceTaskStatus={advanceTaskStatus}
                  getStatusBorderColor={getStatusBorderColor}
                  getSubtasks={getSubtasks}
                  hasSubtasks={hasSubtasks}
                  collapsedTasks={collapsedTasks}
                  toggleTaskCollapsed={toggleTaskCollapsed}
                  selectedTrackId={selectedTrackId}
                  setSelectedTrackId={setSelectedTrackId}
                  selectedParentTaskId={selectedParentTaskId}
                  setSelectedParentTaskId={setSelectedParentTaskId}
                  newTaskTitle={newTaskTitle}
                  setNewTaskTitle={setNewTaskTitle}
                  onOpenBlockModal={setBlockModalTaskId}
                  onTrackDragStart={handleTrackDragStart}
                  onTrackDragOver={handleTrackDragOver}
                  onTrackDragLeave={handleTrackDragLeave}
                  onTrackDrop={handleTrackDrop}
                  onTrackDragEnd={handleTrackDragEnd}
                  isDragging={draggedTrackId === mainTrack.id}
                  isDragOver={dragOverTrackId === mainTrack.id}
                  onTaskDragStart={handleTaskDragStart}
                  onTaskDragOver={handleTaskDragOver}
                  onTaskDragLeave={handleTaskDragLeave}
                  onTaskDrop={handleTaskDrop}
                  onTaskDragEnd={handleTaskDragEnd}
                  draggedTaskId={draggedTaskId}
                  dragOverTaskId={dragOverTaskId}
                />
              )}

              {sideTracks.map((track) => (
                <TrackColumn
                  key={track.id}
                  track={track}
                  tasks={getTasksForTrack(track.id)}
                  onDeleteTrack={handleDeleteTrack}
                  onCreateTask={handleCreateTask}
                  onUpdateTaskStatus={updateTaskStatus}
                  onDeleteTask={deleteTask}
                  advanceTaskStatus={advanceTaskStatus}
                  getStatusBorderColor={getStatusBorderColor}
                  getSubtasks={getSubtasks}
                  hasSubtasks={hasSubtasks}
                  collapsedTasks={collapsedTasks}
                  toggleTaskCollapsed={toggleTaskCollapsed}
                  selectedTrackId={selectedTrackId}
                  setSelectedTrackId={setSelectedTrackId}
                  selectedParentTaskId={selectedParentTaskId}
                  setSelectedParentTaskId={setSelectedParentTaskId}
                  newTaskTitle={newTaskTitle}
                  setNewTaskTitle={setNewTaskTitle}
                  onOpenBlockModal={setBlockModalTaskId}
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
        ) : (
          <ActiveView
            tasks={tasks}
            tracks={tracks}
            focusTask={focusTask}
            activeTimer={activeTimer}
            elapsedSeconds={elapsedSeconds}
            formatTime={formatTime}
            onUpdateTaskStatus={updateTaskStatus}
            advanceTaskStatus={advanceTaskStatus}
            switchFocusTask={handleSwitchFocusTask}
            stopCurrentTimer={stopCurrentTimer}
            resumeTimer={resumeTimer}
            terminalSessions={terminalSessions}
            openLinkTerminalModal={handleOpenLinkTerminalModal}
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
          onAddDependency={addDependency}
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
