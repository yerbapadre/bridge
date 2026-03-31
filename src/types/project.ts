export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}
