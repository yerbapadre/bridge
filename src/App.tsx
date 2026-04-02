import { useState, useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePreferences, useKeyboardShortcuts } from "@/hooks";
import { useProjectStore, useTaskStore, useFocusStore, useTerminalStore } from "@/stores";
import { useNoteStore } from "@/stores/noteStore";
import { formatTime } from "@/lib/theme";
import type { GhosttyWindow, Task } from "@/types";
import Sidebar from "@/components/Sidebar";
import Clock from "@/components/Clock";
import Modal from "@/components/Modal";
import CommandPalette from "@/components/CommandPalette";
import SettingsView from "@/views/SettingsView";
import ActiveView from "@/views/ActiveView";
import RetroView from "@/views/RetroView";
import TerminalsView from "@/views/TerminalsView";
import BoardView from "@/views/BoardView";
import NotesView from "@/views/NotesView";
import BlockTaskModal from "@/components/BlockTaskModal";
import NextTaskModal from "@/components/NextTaskModal";

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
  const updateTrackName = useTaskStore(state => state.updateTrackName);
  const reorderTracks = useTaskStore(state => state.reorderTracks);
  const createTask = useTaskStore(state => state.createTask);
  const updateTaskStatus = useTaskStore(state => state.updateTaskStatus);
  const updateTaskDescription = useTaskStore(state => state.updateTaskDescription);
  const updateTaskTitle = useTaskStore(state => state.updateTaskTitle);
  const deleteTask = useTaskStore(state => state.deleteTask);
  const reorderTasks = useTaskStore(state => state.reorderTasks);
  const addDependency = useTaskStore(state => state.addDependency);
  const getTasksForTrack = useTaskStore(state => state.getTasksForTrack);
  const getSubtasks = useTaskStore(state => state.getSubtasks);
  const hasSubtasks = useTaskStore(state => state.hasSubtasks);
  const isTrackComplete = useTaskStore(state => state.isTrackComplete);
  const advanceTaskStatus = useTaskStore(state => state.advanceTaskStatus);
  const loadTaskData = useTaskStore(state => state.loadData);
  const tasksError = useTaskStore(state => state.error);
  const setTasksError = useTaskStore(state => state.setError);

  const focusTask = useFocusStore(state => state.focusTask);
  const activeTimer = useFocusStore(state => state.activeTimer);
  const elapsedSeconds = useFocusStore(state => state.elapsedSeconds);
  const totalTimeSeconds = useFocusStore(state => state.totalTimeSeconds);
  const switchFocusTask = useFocusStore(state => state.switchFocusTask);
  const unfocusTask = useFocusStore(state => state.unfocusTask);
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

  const notes = useNoteStore(state => state.notes);
  const currentNotePath = useNoteStore(state => state.currentNotePath);
  const loadNotes = useNoteStore(state => state.loadNotes);
  const loadNote = useNoteStore(state => state.loadNote);
  const createNote = useNoteStore(state => state.createNote);
  const deleteNote = useNoteStore(state => state.deleteNote);
  const createFolder = useNoteStore(state => state.createFolder);

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
    loadNotes();
  }, [loadNotes]);

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

  const [currentView, setCurrentView] = useState<"board" | "active" | "retro" | "terminals" | "settings" | "notes">("active");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [deleteConfirmTaskCount, setDeleteConfirmTaskCount] = useState(0);
  const [deleteConfirmTrackId, setDeleteConfirmTrackId] = useState<string | null>(null);
  const [deleteConfirmTrackTaskCount, setDeleteConfirmTrackTaskCount] = useState(0);
  const [blockModalTaskId, setBlockModalTaskId] = useState<string | null>(null);
  const [showLinkTerminalModal, setShowLinkTerminalModal] = useState(false);
  const [showCreateTerminalModal, setShowCreateTerminalModal] = useState(false);
  const [createTerminalTaskId, setCreateTerminalTaskId] = useState<string | null>(null);
  const [linkTerminalTaskId, setLinkTerminalTaskId] = useState<string | null>(null);
  const [newTerminalWorkingDir, setNewTerminalWorkingDir] = useState("");
  const [newTerminalInitialCmd, setNewTerminalInitialCmd] = useState("");
  const [saveAsProjectRoot, setSaveAsProjectRoot] = useState(false);
  const [showNextTaskModal, setShowNextTaskModal] = useState(false);

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

  const handleUpdateTrackName = async (trackId: string, name: string) => {
    if (!currentProjectId) return;
    await updateTrackName(trackId, name, currentProjectId);
  };

  const handleCreateTask = async (trackId: string, title: string, parentTaskId: string | null) => {
    if (!currentProjectId) return;
    await createTask(trackId, title, parentTaskId, currentProjectId);
  };

  const handleUpdateTaskTitle = async (taskId: string, title: string) => {
    if (!currentProjectId) return;
    await updateTaskTitle(taskId, title, currentProjectId);
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
    if (success) {
      setLinkTerminalTaskId(focusTask?.id || null);
      setShowLinkTerminalModal(true);
    }
  };

  const handleOpenLinkTerminalModalForTask = async (taskId: string) => {
    const success = await loadAvailableWindows();
    if (success) {
      setLinkTerminalTaskId(taskId);
      setShowLinkTerminalModal(true);
    }
  };

  const handleLinkTerminalWindow = async (window: GhosttyWindow) => {
    const taskId = linkTerminalTaskId || focusTask?.id;
    if (!taskId) return;
    await linkTerminalWindow(window, taskId);
    setShowLinkTerminalModal(false);
    setLinkTerminalTaskId(null);
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

  const handleUnfocusTask = async () => {
    if (!currentProjectId) return;
    await unfocusTask(currentProjectId);
    await loadTaskData(currentProjectId);
  };

  const handleSelectNote = async (path: string) => {
    await loadNote(path);
    setCurrentView("notes");
  };

  const handleCreateNote = async (path: string) => {
    await createNote(path);
    await loadNotes();
  };

  const handleCreateFolder = async (path: string) => {
    await createFolder(path);
    await loadNotes();
  };

  const handleDeleteNote = async (path: string) => {
    await deleteNote(path);
    await loadNotes();
  };

  // Wrapper functions to inject currentProjectId
  const wrappedUpdateTaskStatus = async (taskId: string, status: Task["status"]) => {
    if (!currentProjectId) return;
    await updateTaskStatus(taskId, status, currentProjectId);
    // Reload focus task to reflect status change
    const loadFocusAndTimer = useFocusStore.getState().loadFocusAndTimer;
    await loadFocusAndTimer(currentProjectId);
  };

  const wrappedDeleteTask = async (taskId: string) => {
    if (!currentProjectId) return;
    await deleteTask(taskId, currentProjectId);
  };

  const wrappedAdvanceTaskStatus = async (taskId: string, currentStatus: Task["status"]) => {
    if (!currentProjectId) return;

    // Check if we're completing the currently focused task
    const isCompletingFocusedTask = currentStatus === "in_progress" && focusTask?.id === taskId;

    await advanceTaskStatus(taskId, currentStatus, currentProjectId);
    // Reload focus task to reflect status change
    const loadFocusAndTimer = useFocusStore.getState().loadFocusAndTimer;
    await loadFocusAndTimer(currentProjectId);

    // After completing the focused task, show the next task modal
    if (isCompletingFocusedTask) {
      setShowNextTaskModal(true);
    }
  };

  const wrappedUpdateTaskDescription = async (taskId: string, description: string | null) => {
    if (!currentProjectId) return;
    await updateTaskDescription(taskId, description, currentProjectId);
  };

  const wrappedAddDependency = async (taskId: string, blocksTaskId: string) => {
    if (!currentProjectId) return;
    await addDependency(taskId, blocksTaskId, currentProjectId);
  };

  // Command palette execution handler
  const handleExecuteCommand = useCallback((commandId: string, payload?: any) => {
    // Global commands
    if (commandId === "openCommandPalette") {
      setShowCommandPalette(true);
    } else if (commandId === "toggleSidebar") {
      setSidebarCollapsed(prev => !prev);
    } else if (commandId === "openSettings") {
      setCurrentView("settings");
    } else if (commandId === "closeModal") {
      setShowCommandPalette(false);
      setShowLinkTerminalModal(false);
      setShowCreateTerminalModal(false);
      setBlockModalTaskId(null);
      setShowNextTaskModal(false);
    }

    // Navigation commands
    else if (commandId === "goToActiveView") {
      setCurrentView("active");
    } else if (commandId === "goToBoardView") {
      setCurrentView("board");
    } else if (commandId === "goToTerminalsView") {
      setCurrentView("terminals");
    } else if (commandId === "goToRetroView") {
      setCurrentView("retro");
    } else if (commandId === "goToNotesView") {
      setCurrentView("notes");
    }

    // Project commands
    else if (commandId === "quickSwitchProject") {
      setShowCommandPalette(true);
    } else if (commandId === "newProject") {
      // Trigger sidebar's new project flow - not ideal but works for now
      const event = new CustomEvent("bridge:newProject");
      window.dispatchEvent(event);
    } else if (commandId.startsWith("switchProject:")) {
      const projectId = payload?.projectId;
      if (projectId) {
        handleSelectProject(projectId);
      }
    }

    // Focus task commands
    else if (commandId === "advanceFocusTask" && focusTask) {
      wrappedAdvanceTaskStatus(focusTask.id, focusTask.status);
    } else if (commandId === "markFocusReady" && focusTask) {
      wrappedUpdateTaskStatus(focusTask.id, "ready");
    } else if (commandId === "markFocusInProgress" && focusTask) {
      wrappedUpdateTaskStatus(focusTask.id, "in_progress");
    } else if (commandId === "markFocusDone" && focusTask) {
      wrappedUpdateTaskStatus(focusTask.id, "done");
    } else if (commandId === "markFocusBlocked" && focusTask) {
      wrappedUpdateTaskStatus(focusTask.id, "blocked");
    } else if (commandId.startsWith("switchFocusTask:")) {
      const taskId = payload?.taskId;
      if (taskId) {
        handleSwitchFocusTask(taskId);
      }
    }

    // Timer commands
    else if (commandId === "startTimer" && focusTask && !activeTimer) {
      resumeTimer();
    } else if (commandId === "stopTimer" && activeTimer) {
      stopCurrentTimer();
    }

    // Task commands
    else if (commandId === "newTask") {
      // Trigger appropriate new task flow based on view
      if (currentView === "board" && mainTrack) {
        const event = new CustomEvent("bridge:newTask", { detail: { trackId: mainTrack.id } });
        window.dispatchEvent(event);
      }
    }

    // Terminal commands
    else if (commandId === "createTerminal" && focusTask) {
      handleOpenCreateTerminalModal();
    } else if (commandId === "linkTerminal" && focusTask) {
      handleOpenLinkTerminalModal();
    }

    // Notes commands
    else if (commandId === "newNote") {
      const event = new CustomEvent("bridge:newNote");
      window.dispatchEvent(event);
    } else if (commandId.startsWith("openNote:")) {
      const notePath = payload?.notePath;
      if (notePath) {
        handleSelectNote(notePath);
      }
    }

    // Track commands
    else if (commandId === "newTrack" && currentView === "board") {
      const event = new CustomEvent("bridge:newTrack");
      window.dispatchEvent(event);
    }
  }, [
    currentView,
    focusTask,
    activeTimer,
    mainTrack,
    handleSelectProject,
    wrappedAdvanceTaskStatus,
    wrappedUpdateTaskStatus,
    handleSwitchFocusTask,
    resumeTimer,
    stopCurrentTimer,
    handleOpenCreateTerminalModal,
    handleOpenLinkTerminalModal,
    handleSelectNote
  ]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts([
    // Global
    { keys: ["Cmd", "K"], handler: () => setShowCommandPalette(true) },
    { keys: ["Cmd", "B"], handler: () => setSidebarCollapsed(prev => !prev) },
    { keys: ["Cmd", ","], handler: () => setCurrentView("settings") },
    { keys: ["Escape"], handler: () => handleExecuteCommand("closeModal"), preventDefault: false },

    // Navigation
    { keys: ["1"], handler: () => setCurrentView("active") },
    { keys: ["Cmd", "1"], handler: () => setCurrentView("active") },
    { keys: ["2"], handler: () => setCurrentView("board") },
    { keys: ["Cmd", "2"], handler: () => setCurrentView("board") },
    { keys: ["3"], handler: () => setCurrentView("terminals") },
    { keys: ["Cmd", "3"], handler: () => setCurrentView("terminals") },
    { keys: ["4"], handler: () => setCurrentView("retro") },
    { keys: ["Cmd", "4"], handler: () => setCurrentView("retro") },
    { keys: ["5"], handler: () => setCurrentView("notes") },
    { keys: ["Cmd", "5"], handler: () => setCurrentView("notes") },

    // Project
    { keys: ["Cmd", "P"], handler: () => setShowCommandPalette(true) },
    { keys: ["Cmd", "N"], handler: () => handleExecuteCommand("newProject") },

    // Focus task
    { keys: ["Space"], handler: () => handleExecuteCommand("advanceFocusTask"), condition: () => !!focusTask },
    { keys: ["R"], handler: () => handleExecuteCommand("markFocusReady"), condition: () => !!focusTask },
    { keys: ["I"], handler: () => handleExecuteCommand("markFocusInProgress"), condition: () => !!focusTask },
    { keys: ["Cmd", "Enter"], handler: () => handleExecuteCommand("markFocusDone"), condition: () => !!focusTask },
    { keys: ["B"], handler: () => handleExecuteCommand("markFocusBlocked"), condition: () => !!focusTask },

    // Timer
    { keys: ["T"], handler: () => handleExecuteCommand("startTimer"), condition: () => !!focusTask && !activeTimer },
    { keys: ["Shift", "T"], handler: () => handleExecuteCommand("stopTimer"), condition: () => !!activeTimer },

    // Task
    { keys: ["N"], handler: () => handleExecuteCommand("newTask"), condition: () => !!currentProjectId },

    // Terminal
    { keys: ["Cmd", "T"], handler: () => handleExecuteCommand("createTerminal"), condition: () => !!focusTask },
    { keys: ["Cmd", "Shift", "L"], handler: () => handleExecuteCommand("linkTerminal"), condition: () => !!focusTask },

    // Notes
    { keys: ["Cmd", "Shift", "N"], handler: () => handleExecuteCommand("newNote") },

    // Track
    { keys: ["Cmd", "Shift", "T"], handler: () => handleExecuteCommand("newTrack"), condition: () => currentView === "board" }
  ]);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        projects={projects}
        currentProjectId={currentProjectId}
        currentView={currentView}
        notes={notes}
        currentNotePath={currentNotePath}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onDeleteNote={handleDeleteNote}
        onNavigateToSettings={() => setCurrentView("settings")}
      />

      <div className="flex-1 flex flex-col overflow-y-auto h-full p-6">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-primary">
              {currentView === "settings" ? "Settings" : currentView === "notes" ? "Notes" : currentProject?.name || "Bridge"}
            </h1>
            <p className="text-sm text-tertiary">
              {currentView === "settings" ? "Customize your application" : currentView === "notes" ? "Capture your thoughts" : "Parallelization Command Center"}
            </p>
          </div>
          <div className="text-right">
            <Clock />
            {focusTask && (
              <div className="text-sm text-tertiary mt-1">
                Focus: {formatTime(activeTimer ? elapsedSeconds : totalTimeSeconds)}
              </div>
            )}
          </div>
        </div>

        {currentView !== "settings" && (
          <div className="flex gap-2 mb-6 border-b border-sidebar">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setCurrentView("active")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentView === "active"
                    ? "text-accent border-b-2 border-accent"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Active View
              </TooltipTrigger>
              <TooltipContent>
                <p>Active View (1)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={() => setCurrentView("board")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentView === "board"
                    ? "text-accent border-b-2 border-accent"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Board View
              </TooltipTrigger>
              <TooltipContent>
                <p>Board View (2)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={() => setCurrentView("terminals")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentView === "terminals"
                    ? "text-accent border-b-2 border-accent"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Terminals
              </TooltipTrigger>
              <TooltipContent>
                <p>Terminals View (3)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={() => setCurrentView("retro")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentView === "retro"
                    ? "text-accent border-b-2 border-accent"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Retro
              </TooltipTrigger>
              <TooltipContent>
                <p>Retro View (4)</p>
              </TooltipContent>
            </Tooltip>
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
        ) : currentView === "notes" ? (
          <NotesView />
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
            isTrackComplete={isTrackComplete}
            onCreateTrack={handleCreateTrack}
            onDeleteTrack={handleDeleteTrack}
            onUpdateTrackName={handleUpdateTrackName}
            onReorderTracks={handleReorderTracks}
            onCreateTask={handleCreateTask}
            onUpdateTaskStatus={wrappedUpdateTaskStatus}
            onUpdateTaskTitle={handleUpdateTaskTitle}
            onDeleteTask={wrappedDeleteTask}
            onReorderTasks={handleReorderTasks}
            advanceTaskStatus={wrappedAdvanceTaskStatus}
            onOpenBlockModal={setBlockModalTaskId}
            onOpenLinkTerminalModal={handleOpenLinkTerminalModalForTask}
          />
        ) : (
          <ActiveView
            tasks={tasks}
            tracks={tracks}
            focusTask={focusTask}
            activeTimer={activeTimer}
            elapsedSeconds={elapsedSeconds}
            totalTimeSeconds={totalTimeSeconds}
            formatTime={formatTime}
            onUpdateTaskStatus={wrappedUpdateTaskStatus}
            onUpdateTaskDescription={wrappedUpdateTaskDescription}
            advanceTaskStatus={wrappedAdvanceTaskStatus}
            switchFocusTask={handleSwitchFocusTask}
            unfocusTask={handleUnfocusTask}
            stopCurrentTimer={stopCurrentTimer}
            resumeTimer={resumeTimer}
            openNextTaskModal={() => setShowNextTaskModal(true)}
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
        <Modal isOpen onClose={() => setShowLinkTerminalModal(false)}>
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
        </Modal>
      )}

      {showCreateTerminalModal && (
        <Modal
          isOpen
          onClose={() => {
            setShowCreateTerminalModal(false);
            setNewTerminalWorkingDir("");
            setNewTerminalInitialCmd("");
            setCreateTerminalTaskId(null);
          }}
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
        </Modal>
      )}

      {deleteConfirmProjectId && (
        <Modal
          isOpen
        onClose={() => {
          setDeleteConfirmProjectId(null);
          setDeleteConfirmTaskCount(0);
        }}
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
        </Modal>
      )}

      {showNextTaskModal && (
        <NextTaskModal
          tasks={tasks}
          tracks={tracks}
          onClose={() => setShowNextTaskModal(false)}
          onSelectTask={handleSwitchFocusTask}
        />
      )}

      {deleteConfirmTrackId && (
        <Modal
          isOpen
          onClose={() => {
            setDeleteConfirmTrackId(null);
            setDeleteConfirmTrackTaskCount(0);
          }}
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
        </Modal>
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onExecuteCommand={handleExecuteCommand}
        projects={projects}
        tasks={tasks}
        notes={notes}
        currentView={currentView}
        focusTask={focusTask}
        activeTimer={activeTimer}
        currentProjectId={currentProjectId}
      />
    </div>
  );
}
