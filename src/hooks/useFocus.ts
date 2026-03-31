import { useState, useEffect } from "react";
import type { Task, ActiveTimer } from "@/types";
import * as api from "@/lib/api";

export function useFocus(tasks: Task[]) {
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFocusAndTimer = async () => {
    try {
      const [focusTaskData, activeTimerData] = await Promise.all([
        api.getFocusTask(),
        api.getActiveTimer(),
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

  const switchFocusTask = async (taskId: string): Promise<void> => {
    try {
      if (activeTimer && focusTask) {
        await api.stopTimer(focusTask.id);
        stopTimerInterval();
      }

      const newFocusTask = await api.setFocusTask(taskId);
      setFocusTask(newFocusTask);

      const newTimer = await api.startTimer(taskId);
      setActiveTimer(newTimer);
      setElapsedSeconds(0);
      startTimerInterval();
    } catch (e) {
      setError(String(e));
    }
  };

  const stopCurrentTimer = async (): Promise<void> => {
    if (!activeTimer || !focusTask) return;

    try {
      await api.stopTimer(focusTask.id);
      setActiveTimer(null);
      setElapsedSeconds(0);
      stopTimerInterval();
    } catch (e) {
      setError(String(e));
    }
  };

  const resumeTimer = async (): Promise<void> => {
    if (!focusTask || activeTimer) return;

    try {
      const newTimer = await api.startTimer(focusTask.id);
      setActiveTimer(newTimer);
      setElapsedSeconds(0);
      startTimerInterval();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    loadFocusAndTimer();
  }, []);

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

  useEffect(() => {
    const currentFocus = tasks.find((t) => t.is_current_focus);
    if (currentFocus) {
      setFocusTask(currentFocus);
    }
  }, [tasks]);

  return {
    focusTask,
    activeTimer,
    elapsedSeconds,
    switchFocusTask,
    stopCurrentTimer,
    resumeTimer,
    error,
    setError,
  };
}
