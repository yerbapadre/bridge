import { invoke } from "@tauri-apps/api/core";
import type {
  Project,
  Track,
  Task,
  TaskDependency,
  ActiveTimer,
  TerminalSession,
  GhosttyWindow,
  UserPreferences,
  SavedTheme,
  ColorPreferences,
} from "@/types";

// Projects
export async function getProjects(): Promise<Project[]> {
  return invoke<Project[]>("get_projects");
}

export async function createProject(input: {
  name: string;
  description: string | null;
  color: string | null;
}): Promise<Project> {
  return invoke<Project>("create_project", { input });
}

export async function updateProject(
  id: string,
  name: string,
  description: string | null,
  color: string | null
): Promise<void> {
  return invoke("update_project", { id, name, description, color });
}

export async function updateProjectRootPath(
  id: string,
  rootPath: string | null
): Promise<void> {
  return invoke("update_project_root_path", { id, rootPath });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

export async function getProjectTaskCount(projectId: string): Promise<number> {
  return invoke<number>("get_project_task_count", { projectId });
}

// Tracks
export async function getTracks(projectId: string): Promise<Track[]> {
  return invoke<Track[]>("get_tracks", { projectId });
}

export async function createTrack(input: {
  project_id: string;
  name: string;
  type: "main" | "side";
  color: string | null;
}): Promise<void> {
  return invoke("create_track", { input });
}

export async function deleteTrack(id: string): Promise<void> {
  return invoke("delete_track", { id });
}

export async function reorderTracks(
  projectId: string,
  trackId: string,
  newPosition: number
): Promise<void> {
  return invoke("reorder_tracks", { projectId, trackId, newPosition });
}

// Tasks
export async function getTasks(trackId: string | null): Promise<Task[]> {
  return invoke<Task[]>("get_tasks", { trackId });
}

export async function createTask(input: {
  track_id: string;
  title: string;
  description: string | null;
  parent_task_id: string | null;
}): Promise<void> {
  return invoke("create_task", { input });
}

export async function updateTask(
  id: string,
  input: { status?: Task["status"]; title?: string; description?: string | null }
): Promise<void> {
  return invoke("update_task", { id, input });
}

export async function deleteTask(id: string): Promise<void> {
  return invoke("delete_task", { id });
}

export async function reorderTasks(
  taskId: string,
  newPosition: number
): Promise<void> {
  return invoke("reorder_tasks", { taskId, newPosition });
}

export async function autoUpdateTaskStatuses(): Promise<void> {
  return invoke("auto_update_task_statuses");
}

// Dependencies
export async function getDependencies(
  taskId: string | null
): Promise<TaskDependency[]> {
  return invoke<TaskDependency[]>("get_dependencies", { taskId });
}

export async function addDependency(
  taskId: string,
  blocksTaskId: string
): Promise<void> {
  return invoke("add_dependency", { taskId, blocksTaskId });
}

// Focus & Timer
export async function getFocusTask(projectId: string): Promise<Task | null> {
  return invoke<Task | null>("get_focus_task", { projectId });
}

export async function setFocusTask(projectId: string, taskId: string): Promise<Task> {
  return invoke<Task>("set_focus_task", { projectId, taskId });
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  return invoke<ActiveTimer | null>("get_active_timer");
}

export async function startTimer(taskId: string): Promise<ActiveTimer> {
  return invoke<ActiveTimer>("start_timer", { taskId });
}

export async function stopTimer(taskId: string): Promise<void> {
  return invoke("stop_timer", { taskId });
}

export async function getTotalTimeForTask(taskId: string): Promise<number> {
  return invoke<number>("get_total_time_for_task", { taskId });
}

// Terminal Sessions
export async function getTerminalSessions(
  taskId: string
): Promise<TerminalSession[]> {
  return invoke<TerminalSession[]>("get_terminal_sessions", { taskId });
}

export async function getAllTerminalSessions(): Promise<TerminalSession[]> {
  return invoke<TerminalSession[]>("get_all_terminal_sessions");
}

export async function createTerminalSession(input: {
  task_id: string;
  terminal_app: string;
  terminal_uuid: string;
  window_title: string;
  working_dir: string | null;
}): Promise<void> {
  return invoke("create_terminal_session", { input });
}

export async function deleteTerminalSession(id: string): Promise<void> {
  return invoke("delete_terminal_session", { id });
}

export async function updateTerminalSessionFocus(id: string): Promise<void> {
  return invoke("update_terminal_session_focus", { id });
}

export async function listGhosttyWindows(): Promise<GhosttyWindow[]> {
  return invoke<GhosttyWindow[]>("list_ghostty_windows");
}

export async function focusGhosttyWindow(windowTitle: string): Promise<void> {
  return invoke("focus_ghostty_window", { windowTitle });
}

export async function createGhosttyWindow(input: {
  task_id: string;
  task_title: string;
  working_directory?: string;
  initial_command?: string;
}): Promise<TerminalSession> {
  return invoke<TerminalSession>("create_ghostty_window", { input });
}

// Preferences & Themes
export async function getPreferences(): Promise<UserPreferences> {
  return invoke<UserPreferences>("get_preferences");
}

export async function savePreferences(colors: ColorPreferences): Promise<void> {
  return invoke("save_preferences_command", { colors });
}

export async function getThemes(): Promise<SavedTheme[]> {
  return invoke<SavedTheme[]>("get_themes");
}

export async function saveTheme(
  name: string,
  colors: ColorPreferences
): Promise<SavedTheme> {
  return invoke<SavedTheme>("save_theme", { name, colors });
}

export async function deleteTheme(id: string): Promise<void> {
  return invoke("delete_theme", { id });
}
