import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

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
}

interface TaskDependency {
  id: string;
  task_id: string;
  blocks_task_id: string;
  created_at: number;
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
}

interface UserPreferences {
  colors: ColorPreferences;
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
  const [currentView, setCurrentView] = useState<"board" | "active" | "settings">("board");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);

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
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  };

  const loadData = async () => {
    if (!currentProjectId) return;

    try {
      const [tracksData, tasksData, depsData] = await Promise.all([
        invoke<Track[]>("get_tracks", { projectId: currentProjectId }),
        invoke<Task[]>("get_tasks", { trackId: null }),
        invoke<TaskDependency[]>("get_dependencies", { taskId: null }),
      ]);
      setTracks(tracksData);
      setTasks(tasksData);
      setDependencies(depsData);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    loadProjects();
    loadAndApplyPreferences();
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      loadData();
    }
  }, [currentProjectId]);

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
      setCurrentView("board");
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

  const deleteTrack = async (trackId: string) => {
    if (!confirm("Delete this track and all its tasks?")) return;
    try {
      await invoke("delete_track", { id: trackId });
      loadData();
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

  const getStatusText = (status: Task["status"]) => {
    switch (status) {
      case "blocked":
        return "Blocked";
      case "ready":
        return "Ready";
      case "in_progress":
        return "In Progress";
      case "done":
        return "Done";
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
            {sidebarCollapsed ? "→" : "←"}
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
                className="w-full text-left px-3 py-2 text-xs font-semibold text-tertiary hover:text-secondary flex items-center justify-between"
              >
                <span>PROJECTS</span>
                <span>{projectsExpanded ? "▼" : "▶"}</span>
              </button>

              {projectsExpanded && (
                <div className="mt-1 ml-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setCurrentProjectId(project.id);
                        if (currentView === "settings") {
                          setCurrentView("board");
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded mb-1 text-sm transition-colors ${
                        currentProjectId === project.id && currentView !== "settings"
                          ? "bg-accent font-medium"
                          : "text-secondary hover:bg-button-secondary"
                      }`}
                    >
                      {project.name}
                    </button>
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
              sidebarCollapsed ? 'text-center text-2xl' : 'text-left text-xl'
            } ${
              currentView === "settings"
                ? "bg-accent font-medium"
                : "text-secondary hover:bg-button-secondary"
            }`}
          >
            {sidebarCollapsed ? "⚙" : "⚙ Settings"}
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
              onClick={() => setCurrentView("active")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "active"
                  ? "text-accent border-b-2 border-accent"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Active View
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error border border-error rounded p-4 mb-6">
            <p className="text-sm text-primary">Error: {error}</p>
          </div>
        )}

        {currentView === "settings" ? (
          <SettingsView />
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

          <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 flex-1">
        {mainTrack && (
          <TrackColumn
            track={mainTrack}
            tasks={getTasksForTrack(mainTrack.id)}
            onDeleteTrack={deleteTrack}
            onCreateTask={createTask}
            onUpdateTaskStatus={updateTaskStatus}
            onDeleteTask={deleteTask}
            advanceTaskStatus={advanceTaskStatus}
            getStatusBorderColor={getStatusBorderColor}
            getStatusText={getStatusText}
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
          />
        )}

        {sideTracks.map((track) => (
          <TrackColumn
            key={track.id}
            track={track}
            tasks={getTasksForTrack(track.id)}
            onDeleteTrack={deleteTrack}
            onCreateTask={createTask}
            onUpdateTaskStatus={updateTaskStatus}
            onDeleteTask={deleteTask}
            advanceTaskStatus={advanceTaskStatus}
            getStatusBorderColor={getStatusBorderColor}
            getStatusText={getStatusText}
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
          onUpdateTaskStatus={updateTaskStatus}
          advanceTaskStatus={advanceTaskStatus}
          getStatusBorderColor={getStatusBorderColor}
          getStatusText={getStatusText}
        />
        )}
      </div>
    </div>
  );
}

interface SettingsViewProps {}

function SettingsView({}: SettingsViewProps) {
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
  });

  useEffect(() => {
    // Load preferences from backend
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

  const ColorInput = ({ label, colorKey }: { label: string; colorKey: keyof ColorPreferences }) => (
    <div className="flex items-center justify-between p-3 bg-neutral-100 rounded">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={rgbToHex(colors[colorKey])}
          onChange={(e) => updateColor(colorKey, hexToRgb(e.target.value))}
          className="w-10 h-10 rounded border border-neutral-300 cursor-pointer"
        />
        <input
          type="text"
          value={colors[colorKey]}
          onChange={(e) => updateColor(colorKey, e.target.value)}
          className="w-32 px-2 py-1 text-xs border border-neutral-300 rounded font-mono"
          placeholder="R G B"
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl">
        <p className="text-sm text-neutral-500 mb-6">
          Customize the color scheme of your application. All values are in RGB format (space-separated).
        </p>

        <div className="space-y-6">
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
        </div>

        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
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
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"]) => void;
  getStatusBorderColor: (status: Task["status"]) => string;
  getStatusText: (status: Task["status"]) => string;
}

function ActiveView({
  tasks,
  tracks,
  onUpdateTaskStatus,
  advanceTaskStatus,
  getStatusBorderColor,
  getStatusText,
}: ActiveViewProps) {
  const activeTasks = tasks.filter(
    (t) => t.status === "ready" || t.status === "in_progress"
  );

  const inProgressTasks = activeTasks.filter((t) => t.status === "in_progress");
  const readyTasks = activeTasks.filter((t) => t.status === "ready");

  const getTrackName = (trackId: string) => {
    return tracks.find((t) => t.id === trackId)?.name || "Unknown Track";
  };

  const renderTaskCard = (task: Task) => {
    const statusClass = getStatusBorderColor(task.status);
    return (
      <div
        key={task.id}
        className={`bg-task-card rounded-lg p-4 border-t border-l border-r border-task-card border-b-4 ${statusClass}`}
      >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="text-base font-medium mb-1 text-primary">{task.title}</p>
          <p className="text-xs text-tertiary mt-1">{getTrackName(task.track_id)}</p>
          {task.description && (
            <p className="text-sm text-secondary mt-2">{task.description}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => advanceTaskStatus(task.id, task.status)}
          className="flex-1 text-sm px-4 py-2 rounded bg-accent font-medium"
        >
          {task.status === "ready" ? "Start Working →" : "Complete →"}
        </button>
        <button
          onClick={() => onUpdateTaskStatus(task.id, "blocked")}
          className="text-sm px-4 py-2 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
        >
          Block
        </button>
      </div>
    </div>
  );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {activeTasks.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No active tasks</p>
          <p className="text-sm">Move tasks to "Ready" or "In Progress" to see them here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {inProgressTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-header-in-progress">
                In Progress ({inProgressTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressTasks.map(renderTaskCard)}
              </div>
            </div>
          )}

          {readyTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-header-ready">
                Ready to Start ({readyTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyTasks.map(renderTaskCard)}
              </div>
            </div>
          )}
        </div>
      )}
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
  getStatusText: (status: Task["status"]) => string;
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
  getStatusText,
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
}: TrackColumnProps) {
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);

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

  const renderTask = (task: Task, isFirstTask: boolean) => {
    const subtasks = getSubtasks(task.id);
    const isCollapsed = collapsedTasks.has(task.id);
    const canHaveSubtasks = task.depth < 2;
    const isAddingSubtask = selectedParentTaskId === task.id;
    const isMenuOpen = openMenuTaskId === task.id;

    const marginClass = task.depth === 1 ? "ml-4" : task.depth === 2 ? "ml-8" : "";

    return (
      <div key={task.id} className={marginClass}>
        <div
          className={`bg-task-card rounded p-3 border-t border-l border-r border-task-card border-b-4 ${getStatusBorderColor(
            task.status
          )} group mb-2 relative`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1">
              {hasSubtasks(task.id) && (
                <button
                  onClick={() => toggleTaskCollapsed(task.id)}
                  className="text-tertiary hover:text-secondary text-sm mt-0.5"
                >
                  {isCollapsed ? "▶" : "▼"}
                </button>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug text-primary">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-tertiary mt-1">{task.description}</p>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuTaskId(isMenuOpen ? null : task.id);
                }}
                className={`text-tertiary hover:text-secondary text-sm ${
                  isFirstTask ? "" : "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
                title="More options"
              >
                ⋯
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-6 bg-button-secondary border border-sidebar rounded shadow-lg z-10 min-w-[150px]">
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowStatusSubmenu(true)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-secondary"
                    >
                      Change Status ›
                    </button>
                    {showStatusSubmenu && (
                      <div
                        className="absolute left-full top-0 ml-1 bg-button-secondary border border-sidebar rounded shadow-lg min-w-[130px]"
                        onMouseLeave={() => setShowStatusSubmenu(false)}
                      >
                        {(["blocked", "ready", "in_progress", "done"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateTaskStatus(task.id, status);
                              setOpenMenuTaskId(null);
                              setShowStatusSubmenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover ${
                              task.status === status
                                ? "text-tertiary bg-button-secondary-hover"
                                : "text-secondary"
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(task.id);
                      setOpenMenuTaskId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-button-secondary-hover text-error border-error"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {task.status !== "done" ? (
              <button
                onClick={() => advanceTaskStatus(task.id, task.status)}
                className="text-xs px-2 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Advance to next status"
              >
                →
              </button>
            ) : (
              <button
                className="text-xs px-2 py-1 rounded bg-status-done-muted text-status-done cursor-default"
                disabled
                title="Completed"
              >
                ✓
              </button>
            )}
            {canHaveSubtasks && (
              <button
                onClick={() => setSelectedParentTaskId(task.id)}
                className="text-xs px-3 py-1 rounded bg-button-secondary hover:bg-button-secondary-hover text-secondary"
                title="Add subtask"
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
    <div className="bg-track rounded-lg border border-track flex flex-col h-fit min-w-[320px] w-[320px]">
      <div className="p-4 border-b border-sidebar flex items-center justify-between">
        <div>
          <h2 className="font-semibold flex items-center gap-2 text-primary">
            {track.type === "main" && <span className="text-star">★</span>}
            {track.name}
          </h2>
          <p className="text-xs text-tertiary mt-0.5">
            {track.type === "main" ? "Main Track" : "Side Track"}
          </p>
        </div>
        {track.type !== "main" && (
          <button
            onClick={() => onDeleteTrack(track.id)}
            className="text-tertiary hover:text-error text-sm"
            title="Delete track"
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
    </div>
  );
}
