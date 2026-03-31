export interface Track {
  id: string;
  project_id: string;
  name: string;
  type: "main" | "side";
  color: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}
