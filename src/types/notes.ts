export interface NoteItem {
  path: string;
  name: string;
  is_folder: boolean;
  children?: NoteItem[];
}
