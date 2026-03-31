import { create } from "zustand";
import type { Track, Task, TaskDependency } from "@/types";
import * as api from "@/lib/api";

interface TaskStore {
  tracks: Track[];
  tasks: Task[];
  dependencies: TaskDependency[];
  error: string | null;
  loadData: (currentProjectId: string) => Promise<void>;
  createTrack: (name: string, currentProjectId: string) => Promise<boolean>;
  deleteTrack: (id: string, currentProjectId: string) => Promise<boolean>;
  reorderTracks: (trackId: string, newPosition: number, currentProjectId: string) => Promise<boolean>;
  createTask: (trackId: string, title: string, parentTaskId: string | null, currentProjectId: string) => Promise<boolean>;
  updateTaskStatus: (taskId: string, newStatus: Task["status"], currentProjectId: string) => Promise<void>;
  deleteTask: (taskId: string, currentProjectId: string) => Promise<void>;
  reorderTasks: (taskId: string, newPosition: number, currentProjectId: string) => Promise<boolean>;
  addDependency: (taskId: string, blocksTaskId: string, currentProjectId: string) => Promise<void>;
  getTasksForTrack: (trackId: string) => Task[];
  getSubtasks: (parentId: string) => Task[];
  hasSubtasks: (taskId: string) => boolean;
  advanceTaskStatus: (taskId: string, currentStatus: Task["status"], currentProjectId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

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

export const useTaskStore = create<TaskStore>((set, get) => ({
  tracks: [],
  tasks: [],
  dependencies: [],
  error: null,

  loadData: async (currentProjectId: string) => {
    if (!currentProjectId) return;

    try {
      const [tracksData, allTasks, allDependencies] = await Promise.all([
        api.getTracks(currentProjectId),
        api.getTasks(null),
        api.getDependencies(null),
      ]);

      // Filter tasks to only those belonging to tracks in this project
      const trackIds = new Set(tracksData.map(t => t.id));
      const tasksData = allTasks.filter(task => trackIds.has(task.track_id));
      const taskIds = new Set(tasksData.map(t => t.id));
      const dependenciesData = allDependencies.filter(dep =>
        taskIds.has(dep.task_id) && taskIds.has(dep.blocks_task_id)
      );

      set({
        tracks: tracksData,
        tasks: tasksData,
        dependencies: dependenciesData,
        error: null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createTrack: async (name: string, currentProjectId: string) => {
    if (!name.trim() || !currentProjectId) return false;

    const { tracks } = get();
    const hasMain = tracks.some((t) => t.type === "main");
    const trackType = hasMain ? "side" : "main";

    try {
      await api.createTrack({
        project_id: currentProjectId,
        name,
        type: trackType,
        color: null,
      });

      await get().loadData(currentProjectId);
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  deleteTrack: async (id: string, currentProjectId: string) => {
    try {
      await api.deleteTrack(id);
      await get().loadData(currentProjectId);
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  reorderTracks: async (trackId: string, newPosition: number, currentProjectId: string) => {
    if (!currentProjectId) return false;

    try {
      await api.reorderTracks(currentProjectId, trackId, newPosition);
      await get().loadData(currentProjectId);
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  createTask: async (trackId: string, title: string, parentTaskId: string | null, currentProjectId: string) => {
    if (!title.trim()) return false;

    try {
      await api.createTask({
        track_id: trackId,
        title,
        description: null,
        parent_task_id: parentTaskId,
      });

      await get().loadData(currentProjectId);
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  updateTaskStatus: async (taskId: string, newStatus: Task["status"], currentProjectId: string) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      await api.autoUpdateTaskStatuses();
      await get().loadData(currentProjectId);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteTask: async (taskId: string, currentProjectId: string) => {
    try {
      await api.deleteTask(taskId);
      await get().loadData(currentProjectId);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  reorderTasks: async (taskId: string, newPosition: number, currentProjectId: string) => {
    try {
      await api.reorderTasks(taskId, newPosition);
      await get().loadData(currentProjectId);
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  addDependency: async (taskId: string, blocksTaskId: string, currentProjectId: string) => {
    try {
      await api.addDependency(taskId, blocksTaskId);
      await api.autoUpdateTaskStatuses();
      await get().loadData(currentProjectId);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  getTasksForTrack: (trackId: string) => {
    const { tasks } = get();
    return tasks
      .filter((t) => t.track_id === trackId && t.parent_task_id === null)
      .sort((a, b) => a.position - b.position);
  },

  getSubtasks: (parentId: string) => {
    const { tasks } = get();
    return tasks
      .filter((t) => t.parent_task_id === parentId)
      .sort((a, b) => a.position - b.position);
  },

  hasSubtasks: (taskId: string) => {
    const { tasks } = get();
    return tasks.some((t) => t.parent_task_id === taskId);
  },

  advanceTaskStatus: async (taskId: string, currentStatus: Task["status"], currentProjectId: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      await get().updateTaskStatus(taskId, nextStatus, currentProjectId);
    }
  },

  setError: (error: string | null) => set({ error }),
}));
