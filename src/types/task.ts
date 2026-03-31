export interface Task {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  status: "blocked" | "ready" | "in_progress" | "done";
  position: number;
  parent_task_id: string | null;
  depth: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  is_current_focus: boolean;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  blocks_task_id: string;
  created_at: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TimeLog {
  id: string;
  task_id: string;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number | null;
}
