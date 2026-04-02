import { create } from "zustand";
import type { NoteItem } from "@/types";
import * as api from "@/lib/api";

interface NoteStore {
  notes: NoteItem[];
  currentNotePath: string | null;
  currentNoteContent: string;
  error: string | null;
  loadNotes: () => Promise<void>;
  loadNote: (path: string) => Promise<void>;
  saveNote: (path: string, content: string) => Promise<boolean>;
  createNote: (path: string) => Promise<boolean>;
  deleteNote: (path: string) => Promise<boolean>;
  createFolder: (path: string) => Promise<boolean>;
  renameNote: (oldPath: string, newPath: string) => Promise<boolean>;
  setCurrentNotePath: (path: string | null) => void;
  setCurrentNoteContent: (content: string) => void;
  setError: (error: string | null) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  currentNotePath: null,
  currentNoteContent: "",
  error: null,

  loadNotes: async () => {
    try {
      const notesData = await api.listNotes();
      set({ notes: notesData, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadNote: async (path: string) => {
    try {
      const content = await api.readNote(path);
      set({ currentNotePath: path, currentNoteContent: content, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveNote: async (path: string, content: string) => {
    try {
      await api.writeNote(path, content);
      set({ currentNoteContent: content, error: null });
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  createNote: async (path: string) => {
    try {
      await api.createNote(path);
      await get().loadNotes();
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  deleteNote: async (path: string) => {
    try {
      await api.deleteNote(path);
      const { currentNotePath } = get();
      if (currentNotePath === path) {
        set({ currentNotePath: null, currentNoteContent: "" });
      }
      await get().loadNotes();
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  createFolder: async (path: string) => {
    try {
      await api.createFolder(path);
      await get().loadNotes();
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  renameNote: async (oldPath: string, newPath: string) => {
    try {
      await api.renameNote(oldPath, newPath);
      const { currentNotePath } = get();
      if (currentNotePath === oldPath) {
        set({ currentNotePath: newPath });
      }
      await get().loadNotes();
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  setCurrentNotePath: (path: string | null) => set({ currentNotePath: path }),

  setCurrentNoteContent: (content: string) => set({ currentNoteContent: content }),

  setError: (error: string | null) => set({ error }),
}));
