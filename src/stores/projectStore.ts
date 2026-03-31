import { create } from "zustand";
import type { Project } from "@/types";
import * as api from "@/lib/api";

interface ProjectStore {
  projects: Project[];
  currentProjectId: string | null;
  error: string | null;
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project | null>;
  updateProject: (id: string, name: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  getProjectTaskCount: (projectId: string) => Promise<number>;
  setCurrentProjectId: (id: string | null) => void;
  setError: (error: string | null) => void;
  currentProject: () => Project | undefined;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  error: null,

  loadProjects: async () => {
    try {
      const projectsData = await api.getProjects();
      const { currentProjectId } = get();
      set({
        projects: projectsData,
        currentProjectId: projectsData.length > 0 && !currentProjectId ? projectsData[0].id : currentProjectId,
        error: null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createProject: async (name: string) => {
    if (!name.trim()) return null;

    try {
      const newProject = await api.createProject({
        name,
        description: null,
        color: null,
      });

      await get().loadProjects();
      set({ currentProjectId: newProject.id });

      return newProject;
    } catch (e) {
      set({ error: String(e) });
      return null;
    }
  },

  updateProject: async (id: string, name: string) => {
    if (!name.trim()) return false;

    try {
      await api.updateProject(id, name, null, null);
      await get().loadProjects();
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  deleteProject: async (id: string) => {
    try {
      await api.deleteProject(id);

      const { currentProjectId } = get();
      if (currentProjectId === id) {
        set({ currentProjectId: null });
      }

      await get().loadProjects();
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  getProjectTaskCount: async (projectId: string) => {
    try {
      return await api.getProjectTaskCount(projectId);
    } catch (e) {
      set({ error: String(e) });
      return 0;
    }
  },

  setCurrentProjectId: (id: string | null) => set({ currentProjectId: id }),

  setError: (error: string | null) => set({ error }),

  currentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId);
  },
}));
