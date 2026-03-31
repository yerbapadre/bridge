import { create } from "zustand";
import type { Task, ActiveTimer } from "@/types";
import * as api from "@/lib/api";

interface FocusStore {
  focusTask: Task | null;
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  timerInterval: number | null;
  error: string | null;
  loadFocusAndTimer: () => Promise<void>;
  switchFocusTask: (taskId: string) => Promise<void>;
  stopCurrentTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  syncFocusFromTasks: (tasks: Task[]) => void;
  setError: (error: string | null) => void;
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  focusTask: null,
  activeTimer: null,
  elapsedSeconds: 0,
  timerInterval: null,
  error: null,

  loadFocusAndTimer: async () => {
    try {
      const [focusTaskData, activeTimerData] = await Promise.all([
        api.getFocusTask(),
        api.getActiveTimer(),
      ]);

      const updates: Partial<FocusStore> = {};

      if (focusTaskData) {
        updates.focusTask = focusTaskData;
      }

      if (activeTimerData) {
        updates.activeTimer = activeTimerData;
        const now = Math.floor(Date.now() / 1000);
        updates.elapsedSeconds = now - activeTimerData.started_at;

        const { timerInterval } = get();
        if (timerInterval) clearInterval(timerInterval);

        const id = window.setInterval(() => {
          set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
        }, 1000);

        updates.timerInterval = id;
      }

      set(updates);
    } catch (e) {
      console.error("Failed to load focus and timer:", e);
    }
  },

  switchFocusTask: async (taskId: string) => {
    const { activeTimer, focusTask, timerInterval } = get();

    try {
      if (activeTimer && focusTask) {
        await api.stopTimer(focusTask.id);

        if (timerInterval) {
          clearInterval(timerInterval);
        }
      }

      const newFocusTask = await api.setFocusTask(taskId);
      const newTimer = await api.startTimer(taskId);

      const id = window.setInterval(() => {
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
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
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
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
    const currentFocus = tasks.find((t) => t.is_current_focus);
    if (currentFocus) {
      set({ focusTask: currentFocus });
    }
  },

  setError: (error: string | null) => set({ error }),
}));
