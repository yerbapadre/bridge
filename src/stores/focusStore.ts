import { create } from "zustand";
import type { Task, ActiveTimer } from "@/types";
import * as api from "@/lib/api";

interface FocusStore {
  focusTask: Task | null;
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  totalTimeSeconds: number;
  timerInterval: number | null;
  error: string | null;
  loadFocusAndTimer: (projectId: string) => Promise<void>;
  switchFocusTask: (projectId: string, taskId: string) => Promise<void>;
  unfocusTask: (projectId: string) => Promise<void>;
  stopCurrentTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  syncFocusFromTasks: (tasks: Task[]) => void;
  setError: (error: string | null) => void;
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  focusTask: null,
  activeTimer: null,
  elapsedSeconds: 0,
  totalTimeSeconds: 0,
  timerInterval: null,
  error: null,

  loadFocusAndTimer: async (projectId: string) => {
    // Clear any existing interval first to prevent duplicates
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
      set({ timerInterval: null });
    }

    try {
      const [focusTaskData, activeTimerData] = await Promise.all([
        api.getFocusTask(projectId),
        api.getActiveTimer(),
      ]);

      const updates: Partial<FocusStore> = {};

      if (focusTaskData) {
        updates.focusTask = focusTaskData;
        // Load total time for the task
        const totalTime = await api.getTotalTimeForTask(focusTaskData.id);
        updates.totalTimeSeconds = totalTime;
      } else {
        updates.focusTask = null;
        updates.totalTimeSeconds = 0;
      }

      if (activeTimerData) {
        updates.activeTimer = activeTimerData;
        const now = Math.floor(Date.now() / 1000);
        updates.elapsedSeconds = now - activeTimerData.started_at;

        const id = window.setInterval(() => {
          const { activeTimer } = get();
          if (activeTimer) {
            const currentTime = Math.floor(Date.now() / 1000);
            set({ elapsedSeconds: currentTime - activeTimer.started_at });
          }
        }, 1000);

        updates.timerInterval = id;
      } else {
        // No active timer - reset elapsed time and ensure interval is cleared
        updates.activeTimer = null;
        updates.elapsedSeconds = 0;
        updates.timerInterval = null;
      }

      set(updates);
    } catch (e) {
      console.error("Failed to load focus and timer:", e);
    }
  },

  switchFocusTask: async (projectId: string, taskId: string) => {
    const { activeTimer, focusTask, timerInterval } = get();

    try {
      if (activeTimer && focusTask) {
        await api.stopTimer(focusTask.id);

        if (timerInterval) {
          clearInterval(timerInterval);
        }
      }

      const newFocusTask = await api.setFocusTask(projectId, taskId);
      const newTimer = await api.startTimer(taskId);

      const id = window.setInterval(() => {
        const { activeTimer } = get();
        if (activeTimer) {
          const currentTime = Math.floor(Date.now() / 1000);
          set({ elapsedSeconds: currentTime - activeTimer.started_at });
        }
      }, 1000);

      set({
        focusTask: newFocusTask,
        activeTimer: newTimer,
        elapsedSeconds: 0,
        timerInterval: id,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  unfocusTask: async (projectId: string) => {
    const { activeTimer, focusTask, timerInterval } = get();

    try {
      if (activeTimer && focusTask) {
        await api.stopTimer(focusTask.id);
      }

      if (timerInterval) {
        clearInterval(timerInterval);
      }

      await api.clearFocusTask(projectId);

      set({
        focusTask: null,
        activeTimer: null,
        elapsedSeconds: 0,
        totalTimeSeconds: 0,
        timerInterval: null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  stopCurrentTimer: async () => {
    const { activeTimer, focusTask, timerInterval } = get();

    if (!activeTimer || !focusTask) return;

    try {
      await api.stopTimer(focusTask.id);

      if (timerInterval) {
        clearInterval(timerInterval);
      }

      set({
        activeTimer: null,
        elapsedSeconds: 0,
        timerInterval: null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  resumeTimer: async () => {
    const { focusTask, activeTimer, timerInterval } = get();

    if (!focusTask || activeTimer) return;

    try {
      const newTimer = await api.startTimer(focusTask.id);

      if (timerInterval) {
        clearInterval(timerInterval);
      }

      const id = window.setInterval(() => {
        const { activeTimer } = get();
        if (activeTimer) {
          const currentTime = Math.floor(Date.now() / 1000);
          set({ elapsedSeconds: currentTime - activeTimer.started_at });
        }
      }, 1000);

      set({
        activeTimer: newTimer,
        elapsedSeconds: 0,
        timerInterval: id,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  syncFocusFromTasks: (tasks: Task[]) => {
    const { focusTask } = get();

    // Clear focus task if it's not in the current project's tasks
    if (focusTask && !tasks.find((t) => t.id === focusTask.id)) {
      set({ focusTask: null });
    }
  },

  setError: (error: string | null) => set({ error }),
}));
