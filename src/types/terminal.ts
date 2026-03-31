export interface TerminalSession {
  id: string;
  task_id: string;
  terminal_app: string;
  terminal_uuid: string | null;
  window_title: string | null;
  working_dir: string | null;
  created_at: number;
  last_focused_at: number | null;
}

export interface GhosttyWindow {
  id: string;
  title: string;
  working_dir: string | null;
}
