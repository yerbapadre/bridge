import { useState, useEffect } from "react";
import type { Project } from "@/types";
import * as api from "@/lib/api";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const projectsData = await api.getProjects();
      setProjects(projectsData);
      if (projectsData.length > 0 && !currentProjectId) {
        setCurrentProjectId(projectsData[0].id);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const createProject = async (name: string): Promise<Project | null> => {
    if (!name.trim()) return null;

    try {
      const newProject = await api.createProject({
        name,
        description: null,
        color: null,
      });
      await loadProjects();
      setCurrentProjectId(newProject.id);
      return newProject;
    } catch (e) {
      setError(String(e));
      return null;
    }
  };

  const updateProject = async (
    id: string,
    name: string
  ): Promise<boolean> => {
    if (!name.trim()) return false;

    try {
      await api.updateProject(id, name, null, null);
      await loadProjects();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      await api.deleteProject(id);
      if (currentProjectId === id) {
        setCurrentProjectId(null);
      }
      await loadProjects();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  const getProjectTaskCount = async (projectId: string): Promise<number> => {
    try {
      return await api.getProjectTaskCount(projectId);
    } catch (e) {
      setError(String(e));
      return 0;
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    createProject,
    updateProject,
    deleteProject,
    getProjectTaskCount,
    loadProjects,
    error,
    setError,
  };
}
