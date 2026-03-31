import { useState, useEffect } from "react";
import type { Track, Task, TaskDependency } from "@/types";
import * as api from "@/lib/api";

export function useTasks(currentProjectId: string | null) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!currentProjectId) return;

    try {
      const [tracksData, tasksData, dependenciesData] = await Promise.all([
        api.getTracks(currentProjectId),
        api.getTasks(null),
        api.getDependencies(null),
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
    if (currentProjectId) {
      loadData();
    }
  }, [currentProjectId]);

  const createTrack = async (name: string): Promise<boolean> => {
    if (!name.trim() || !currentProjectId) return false;

    const hasMain = tracks.some((t) => t.type === "main");
    const trackType = hasMain ? "side" : "main";

    try {
      await api.createTrack({
        project_id: currentProjectId,
        name,
        type: trackType,
        color: null,
      });
      await loadData();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const deleteTrack = async (id: string): Promise<boolean> => {
    try {
      await api.deleteTrack(id);
      await loadData();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const reorderTracks = async (
    trackId: string,
    newPosition: number
  ): Promise<boolean> => {
    if (!currentProjectId) return false;

    try {
      await api.reorderTracks(currentProjectId, trackId, newPosition);
      await loadData();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const createTask = async (
    trackId: string,
    title: string,
    parentTaskId: string | null = null
  ): Promise<boolean> => {
    if (!title.trim()) return false;

    try {
      await api.createTask({
        track_id: trackId,
        title,
        description: null,
        parent_task_id: parentTaskId,
      });
      await loadData();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: Task["status"]
  ): Promise<void> => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      await api.autoUpdateTaskStatuses();
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      await api.deleteTask(taskId);
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const reorderTasks = async (
    taskId: string,
    newPosition: number
  ): Promise<boolean> => {
    try {
      await api.reorderTasks(taskId, newPosition);
      await loadData();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const addDependency = async (
    taskId: string,
    blocksTaskId: string
  ): Promise<void> => {
    try {
      await api.addDependency(taskId, blocksTaskId);
      await api.autoUpdateTaskStatuses();
      await loadData();
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

  const advanceTaskStatus = async (
    taskId: string,
    currentStatus: Task["status"]
  ) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      await updateTaskStatus(taskId, nextStatus);
    }
  };

  const mainTrack = tracks.find((t) => t.type === "main");
  const sideTracks = tracks.filter((t) => t.type === "side");

  return {
    tracks,
    tasks,
    dependencies,
    mainTrack,
    sideTracks,
    createTrack,
    deleteTrack,
    reorderTracks,
    createTask,
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    addDependency,
    getTasksForTrack,
    getSubtasks,
    hasSubtasks,
    advanceTaskStatus,
    loadData,
    error,
    setError,
  };
}
