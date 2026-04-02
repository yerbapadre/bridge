import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Task, Track } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTrackName(tracks: Track[], trackId: string): string {
  const track = tracks.find((t) => t.id === trackId);
  return track ? track.name : "Unknown Track";
}

export function getTrackType(tracks: Track[], trackId: string): "main" | "side" {
  const track = tracks.find((t) => t.id === trackId);
  return track?.type || "side";
}

export function getTaskTitle(tasks: Task[], taskId: string): string {
  const task = tasks.find((t) => t.id === taskId);
  return task ? task.title : "Unknown Task";
}

export function getTrackNameForTask(tasks: Task[], tracks: Track[], taskId: string): string {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return "Unknown Track";
  return getTrackName(tracks, task.track_id);
}

export function formatTimeOnly(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;

export async function withErrorHandling<T, R>(
  set: SetState<T & { error: string | null }>,
  fn: () => Promise<R>
): Promise<R | null> {
  try {
    return await fn();
  } catch (e) {
    set({ error: String(e) } as Partial<T & { error: string | null }>);
    return null;
  }
}
