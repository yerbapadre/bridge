import type { ColorPreferences, Task } from "@/types";

export function applyThemeColors(colors: ColorPreferences): void {
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
  document.documentElement.style.setProperty("--color-sidebar-bg", colors.sidebar_bg);
  document.documentElement.style.setProperty("--color-sidebar-border", colors.sidebar_border);
  document.documentElement.style.setProperty("--color-input-bg", colors.input_bg);
  document.documentElement.style.setProperty("--color-input-border", colors.input_border);
  document.documentElement.style.setProperty("--color-button-secondary", colors.button_secondary);
  document.documentElement.style.setProperty("--color-button-secondary-hover", colors.button_secondary_hover);
}

export function getStatusBorderColor(status: Task["status"]): string {
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
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
