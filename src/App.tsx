import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  created_at: number;
  updated_at: number;
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

interface TaskDependency {
  id: string;
  task_id: string;
  blocks_task_id: string;
  created_at: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-expect-error - TimeLog interface reserved for future time tracking feature
interface TimeLog {
  id: string;
  task_id: string;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number | null;
}

interface ActiveTimer {
  task_id: string;
  started_at: number;
}

interface TerminalSession {
  id: string;
  task_id: string;
  terminal_app: string;
  terminal_uuid: string | null;
  window_title: string | null;
  working_dir: string | null;
  created_at: number;
  last_focused_at: number | null;
}

interface GhosttyWindow {
  id: string;
  title: string;
  working_dir: string | null;
}

interface ColorPreferences {
  status_blocked: string;
  status_ready: string;
  status_in_progress: string;
  status_done: string;
  bg_primary: string;
  bg_secondary: string;
  bg_tertiary: string;
  bg_quaternary: string;
  text_primary: string;
  text_secondary: string;
  text_tertiary: string;
  text_quaternary: string;
  border_primary: string;
  border_secondary: string;
  accent_primary: string;
  accent_hover: string;
  accent_star: string;
  sidebar_bg: string;
  sidebar_border: string;
  input_bg: string;
  input_border: string;
  button_secondary: string;
  button_secondary_hover: string;
}

interface UserPreferences {
  colors: ColorPreferences;
}

interface SavedTheme {
  id: string;
  name: string;
  colors: ColorPreferences;
  created_at: number;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTrackName, setNewTrackName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<"board" | "active" | "retro" | "terminals" | "settings">("active");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [blockModalTaskId, setBlockModalTaskId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);
  const [deleteConfirmTaskCount, setDeleteConfirmTaskCount] = useState(0);
  const [deleteConfirmTrackId, setDeleteConfirmTrackId] = useState<string | null>(null);
  const [deleteConfirmTrackTaskCount, setDeleteConfirmTrackTaskCount] = useState(0);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);

  // Drag state for tracks
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);

  // Drag state for tasks
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Focus and Timer state
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerInterval, setTimerInterval] = useState<number | null>(null);

  // Terminal session state
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [allTerminalSessions, setAllTerminalSessions] = useState<TerminalSession[]>([]);
  const [showLinkTerminalModal, setShowLinkTerminalModal] = useState(false);
  const [availableWindows, setAvailableWindows] = useState<GhosttyWindow[]>([]);

  const loadProjects = async () => {
    try {
      const projectsData = await invoke<Project[]>("get_projects");
      setProjects(projectsData);
      if (projectsData.length > 0 && !currentProjectId) {
        setCurrentProjectId(projectsData[0].id);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const loadAndApplyPreferences = async () => {
    try {
      const prefs = await invoke<UserPreferences>("get_preferences");
      const colors = prefs.colors;

      // Apply colors to CSS variables
      document.documentElement.style.setProperty("--color-status-blocked", colors.status_blocked);
      document.documentElement.style.setProperty("--color-status-ready", colors.status_ready);
      document.documentElement.style.setProperty("--color-status-in-progress", colors.status_in_progress);
      document.documentElement.style.setProperty("--color-status-done", colors.status_done);
      document.documentElement.style.setProperty("--color-bg-primary", colors.bg_primary);
      document.documentElement.style.setProperty("--color-bg-secondary", colors.bg_secondary);
      document.documentElement.style.setProperty("--color-bg-tertiary", colors.bg_tertiary);
      document.documentElement.style.setProperty("--color-bg-quaternary", colors.bg_quaternary);
      document.documentElement.style.setProperty("--color-text-primary", colors.text_primary);
      document.documentElement.style.setProperty("--color-text-secondary", colors.text_secondary);
      document.documentElement.style.setProperty("--color-text-tertiary", colors.text_tertiary);
      document.documentElement.style.setProperty("--color-text-quaternary", colors.text_quaternary);
      document.documentElement.style.setProperty("--color-border-primary", colors.border_primary);
      document.documentElement.style.setProperty("--color-border-secondary", colors.border_secondary);
      document.documentElement.style.setProperty("--color-accent-primary", colors.accent_primary);
      document.documentElement.style.setProperty("--color-accent-hover", colors.accent_hover);
      document.documentElement.style.setProperty("--color-accent-star", colors.accent_star);
      document.documentElement.style.setProperty("--color-sidebar-bg", colors.sidebar_bg);
      document.documentElement.style.setProperty("--color-sidebar-border", colors.sidebar_border);
      document.documentElement.style.setProperty("--color-input-bg", colors.input_bg);
      document.documentElement.style.setProperty("--color-input-border", colors.input_border);
      document.documentElement.style.setProperty("--color-button-secondary", colors.button_secondary);
      document.documentElement.style.setProperty("--color-button-secondary-hover", colors.button_secondary_hover);
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  };

  const loadData = async () => {
    if (!currentProjectId) return;

    try {
      const [tracksData, tasksData, dependenciesData] = await Promise.all([
        invoke<Track[]>("get_tracks", { projectId: currentProjectId }),
        invoke<Task[]>("get_tasks", { trackId: null }),
        invoke<TaskDependency[]>("get_dependencies", { taskId: null }),
      ]);
      setTracks(tracksData);
      setTasks(tasksData);
      setDependencies(dependenciesData);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    loadProjects();
    loadAndApplyPreferences();
    loadFocusAndTimer();
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      loadData();
    }
  }, [currentProjectId]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuProjectId(null);
    };
    if (openMenuProjectId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuProjectId]);

  // Timer interval effect
  useEffect(() => {
    if (activeTimer) {
      startTimerInterval();
    } else {
      stopTimerInterval();
    }

    return () => {
      stopTimerInterval();
    };
  }, [activeTimer]);

  // Update focus task when tasks reload
  useEffect(() => {
    const currentFocus = tasks.find((t) => t.is_current_focus);
    if (currentFocus) {
      setFocusTask(currentFocus);
    }
  }, [tasks]);

  // Load terminal sessions when focus task changes
  useEffect(() => {
    if (focusTask) {
      loadTerminalSessions(focusTask.id);
    } else {
      setTerminalSessions([]);
    }
  }, [focusTask]);

  // Load all terminal sessions when viewing the terminals page
  useEffect(() => {
    if (currentView === "terminals") {
      loadAllTerminalSessions();
    }
  }, [currentView]);

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const newProject = await invoke<Project>("create_project", {
        input: {
          name: newProjectName,
          description: null,
          color: null,
        },
      });
      setNewProjectName("");
      setIsAddingProject(false);
      await loadProjects();
      setCurrentProjectId(newProject.id);
      setCurrentView("active");
    } catch (e) {
      setError(String(e));
    }
  };

  const startEditingProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const saveProjectName = async () => {
    if (!editingProjectId || !editingProjectName.trim()) return;

    try {
      await invoke("update_project", {
        id: editingProjectId,
        name: editingProjectName,
        description: null,
        color: null,
      });
      await loadProjects();
      setEditingProjectId(null);
      setEditingProjectName("");
    } catch (e) {
      setError(String(e));
    }
  };

  const startDeleteProject = async (projectId: string) => {
    try {
      const taskCount = await invoke<number>("get_project_task_count", { projectId });
      setDeleteConfirmProjectId(projectId);
      setDeleteConfirmTaskCount(taskCount);
    } catch (e) {
      setError(String(e));
    }
  };

  const confirmDeleteProject = async () => {
    if (!deleteConfirmProjectId) return;

    try {
      await invoke("delete_project", { id: deleteConfirmProjectId });
      if (currentProjectId === deleteConfirmProjectId) {
        setCurrentProjectId(null);
      }
      await loadProjects();
      setDeleteConfirmProjectId(null);
      setDeleteConfirmTaskCount(0);
    } catch (e) {
      setError(String(e));
    }
  };

  const createTrack = async () => {
    if (!newTrackName.trim() || !currentProjectId) return;

    const hasMain = tracks.some((t) => t.type === "main");
    const trackType = hasMain ? "side" : "main";

    try {
      await invoke("create_track", {
        input: {
          project_id: currentProjectId,
          name: newTrackName,
          type: trackType,
          color: null,
        },
      });
      setNewTrackName("");
      loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const createTask = async (trackId: string, parentTaskId: string | null = null) => {
    if (!newTaskTitle.trim()) return;

    try {
      await invoke("create_task", {
        input: {
          track_id: trackId,
          title: newTaskTitle,
          description: null,
          parent_task_id: parentTaskId,
        },
      });
      setNewTaskTitle("");
      setSelectedTrackId(null);
      setSelectedParentTaskId(null);
      loadData();
    } catch (e) {
      setError(String(e));
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

  const getNextStatus = (currentStatus: Task["status"]): Task["status"] | null => {
    switch (currentStatus) {
      case "blocked":
        return "ready";
      case "ready":
        return "in_progress";
      case "in_progress":
        return "done";
      case "done":
        return null;
      default:
        return null;
    }
  };

  const advanceTaskStatus = async (taskId: string, currentStatus: Task["status"]) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      await updateTaskStatus(taskId, nextStatus);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      await invoke("update_task", {
        id: taskId,
        input: { status: newStatus },
      });
      await invoke("auto_update_task_statuses");
      loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await invoke("delete_task", { id: taskId });
      loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const addBlockingDependency = async (taskId: string, blocksTaskId: string) => {
    try {
      await invoke("add_dependency", { taskId, blocksTaskId });
      await invoke("auto_update_task_statuses");
      loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const startDeleteTrack = async (trackId: string) => {
    const taskCount = tasks.filter(t => t.track_id === trackId).length;
    setDeleteConfirmTrackId(trackId);
    setDeleteConfirmTrackTaskCount(taskCount);
  };

  const confirmDeleteTrack = async () => {
    if (!deleteConfirmTrackId) return;

    try {
      await invoke("delete_track", { id: deleteConfirmTrackId });
      setDeleteConfirmTrackId(null);
      setDeleteConfirmTrackTaskCount(0);
      loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleTrackDragStart = (trackId: string, trackType: string) => {
    console.log("Track drag start:", { trackId, trackType });
    setDraggedTrackId(trackId);
  };

  const handleTrackDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    console.log("Track drag over:", trackId);
    setDragOverTrackId(trackId);
  };

  const handleTrackDragLeave = () => {
    setDragOverTrackId(null);
  };

  const handleTrackDrop = async (e: React.DragEvent, targetTrackId: string) => {
    e.preventDefault();

    console.log("Track drop:", { draggedTrackId, targetTrackId, currentProjectId });

    if (!draggedTrackId || !currentProjectId) return;

    const draggedTrack = tracks.find((t) => t.id === draggedTrackId);
    const targetTrack = tracks.find((t) => t.id === targetTrackId);

    console.log("Tracks found:", { draggedTrack, targetTrack });

    if (!draggedTrack || !targetTrack) return;
    if (draggedTrack.id === targetTrack.id) return;

    try {
      console.log("Calling reorder_tracks with:", {
        projectId: currentProjectId,
        trackId: draggedTrackId,
        newPosition: targetTrack.position,
      });
      await invoke("reorder_tracks", {
        projectId: currentProjectId,
        trackId: draggedTrackId,
        newPosition: targetTrack.position,
      });
      console.log("Reorder successful, loading data...");
      await loadData();
    } catch (e) {
      console.error("Reorder error:", e);
      setError(String(e));
    } finally {
      setDraggedTrackId(null);
      setDragOverTrackId(null);
    }
  };

  const handleTrackDragEnd = () => {
    setDraggedTrackId(null);
    setDragOverTrackId(null);
  };

  const handleTaskDragStart = (taskId: string) => {
    console.log("Task drag start:", taskId);
    setDraggedTaskId(taskId);
  };

  const handleTaskDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    console.log("Task drag over:", targetTaskId);

    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const draggedTask = tasks.find((t) => t.id === draggedTaskId);
    const targetTask = tasks.find((t) => t.id === targetTaskId);

    if (!draggedTask || !targetTask) return;
    if (draggedTask.track_id !== targetTask.track_id) return;
    if (draggedTask.parent_task_id !== targetTask.parent_task_id) return;

    setDragOverTaskId(targetTaskId);
  };

  const handleTaskDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("Task drop:", { draggedTaskId, targetTaskId });

    if (!draggedTaskId) return;

    const draggedTask = tasks.find((t) => t.id === draggedTaskId);
    const targetTask = tasks.find((t) => t.id === targetTaskId);

    console.log("Tasks found:", { draggedTask, targetTask });

    if (!draggedTask || !targetTask) return;
    if (draggedTask.id === targetTask.id) return;
    if (draggedTask.track_id !== targetTask.track_id) return;
    if (draggedTask.parent_task_id !== targetTask.parent_task_id) return;

    try {
      console.log("Calling reorder_tasks with:", {
        taskId: draggedTaskId,
        newPosition: targetTask.position,
      });
      await invoke("reorder_tasks", {
        taskId: draggedTaskId,
        newPosition: targetTask.position,
      });
      console.log("Reorder successful, loading data...");
      await loadData();
    } catch (e) {
      console.error("Reorder error:", e);
      setError(String(e));
    } finally {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
    }
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  // Focus and Timer Management
  const loadFocusAndTimer = async () => {
    try {
      const [focusTaskData, activeTimerData] = await Promise.all([
        invoke<Task | null>("get_focus_task"),
        invoke<ActiveTimer | null>("get_active_timer"),
      ]);

      if (focusTaskData) {
        setFocusTask(focusTaskData);
      }

      if (activeTimerData) {
        setActiveTimer(activeTimerData);
        const now = Math.floor(Date.now() / 1000);
        setElapsedSeconds(now - activeTimerData.started_at);
      }
    } catch (e) {
      console.error("Failed to load focus and timer:", e);
    }
  };

  const switchFocusTask = async (taskId: string) => {
    try {
      // Stop timer on current focus task if running
      if (activeTimer && focusTask) {
        await invoke("stop_timer", { taskId: focusTask.id });
        stopTimerInterval();
      }

      // Set new focus task
      const newFocusTask = await invoke<Task>("set_focus_task", { taskId });
      setFocusTask(newFocusTask);

      // Start timer on new task
      const newTimer = await invoke<ActiveTimer>("start_timer", { taskId });
      setActiveTimer(newTimer);
      setElapsedSeconds(0);
      startTimerInterval();

      // Reload tasks to update is_current_focus flags
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const stopCurrentTimer = async () => {
    if (!activeTimer || !focusTask) return;

    try {
      await invoke("stop_timer", { taskId: focusTask.id });
      setActiveTimer(null);
      setElapsedSeconds(0);
      stopTimerInterval();
    } catch (e) {
      setError(String(e));
    }
  };

  const resumeTimer = async () => {
    if (!focusTask || activeTimer) return;

    try {
      const newTimer = await invoke<ActiveTimer>("start_timer", { taskId: focusTask.id });
      setActiveTimer(newTimer);
      setElapsedSeconds(0);
      startTimerInterval();
    } catch (e) {
      setError(String(e));
    }
  };

  const startTimerInterval = () => {
    if (timerInterval) clearInterval(timerInterval);
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    setTimerInterval(id);
  };

  const stopTimerInterval = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Terminal Session Management
  const loadTerminalSessions = async (taskId: string) => {
    try {
      const sessions = await invoke<TerminalSession[]>("get_terminal_sessions", { taskId });
      setTerminalSessions(sessions);
    } catch (e) {
      console.error("Failed to load terminal sessions:", e);
    }
  };

  const loadAllTerminalSessions = async () => {
    try {
      const sessions = await invoke<TerminalSession[]>("get_all_terminal_sessions");
      setAllTerminalSessions(sessions);
    } catch (e) {
      console.error("Failed to load all terminal sessions:", e);
    }
  };

  const openLinkTerminalModal = async () => {
    try {
      const windows = await invoke<GhosttyWindow[]>("list_ghostty_windows");
      setAvailableWindows(windows);
      setShowLinkTerminalModal(true);
    } catch (e) {
      setError(String(e));
    }
  };

  const linkTerminalWindow = async (window: GhosttyWindow) => {
    if (!focusTask) return;

    try {
      await invoke("create_terminal_session", {
        input: {
          task_id: focusTask.id,
          terminal_app: "ghostty",
          terminal_uuid: window.id,
          window_title: window.title,
          working_dir: window.working_dir,
        },
      });
      setShowLinkTerminalModal(false);
      await loadTerminalSessions(focusTask.id);
    } catch (e) {
      setError(String(e));
    }
  };

  const focusTerminalSession = async (session: TerminalSession) => {
    if (!session.window_title) return;

    try {
      await invoke("focus_ghostty_window", { windowTitle: session.window_title });
      await invoke("update_terminal_session_focus", { id: session.id });
      await loadTerminalSessions(session.task_id);
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteTerminalSessionHandler = async (sessionId: string) => {
    if (!focusTask) return;

    try {
      await invoke("delete_terminal_session", { id: sessionId });
      await loadTerminalSessions(focusTask.id);
      await loadAllTerminalSessions(); // Also reload all sessions
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteTerminalSessionFromAllView = async (sessionId: string) => {
    try {
      await invoke("delete_terminal_session", { id: sessionId });
      await loadAllTerminalSessions();
    } catch (e) {
      setError(String(e));
    }
  };

  const getTasksForTrack = (trackId: string) => {
    return tasks
      .filter((t) => t.track_id === trackId && t.parent_task_id === null)
      .sort((a, b) => a.position - b.position);
  };

  const getSubtasks = (parentId: string) => {
    return tasks
      .filter((t) => t.parent_task_id === parentId)
      .sort((a, b) => a.position - b.position);
  };

  const hasSubtasks = (taskId: string) => {
    return tasks.some((t) => t.parent_task_id === taskId);
  };

  const getStatusBorderColor = (status: Task["status"]) => {
    switch (status) {
      case "blocked":
        return "border-status-blocked";
      case "ready":
        return "border-status-ready";
      case "in_progress":
        return "border-status-in-progress";
      case "done":
        return "border-status-done";
    }
  };

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const mainTrack = tracks.find((t) => t.type === "main");
  const sideTracks = tracks.filter((t) => t.type === "side");

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
            {/* Projects Section */}
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
                            if (e.key === "Enter") saveProjectName();
                            if (e.key === "Escape") {
                              setEditingProjectId(null);
                              setEditingProjectName("");
                            }
                          }}
                          onBlur={() => {
                            if (editingProjectName.trim()) {
                              saveProjectName();
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
                                startEditingProject(project);
                                setOpenMenuProjectId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-secondary"
                            >
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startDeleteProject(project.id);
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
                          if (e.key === "Enter") createProject();
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
                        onClick={createProject}
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
                  onClick={() => {
                    navigator.clipboard.writeText(error);
                  }}
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
          <RetroView
            tasks={tasks}
            tracks={tracks}
          />
        ) : currentView === "terminals" ? (
          <TerminalsView
            tasks={tasks}
            tracks={tracks}
            terminalSessions={allTerminalSessions}
            openLinkTerminalModal={openLinkTerminalModal}
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
                onKeyDown={(e) => e.key === "Enter" && createTrack()}
                placeholder={`New ${tracks.length === 0 ? "main" : "side"} track name...`}
                className="flex-1 bg-input border border-input rounded px-3 py-2 text-sm text-primary"
              />
              <button
                onClick={createTrack}
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
            onDeleteTrack={startDeleteTrack}
            onCreateTask={createTask}
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
            onDeleteTrack={startDeleteTrack}
            onCreateTask={createTask}
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
          switchFocusTask={switchFocusTask}
          stopCurrentTimer={stopCurrentTimer}
          resumeTimer={resumeTimer}
          terminalSessions={terminalSessions}
          openLinkTerminalModal={openLinkTerminalModal}
          focusTerminalSession={focusTerminalSession}
          deleteTerminalSession={deleteTerminalSessionHandler}
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
          onAddDependency={addBlockingDependency}
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
                    onClick={() => linkTerminalWindow(window)}
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

interface SettingsViewProps {}

function SettingsView({}: SettingsViewProps) {
  const [settingsView, setSettingsView] = useState<"appearance" | "customize">("appearance");

  return (
    <div className="flex-1 flex gap-6">
      {/* Settings Sidebar */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          <button
            onClick={() => setSettingsView("appearance")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "appearance"
                ? "bg-accent text-primary font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setSettingsView("customize")}
            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
              settingsView === "customize"
                ? "bg-accent text-primary font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            Customize
          </button>
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1">
        {settingsView === "appearance" ? (
          <AppearanceSettings />
        ) : (
          <CustomizeSettings />
        )}
      </div>
    </div>
  );
}

interface AppearanceSettingsProps {}

function AppearanceSettings({}: AppearanceSettingsProps) {
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [currentColors, setCurrentColors] = useState<ColorPreferences | null>(null);

  useEffect(() => {
    loadThemes();
    loadCurrentPreferences();
  }, []);

  const loadThemes = async () => {
    try {
      const themesData = await invoke<SavedTheme[]>("get_themes");
      setThemes(themesData);
    } catch (e) {
      console.error("Failed to load themes:", e);
    }
  };

  const loadCurrentPreferences = async () => {
    try {
      const prefs = await invoke<UserPreferences>("get_preferences");
      setCurrentColors(prefs.colors);
    } catch (e) {
      console.error("Failed to load current preferences:", e);
    }
  };

  const isThemeActive = (theme: SavedTheme): boolean => {
    if (!currentColors) return false;
    return JSON.stringify(theme.colors) === JSON.stringify(currentColors);
  };

  const applyTheme = async (theme: SavedTheme) => {
    const colors = theme.colors;

    // Apply colors to CSS variables
    document.documentElement.style.setProperty("--color-status-blocked", colors.status_blocked);
    document.documentElement.style.setProperty("--color-status-ready", colors.status_ready);
    document.documentElement.style.setProperty("--color-status-in-progress", colors.status_in_progress);
    document.documentElement.style.setProperty("--color-status-done", colors.status_done);
    document.documentElement.style.setProperty("--color-bg-primary", colors.bg_primary);
    document.documentElement.style.setProperty("--color-bg-secondary", colors.bg_secondary);
    document.documentElement.style.setProperty("--color-bg-tertiary", colors.bg_tertiary);
    document.documentElement.style.setProperty("--color-bg-quaternary", colors.bg_quaternary);
    document.documentElement.style.setProperty("--color-text-primary", colors.text_primary);
    document.documentElement.style.setProperty("--color-text-secondary", colors.text_secondary);
    document.documentElement.style.setProperty("--color-text-tertiary", colors.text_tertiary);
    document.documentElement.style.setProperty("--color-text-quaternary", colors.text_quaternary);
    document.documentElement.style.setProperty("--color-border-primary", colors.border_primary);
    document.documentElement.style.setProperty("--color-border-secondary", colors.border_secondary);
    document.documentElement.style.setProperty("--color-accent-primary", colors.accent_primary);
    document.documentElement.style.setProperty("--color-accent-hover", colors.accent_hover);
    document.documentElement.style.setProperty("--color-accent-star", colors.accent_star);
    document.documentElement.style.setProperty("--color-sidebar-bg", colors.sidebar_bg);
    document.documentElement.style.setProperty("--color-sidebar-border", colors.sidebar_border);
    document.documentElement.style.setProperty("--color-input-bg", colors.input_bg);
    document.documentElement.style.setProperty("--color-input-border", colors.input_border);
    document.documentElement.style.setProperty("--color-button-secondary", colors.button_secondary);
    document.documentElement.style.setProperty("--color-button-secondary-hover", colors.button_secondary_hover);

    // Update local state
    setCurrentColors(colors);

    try {
      await invoke("save_preferences_command", {
        prefs: { colors: theme.colors },
      });
    } catch (e) {
      console.error("Failed to save preferences:", e);
    }
  };

  const deleteTheme = async (id: string) => {
    if (!confirm("Delete this theme?")) return;

    try {
      await invoke("delete_theme", { id });
      await loadThemes();
    } catch (e) {
      console.error("Failed to delete theme:", e);
    }
  };

  const exportTheme = (theme: SavedTheme) => {
    const dataStr = JSON.stringify({ name: theme.name, colors: theme.colors }, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${theme.name.replace(/\s+/g, "-").toLowerCase()}-theme.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.name || !data.colors) {
          alert("Invalid theme file format");
          return;
        }

        await invoke<SavedTheme>("save_theme", {
          input: { name: data.name, colors: data.colors },
        });
        await loadThemes();
      } catch (e) {
        console.error("Failed to import theme:", e);
        alert("Failed to import theme: " + e);
      }
    };
    input.click();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-primary">Appearance</h2>
        <p className="text-sm text-tertiary mb-4">Choose a preset theme or apply your custom themes</p>
        <button
          onClick={importTheme}
          className="px-4 py-2 bg-button-secondary hover:bg-button-secondary-hover text-secondary rounded text-sm transition-colors"
        >
          Import Theme
        </button>
      </div>

      {themes.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p>No themes available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const isActive = isThemeActive(theme);
            return (
              <div
                key={theme.id}
                className={`bg-tertiary border rounded-lg p-4 transition-colors relative ${
                  isActive
                    ? "border-accent ring-2 ring-accent ring-opacity-50"
                    : "border-border-primary hover:border-accent"
                }`}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 bg-accent text-primary text-xs font-semibold px-2 py-1 rounded">
                    Active
                  </div>
                )}

                <h3 className="text-lg font-semibold mb-3 text-primary pr-16">{theme.name}</h3>

                {/* Color Preview */}
                <div className="mb-4 grid grid-cols-3 grid-rows-2 gap-1 h-20 rounded overflow-hidden">
                  <div style={{ backgroundColor: `rgb(${theme.colors.bg_primary})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.accent_primary})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.status_in_progress})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.status_ready})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.sidebar_bg})` }} />
                  <div style={{ backgroundColor: `rgb(${theme.colors.text_primary})` }} />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => applyTheme(theme)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-button-secondary text-tertiary cursor-default"
                        : "bg-accent hover:bg-accent-hover text-primary"
                    }`}
                    disabled={isActive}
                  >
                    {isActive ? "Applied" : "Apply"}
                  </button>
                <button
                  onClick={() => exportTheme(theme)}
                  className="px-3 py-2 bg-button-secondary hover:bg-button-secondary-hover text-secondary rounded text-sm transition-colors"
                  title="Export theme"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteTheme(theme.id)}
                  className="px-3 py-2 bg-button-secondary hover:bg-button-secondary-hover text-error rounded text-sm transition-colors"
                  title="Delete theme"
                >
                  ×
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

interface CustomizeSettingsProps {}

function CustomizeSettings({}: CustomizeSettingsProps) {
  const [newThemeName, setNewThemeName] = useState("");
  const [colors, setColors] = useState<ColorPreferences>({
    status_blocked: "220 38 38",
    status_ready: "79 70 229",
    status_in_progress: "20 158 158",
    status_done: "28 133 31",
    bg_primary: "247 249 251",
    bg_secondary: "240 242 245",
    bg_tertiary: "255 255 255",
    bg_quaternary: "226 232 240",
    text_primary: "42 44 48",
    text_secondary: "74 82 92",
    text_tertiary: "107 114 128",
    text_quaternary: "156 163 175",
    border_primary: "203 213 225",
    border_secondary: "226 232 240",
    accent_primary: "20 122 122",
    accent_hover: "13 93 93",
    accent_star: "245 158 11",
    sidebar_bg: "23 23 27",
    sidebar_border: "55 65 81",
    input_bg: "31 41 55",
    input_border: "75 85 99",
    button_secondary: "31 41 55",
    button_secondary_hover: "55 65 81",
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await invoke<UserPreferences>("get_preferences");
        setColors(prefs.colors);
        applyCSSColors(prefs.colors);
      } catch (e) {
        console.error("Failed to load preferences:", e);
      }
    };

    loadPreferences();
  }, []);

  const applyCSSColors = (colorPrefs: ColorPreferences) => {
    document.documentElement.style.setProperty("--color-status-blocked", colorPrefs.status_blocked);
    document.documentElement.style.setProperty("--color-status-ready", colorPrefs.status_ready);
    document.documentElement.style.setProperty("--color-status-in-progress", colorPrefs.status_in_progress);
    document.documentElement.style.setProperty("--color-status-done", colorPrefs.status_done);
    document.documentElement.style.setProperty("--color-bg-primary", colorPrefs.bg_primary);
    document.documentElement.style.setProperty("--color-bg-secondary", colorPrefs.bg_secondary);
    document.documentElement.style.setProperty("--color-bg-tertiary", colorPrefs.bg_tertiary);
    document.documentElement.style.setProperty("--color-bg-quaternary", colorPrefs.bg_quaternary);
    document.documentElement.style.setProperty("--color-text-primary", colorPrefs.text_primary);
    document.documentElement.style.setProperty("--color-text-secondary", colorPrefs.text_secondary);
    document.documentElement.style.setProperty("--color-text-tertiary", colorPrefs.text_tertiary);
    document.documentElement.style.setProperty("--color-text-quaternary", colorPrefs.text_quaternary);
    document.documentElement.style.setProperty("--color-border-primary", colorPrefs.border_primary);
    document.documentElement.style.setProperty("--color-border-secondary", colorPrefs.border_secondary);
    document.documentElement.style.setProperty("--color-accent-primary", colorPrefs.accent_primary);
    document.documentElement.style.setProperty("--color-accent-hover", colorPrefs.accent_hover);
    document.documentElement.style.setProperty("--color-accent-star", colorPrefs.accent_star);
    document.documentElement.style.setProperty("--color-sidebar-bg", colorPrefs.sidebar_bg);
    document.documentElement.style.setProperty("--color-sidebar-border", colorPrefs.sidebar_border);
    document.documentElement.style.setProperty("--color-input-bg", colorPrefs.input_bg);
    document.documentElement.style.setProperty("--color-input-border", colorPrefs.input_border);
    document.documentElement.style.setProperty("--color-button-secondary", colorPrefs.button_secondary);
    document.documentElement.style.setProperty("--color-button-secondary-hover", colorPrefs.button_secondary_hover);
  };

  const updateColor = async (key: keyof ColorPreferences, value: string) => {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);

    // Update CSS variable
    const cssVarName = `--color-${key.replace(/_/g, "-")}`;
    document.documentElement.style.setProperty(cssVarName, value);

    // Save to backend
    try {
      await invoke("save_preferences_command", {
        prefs: { colors: newColors },
      });
    } catch (e) {
      console.error("Failed to save preferences:", e);
    }
  };

  const rgbToHex = (rgb: string): string => {
    const parts = rgb.split(" ").map((p) => parseInt(p.trim()));
    if (parts.length === 3) {
      return "#" + parts.map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return "#000000";
  };

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
    }
    return "0 0 0";
  };

  const saveTheme = async () => {
    if (!newThemeName.trim()) {
      alert("Please enter a theme name");
      return;
    }

    try {
      await invoke<SavedTheme>("save_theme", {
        input: { name: newThemeName, colors },
      });
      setNewThemeName("");
      alert(`Theme "${newThemeName}" saved! Go to Appearance to apply it.`);
    } catch (e) {
      console.error("Failed to save theme:", e);
      alert("Failed to save theme: " + e);
    }
  };

  const ColorInput = ({ label, colorKey }: { label: string; colorKey: keyof ColorPreferences }) => (
    <div className="flex items-center justify-between p-3 bg-secondary rounded border border-border-primary">
      <label className="text-sm font-medium text-primary">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={rgbToHex(colors[colorKey])}
          onChange={(e) => updateColor(colorKey, hexToRgb(e.target.value))}
          className="w-10 h-10 rounded border border-input-border cursor-pointer"
        />
        <input
          type="text"
          value={colors[colorKey]}
          onChange={(e) => updateColor(colorKey, e.target.value)}
          className="w-32 px-2 py-1 text-xs bg-input border border-input-border rounded font-mono text-primary"
          placeholder="R G B"
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-2 text-primary">Customize</h2>
        <p className="text-sm text-tertiary mb-6">
          Create your own custom theme. All values are in RGB format (space-separated).
        </p>

        <div className="space-y-6">
          <div className="bg-tertiary border border-border-primary rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-primary">Save Custom Theme</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Theme name"
                className="flex-1 px-3 py-2 bg-input border border-input-border rounded text-sm text-primary"
                onKeyDown={(e) => e.key === "Enter" && saveTheme()}
              />
              <button
                onClick={saveTheme}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-primary rounded text-sm font-medium"
              >
                Save Theme
              </button>
            </div>
            <p className="text-xs text-tertiary mt-2">
              Adjust the colors below, then save with a custom name
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Status Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Blocked" colorKey="status_blocked" />
              <ColorInput label="Ready" colorKey="status_ready" />
              <ColorInput label="In Progress" colorKey="status_in_progress" />
              <ColorInput label="Done" colorKey="status_done" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Background Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="bg_primary" />
              <ColorInput label="Secondary" colorKey="bg_secondary" />
              <ColorInput label="Tertiary" colorKey="bg_tertiary" />
              <ColorInput label="Quaternary" colorKey="bg_quaternary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Text Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="text_primary" />
              <ColorInput label="Secondary" colorKey="text_secondary" />
              <ColorInput label="Tertiary" colorKey="text_tertiary" />
              <ColorInput label="Quaternary" colorKey="text_quaternary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Border Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="border_primary" />
              <ColorInput label="Secondary" colorKey="border_secondary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Accent Colors</h3>
            <div className="space-y-2">
              <ColorInput label="Primary" colorKey="accent_primary" />
              <ColorInput label="Hover" colorKey="accent_hover" />
              <ColorInput label="Star" colorKey="accent_star" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Sidebar & UI Elements</h3>
            <div className="space-y-2">
              <ColorInput label="Sidebar Background" colorKey="sidebar_bg" />
              <ColorInput label="Sidebar Border" colorKey="sidebar_border" />
              <ColorInput label="Input Background" colorKey="input_bg" />
              <ColorInput label="Input Border" colorKey="input_border" />
              <ColorInput label="Secondary Button" colorKey="button_secondary" />
              <ColorInput label="Secondary Button Hover" colorKey="button_secondary_hover" />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-tertiary border border-accent rounded">
          <p className="text-sm text-secondary">
            <strong>✓ Auto-saved:</strong> Your color preferences are automatically saved and will persist across sessions.
          </p>
        </div>
      </div>
    </div>
  );
}

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
        <div className="bg-tertiary rounded-lg border-4 border-accent p-4 md:p-8 shadow-2xl min-h-[33vh] flex flex-col justify-between">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
            <div className="flex-1">
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
                <p className="text-base text-secondary mb-6 leading-relaxed">{focusTask.description}</p>
              )}
            </div>

            {/* Terminal navigation - stacks below on mobile */}
            <div className="lg:w-80 bg-secondary rounded-lg p-4 border border-border-primary">
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

          <div className="mt-6">
            {activeTimer ? (
              <div className="mb-6">
                <div className="text-4xl md:text-5xl font-mono font-bold text-header-in-progress mb-1">
                  {formatTime(elapsedSeconds)}
                </div>
                <div className="text-xs text-tertiary">
                  Started {formatTimestamp(activeTimer.started_at)}
                </div>
              </div>
            ) : (
              <div className="mb-6">
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

interface RetroViewProps {
  tasks: Task[];
  tracks: Track[];
}

function RetroView({ tasks, tracks }: RetroViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<"today" | "week" | "month" | "custom">("today");

  const getTrackName = (trackId: string) => {
    return tracks.find((t) => t.id === trackId)?.name || "Unknown Track";
  };

  const isToday = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    const date = new Date(timestamp * 1000);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return date >= startOfWeek && date < endOfWeek;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getDayName = (dayIndex: number): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayIndex];
  };

  const todayCompletedTasks = tasks.filter((t) => t.status === "done" && isToday(t.completed_at));

  const newTasks = todayCompletedTasks.filter((t) => isToday(t.created_at));
  const existingTasks = todayCompletedTasks.filter((t) => !isToday(t.created_at));

  const tasksWithTime = todayCompletedTasks.filter((t) => t.completed_at && t.created_at);
  const avgTimeToComplete = tasksWithTime.length > 0
    ? tasksWithTime.reduce((sum, t) => sum + ((t.completed_at || 0) - t.created_at), 0) / tasksWithTime.length
    : 0;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const tasksAvailableToday = tasks.filter((t) =>
    t.created_at <= nowSeconds && (t.completed_at === null || isToday(t.completed_at))
  );
  const completionRate = tasksAvailableToday.length > 0
    ? (todayCompletedTasks.length / tasksAvailableToday.length) * 100
    : 0;

  // Week calculations
  const weekCompletedTasks = tasks.filter((t) => t.status === "done" && isThisWeek(t.completed_at));
  const weekNewTasks = weekCompletedTasks.filter((t) => isThisWeek(t.created_at));
  const weekExistingTasks = weekCompletedTasks.filter((t) => !isThisWeek(t.created_at));

  const weekTasksWithTime = weekCompletedTasks.filter((t) => t.completed_at && t.created_at);
  const weekAvgTimeToComplete = weekTasksWithTime.length > 0
    ? weekTasksWithTime.reduce((sum, t) => sum + ((t.completed_at || 0) - t.created_at), 0) / weekTasksWithTime.length
    : 0;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekTasksAvailable = tasks.filter((t) =>
    t.created_at <= nowSeconds && (t.completed_at === null || isThisWeek(t.completed_at))
  );
  const weekCompletionRate = weekTasksAvailable.length > 0
    ? (weekCompletedTasks.length / weekTasksAvailable.length) * 100
    : 0;

  // Velocity data - tasks completed per day this week
  const velocityData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const dayStart = Math.floor(day.getTime() / 1000);
    const dayEnd = dayStart + 86400; // 24 hours

    const count = weekCompletedTasks.filter((t) => {
      const completedAt = t.completed_at || 0;
      return completedAt >= dayStart && completedAt < dayEnd;
    }).length;

    return { day: getDayName(i), count };
  });

  const maxVelocity = Math.max(...velocityData.map((d) => d.count), 1);

  // Time distribution - tasks completed by hour of day
  const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
    const count = weekCompletedTasks.filter((t) => {
      if (!t.completed_at) return false;
      const date = new Date(t.completed_at * 1000);
      return date.getHours() === hour;
    }).length;
    return { hour, count };
  });

  const maxTimeDistribution = Math.max(...timeDistribution.map((d) => d.count), 1);

  const completedTrackIds = new Set(
    tracks
      .filter((track) => {
        const trackTasks = tasks.filter((t) => t.track_id === track.id);
        return trackTasks.length > 0 && trackTasks.every((t) => t.status === "done");
      })
      .map((t) => t.id)
  );

  const filteredCompletedTasks = selectedFilter === "today" ? todayCompletedTasks : weekCompletedTasks;
  const completedByTrack = filteredCompletedTasks.reduce((acc, task) => {
    const trackName = getTrackName(task.track_id);
    if (!acc[trackName]) {
      acc[trackName] = [];
    }
    acc[trackName].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const maxTasksInTrack = Math.max(...Object.values(completedByTrack).map((tasks) => tasks.length), 1);

  const formatTimeOfDay = (timestamp: number | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-2 mb-6 pb-4 border-b border-sidebar">
        <button
          onClick={() => setSelectedFilter("today")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "today"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedFilter("week")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "week"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setSelectedFilter("month")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "month"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setSelectedFilter("custom")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "custom"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          Custom
        </button>
      </div>

      {selectedFilter === "today" && todayCompletedTasks.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No tasks completed today</p>
          <p className="text-sm">Complete some tasks to see your retro.</p>
        </div>
      ) : selectedFilter === "week" && weekCompletedTasks.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No tasks completed this week</p>
          <p className="text-sm">Complete some tasks to see your retro.</p>
        </div>
      ) : selectedFilter === "today" ? (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{todayCompletedTasks.length}</div>
              <div className="text-xs text-tertiary">Total Completed</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{newTasks.length}</div>
              <div className="text-xs text-tertiary"># New</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{existingTasks.length}</div>
              <div className="text-xs text-tertiary"># Existing</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{Math.round(completionRate)}%</div>
              <div className="text-xs text-tertiary">Completion Rate</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{formatTime(avgTimeToComplete)}</div>
              <div className="text-xs text-tertiary">Avg Time to Complete</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{completedTrackIds.size}</div>
              <div className="text-xs text-tertiary">Tracks Completed</div>
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Track Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(completedByTrack)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([trackName, trackTasks]) => {
                  const percentage = (trackTasks.length / todayCompletedTasks.length) * 100;
                  const barWidth = (trackTasks.length / maxTasksInTrack) * 100;
                  return (
                    <div key={trackName}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-primary">{trackName}</span>
                        <span className="text-sm text-tertiary">{trackTasks.length} tasks ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-accent rounded-full h-2 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Completed Tasks</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todayCompletedTasks
                .sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0))
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-secondary rounded hover:bg-button-secondary transition-colors"
                  >
                    <span className="text-accent text-lg mt-0.5">✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary">{task.title}</div>
                      <div className="text-xs text-tertiary mt-1">
                        {getTrackName(task.track_id)} • {formatTimeOfDay(task.completed_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {completedTrackIds.size > 0 && (
            <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
              <h2 className="text-lg font-bold mb-4 text-primary">Completed Tracks</h2>
              <div className="space-y-2">
                {tracks
                  .filter((track) => completedTrackIds.has(track.id))
                  .map((track) => {
                    const trackTasks = tasks.filter((t) => t.track_id === track.id);
                    return (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded"
                      >
                        <div className="flex items-center gap-2">
                          {track.type === "main" && <span className="text-star">★</span>}
                          <span className="font-medium text-primary">{track.name}</span>
                        </div>
                        <span className="text-sm text-tertiary">{trackTasks.length} tasks</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : selectedFilter === "week" ? (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{weekCompletedTasks.length}</div>
              <div className="text-xs text-tertiary">Total Completed</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{weekNewTasks.length}</div>
              <div className="text-xs text-tertiary"># New</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{weekExistingTasks.length}</div>
              <div className="text-xs text-tertiary"># Existing</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{Math.round(weekCompletionRate)}%</div>
              <div className="text-xs text-tertiary">Completion Rate</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{formatTime(weekAvgTimeToComplete)}</div>
              <div className="text-xs text-tertiary">Avg Time to Complete</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{completedTrackIds.size}</div>
              <div className="text-xs text-tertiary">Tracks Completed</div>
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Velocity - Daily Completions</h2>
            <div className="space-y-3">
              {velocityData.map((data) => (
                <div key={data.day}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-primary">{data.day}</span>
                    <span className="text-sm text-tertiary">{data.count} tasks</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-accent rounded-full h-3 transition-all"
                      style={{ width: `${(data.count / maxVelocity) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Time Distribution - Completions by Hour</h2>
            <div className="flex items-end gap-1 h-32">
              {timeDistribution.map((data) => {
                const height = (data.count / maxTimeDistribution) * 100;
                return (
                  <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 flex items-end w-full">
                      {data.count > 0 && (
                        <div
                          className="bg-accent rounded-t w-full transition-all relative group"
                          style={{ height: `${height}%` }}
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-tertiary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {data.count}
                          </span>
                        </div>
                      )}
                    </div>
                    {data.hour % 3 === 0 && (
                      <span className="text-xs text-tertiary">{data.hour}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-tertiary text-center mt-2">Hour of Day</div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Completed Tasks</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {weekCompletedTasks
                .sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0))
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-secondary rounded hover:bg-button-secondary transition-colors"
                  >
                    <span className="text-accent text-lg mt-0.5">✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary">{task.title}</div>
                      <div className="text-xs text-tertiary mt-1">
                        {getTrackName(task.track_id)} • {formatTimeOfDay(task.completed_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">Coming soon</p>
          <p className="text-sm">This view is not yet implemented.</p>
        </div>
      )}

    </div>
  );
}

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

interface BlockTaskModalProps {
  taskId: string;
  tasks: Task[];
  tracks: Track[];
  dependencies: TaskDependency[];
  onClose: () => void;
  onAddDependency: (taskId: string, blocksTaskId: string) => void;
}

function BlockTaskModal({
  taskId,
  tasks,
  tracks,
  dependencies,
  onClose,
  onAddDependency,
}: BlockTaskModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const task = tasks.find((t) => t.id === taskId);

  if (!task) return null;

  const sameTrackTasks = tasks.filter(
    (t) => t.track_id === task.track_id && t.id !== taskId && t.status !== "done"
  );

  const allOtherTasks = tasks.filter((t) => t.id !== taskId && t.status !== "done");

  const existingBlockers = dependencies
    .filter((d) => d.blocks_task_id === taskId)
    .map((d) => d.task_id);

  const filteredTasks = searchQuery
    ? allOtherTasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sameTrackTasks;

  const getTrackName = (trackId: string) => {
    return tracks.find((t) => t.id === trackId)?.name || "Unknown";
  };

  const handleSelectTask = async (blockerTaskId: string) => {
    await onAddDependency(blockerTaskId, taskId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-primary rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col border border-sidebar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-primary mb-2">Add Blocking Task</h2>
          <p className="text-sm text-secondary">
            Select a task that blocks: <span className="font-medium">{task.title}</span>
          </p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all tasks..."
            className="w-full bg-input border border-input rounded px-3 py-2 text-sm text-primary"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          {!searchQuery && sameTrackTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-tertiary mb-2">
                Tasks in {getTrackName(task.track_id)}
              </h3>
              <div className="space-y-2">
                {sameTrackTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t.id)}
                    disabled={existingBlockers.includes(t.id)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      existingBlockers.includes(t.id)
                        ? "bg-button-secondary border-sidebar text-tertiary cursor-not-allowed"
                        : "bg-task-card border-border-primary hover:border-accent hover:bg-button-secondary-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        t.status === "blocked" ? "bg-status-blocked" :
                        t.status === "ready" ? "bg-status-ready" :
                        t.status === "in_progress" ? "bg-status-in-progress" :
                        "bg-status-done"
                      } text-white`}>
                        {t.status}
                      </span>
                      <span className="text-sm font-medium text-primary">{t.title}</span>
                      {existingBlockers.includes(t.id) && (
                        <span className="ml-auto text-xs text-tertiary">Already blocking</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && (
            <div>
              <h3 className="text-sm font-semibold text-tertiary mb-2">Search Results</h3>
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-tertiary text-center py-8">No tasks found</p>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTask(t.id)}
                      disabled={existingBlockers.includes(t.id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        existingBlockers.includes(t.id)
                          ? "bg-button-secondary border-sidebar text-tertiary cursor-not-allowed"
                          : "bg-task-card border-border-primary hover:border-accent hover:bg-button-secondary-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          t.status === "blocked" ? "bg-status-blocked" :
                          t.status === "ready" ? "bg-status-ready" :
                          t.status === "in_progress" ? "bg-status-in-progress" :
                          "bg-status-done"
                        } text-white`}>
                          {t.status}
                        </span>
                        <span className="text-sm font-medium text-primary">{t.title}</span>
                        {existingBlockers.includes(t.id) && (
                          <span className="ml-auto text-xs text-tertiary">Already blocking</span>
                        )}
                      </div>
                      <p className="text-xs text-tertiary">{getTrackName(t.track_id)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!searchQuery && sameTrackTasks.length === 0 && (
            <p className="text-sm text-tertiary text-center py-8">
              No other tasks in this track. Use the search bar to find tasks from other tracks.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
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

function TrackColumn({
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
