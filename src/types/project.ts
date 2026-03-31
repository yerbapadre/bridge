export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  root_path: string | null;
  focused_task_id: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}
