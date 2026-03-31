import { create } from "zustand";
import type { TerminalSession, GhosttyWindow } from "@/types";
import * as api from "@/lib/api";

interface TerminalStore {
  terminalSessions: TerminalSession[];
  allTerminalSessions: TerminalSession[];
  availableWindows: GhosttyWindow[];
  error: string | null;
  loadTerminalSessions: (taskId: string) => Promise<void>;
  loadAllTerminalSessions: () => Promise<void>;
  loadAvailableWindows: () => Promise<boolean>;
  linkTerminalWindow: (window: GhosttyWindow, taskId: string) => Promise<boolean>;
  createNewTerminal: (
    taskId: string,
    taskTitle: string,
    workingDirectory?: string,
    initialCommand?: string
  ) => Promise<TerminalSession | null>;
  focusTerminalSession: (session: TerminalSession) => Promise<void>;
  deleteTerminalSession: (sessionId: string, taskId: string) => Promise<void>;
  deleteTerminalSessionFromAllView: (sessionId: string) => Promise<void>;
  syncTerminalSessionsForTask: (taskId: string | null) => void;
  setError: (error: string | null) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  terminalSessions: [],
  allTerminalSessions: [],
  availableWindows: [],
  error: null,

  loadTerminalSessions: async (taskId: string) => {
    try {
      const sessions = await api.getTerminalSessions(taskId);
      set({ terminalSessions: sessions });
    } catch (e) {
      console.error("Failed to load terminal sessions:", e);
    }
  },

  loadAllTerminalSessions: async () => {
    try {
      const sessions = await api.getAllTerminalSessions();
      set({ allTerminalSessions: sessions });
    } catch (e) {
      console.error("Failed to load all terminal sessions:", e);
    }
  },

  loadAvailableWindows: async () => {
    try {
      const windows = await api.listGhosttyWindows();
      set({ availableWindows: windows });
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  linkTerminalWindow: async (window: GhosttyWindow, taskId: string) => {
    try {
      await api.createTerminalSession({
        task_id: taskId,
        terminal_app: "ghostty",
        terminal_uuid: window.id,
        window_title: window.title,
        working_dir: window.working_dir,
      });

      await get().loadTerminalSessions(taskId);
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  createNewTerminal: async (
    taskId: string,
    taskTitle: string,
    workingDirectory?: string,
    initialCommand?: string
  ) => {
    try {
      const session = await api.createGhosttyWindow({
        task_id: taskId,
        task_title: taskTitle,
        working_directory: workingDirectory,
        initial_command: initialCommand,
      });
      await get().loadTerminalSessions(taskId);
      return session;
    } catch (e) {
      set({ error: String(e) });
      return null;
    }
  },

  focusTerminalSession: async (session: TerminalSession) => {
    if (!session.window_title) return;

    try {
      await api.focusGhosttyWindow(session.window_title);
      await api.updateTerminalSessionFocus(session.id);
      await get().loadTerminalSessions(session.task_id);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteTerminalSession: async (sessionId: string, taskId: string) => {
    try {
      await api.deleteTerminalSession(sessionId);
      await get().loadTerminalSessions(taskId);
      await get().loadAllTerminalSessions();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteTerminalSessionFromAllView: async (sessionId: string) => {
    try {
      await api.deleteTerminalSession(sessionId);
      await get().loadAllTerminalSessions();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  syncTerminalSessionsForTask: (taskId: string | null) => {
    if (!taskId) {
      set({ terminalSessions: [] });
    }
  },

  setError: (error: string | null) => set({ error }),
}));
