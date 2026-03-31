import { useState, useEffect } from "react";
import type { TerminalSession, GhosttyWindow, Task } from "@/types";
import * as api from "@/lib/api";

export function useTerminals(focusTask: Task | null) {
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [allTerminalSessions, setAllTerminalSessions] = useState<TerminalSession[]>([]);
  const [availableWindows, setAvailableWindows] = useState<GhosttyWindow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTerminalSessions = async (taskId: string) => {
    try {
      const sessions = await api.getTerminalSessions(taskId);
      setTerminalSessions(sessions);
    } catch (e) {
      console.error("Failed to load terminal sessions:", e);
    }
  };

  const loadAllTerminalSessions = async () => {
    try {
      const sessions = await api.getAllTerminalSessions();
      setAllTerminalSessions(sessions);
    } catch (e) {
      console.error("Failed to load all terminal sessions:", e);
    }
  };

  const loadAvailableWindows = async (): Promise<boolean> => {
    try {
      const windows = await api.listGhosttyWindows();
      setAvailableWindows(windows);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const linkTerminalWindow = async (
    window: GhosttyWindow,
    taskId: string
  ): Promise<boolean> => {
    try {
      await api.createTerminalSession({
        task_id: taskId,
        terminal_app: "ghostty",
        terminal_uuid: window.id,
        window_title: window.title,
        working_dir: window.working_dir,
      });
      await loadTerminalSessions(taskId);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const focusTerminalSession = async (session: TerminalSession): Promise<void> => {
    if (!session.window_title) return;

    try {
      await api.focusGhosttyWindow(session.window_title);
      await api.updateTerminalSessionFocus(session.id);
      await loadTerminalSessions(session.task_id);
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteTerminalSession = async (sessionId: string, taskId: string): Promise<void> => {
    try {
      await api.deleteTerminalSession(sessionId);
      await loadTerminalSessions(taskId);
      await loadAllTerminalSessions();
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteTerminalSessionFromAllView = async (sessionId: string): Promise<void> => {
    try {
      await api.deleteTerminalSession(sessionId);
      await loadAllTerminalSessions();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    if (focusTask) {
      loadTerminalSessions(focusTask.id);
    } else {
      setTerminalSessions([]);
    }
  }, [focusTask]);

  return {
    terminalSessions,
    allTerminalSessions,
    availableWindows,
    loadTerminalSessions,
    loadAllTerminalSessions,
    loadAvailableWindows,
    linkTerminalWindow,
    focusTerminalSession,
    deleteTerminalSession,
    deleteTerminalSessionFromAllView,
    error,
    setError,
  };
}
