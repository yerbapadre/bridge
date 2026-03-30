use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashSet, VecDeque};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

pub struct Database {
    conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: String,
    pub project_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub track_type: String,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub track_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub position: i32,
    pub parent_task_id: Option<String>,
    pub depth: i32,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskDependency {
    pub id: String,
    pub task_id: String,
    pub blocks_task_id: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTrackInput {
    pub project_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub track_type: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub track_id: String,
    pub title: String,
    pub description: Option<String>,
    pub parent_task_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Create projects table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tracks (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                color TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CHECK (type IN ('main', 'side'))
            )",
            [],
        )?;

        // Migration: Add project_id column if it doesn't exist
        let has_project_col: bool = conn
            .prepare("PRAGMA table_info(tracks)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "project_id");

        if !has_project_col {
            // Create default "Work" project
            let default_project_id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().timestamp();

            conn.execute(
                "INSERT INTO projects (id, name, description, color, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![default_project_id, "Work", None::<String>, None::<String>, 0, now, now],
            )?;

            // Add project_id column with default value
            conn.execute(
                &format!("ALTER TABLE tracks ADD COLUMN project_id TEXT NOT NULL DEFAULT '{}'", default_project_id),
                [],
            )?;
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                track_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                position INTEGER NOT NULL,
                parent_task_id TEXT,
                depth INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                completed_at INTEGER,
                FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                CHECK (status IN ('blocked', 'ready', 'in_progress', 'done')),
                CHECK (depth >= 0 AND depth <= 2)
            )",
            [],
        )?;

        // Migration: Add parent_task_id and depth columns if they don't exist
        let has_parent_col: bool = conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .filter_map(Result::ok)
            .any(|name| name == "parent_task_id");

        if !has_parent_col {
            conn.execute("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT", [])?;
            conn.execute("ALTER TABLE tasks ADD COLUMN depth INTEGER NOT NULL DEFAULT 0", [])?;
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS task_dependencies (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                blocks_task_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (blocks_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                UNIQUE(task_id, blocks_task_id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_track ON tasks(track_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_deps_task ON task_dependencies(task_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_deps_blocks ON task_dependencies(blocks_task_id)",
            [],
        )?;

        Ok(())
    }

    pub fn create_track(&self, input: CreateTrackInput) -> Result<Track> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tracks WHERE project_id = ?1",
            params![input.project_id],
            |row| row.get(0),
        )?;

        if count >= 8 {
            return Err(rusqlite::Error::ExecuteReturnedResults);
        }

        if input.track_type == "main" {
            let main_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM tracks WHERE project_id = ?1 AND type = 'main'",
                params![input.project_id],
                |row| row.get(0),
            )?;
            if main_count > 0 {
                return Err(rusqlite::Error::ExecuteReturnedResults);
            }
        }

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let position = count as i32;

        conn.execute(
            "INSERT INTO tracks (id, project_id, name, type, color, position, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, input.project_id, input.name, input.track_type, input.color, position, now, now],
        )?;

        Ok(Track {
            id,
            project_id: input.project_id,
            name: input.name,
            track_type: input.track_type,
            color: input.color,
            position,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn get_tracks(&self, project_id: Option<String>) -> Result<Vec<Track>> {
        let conn = self.conn.lock().unwrap();

        let (query, params_vec): (String, Vec<String>) = if let Some(pid) = project_id {
            (
                "SELECT id, project_id, name, type, color, position, created_at, updated_at
                 FROM tracks WHERE project_id = ?1 ORDER BY position".to_string(),
                vec![pid],
            )
        } else {
            (
                "SELECT id, project_id, name, type, color, position, created_at, updated_at
                 FROM tracks ORDER BY position".to_string(),
                vec![],
            )
        };

        let mut stmt = conn.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let tracks = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(Track {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    track_type: row.get(3)?,
                    color: row.get(4)?,
                    position: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tracks)
    }

    pub fn update_track(&self, id: &str, name: String, color: Option<String>) -> Result<Track> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE tracks SET name = ?1, color = ?2, updated_at = ?3 WHERE id = ?4",
            params![name, color, now, id],
        )?;

        let track = conn.query_row(
            "SELECT id, project_id, name, type, color, position, created_at, updated_at FROM tracks WHERE id = ?1",
            params![id],
            |row| {
                Ok(Track {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    track_type: row.get(3)?,
                    color: row.get(4)?,
                    position: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )?;

        Ok(track)
    }

    pub fn delete_track(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tracks WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn create_task(&self, input: CreateTaskInput) -> Result<Task> {
        let conn = self.conn.lock().unwrap();

        let depth = if let Some(ref parent_id) = input.parent_task_id {
            let parent_depth: i32 = conn.query_row(
                "SELECT depth FROM tasks WHERE id = ?1",
                params![parent_id],
                |row| row.get(0),
            )?;

            let new_depth = parent_depth + 1;
            if new_depth > 2 {
                return Err(rusqlite::Error::ExecuteReturnedResults);
            }
            new_depth
        } else {
            0
        };

        let parent_for_count = if input.parent_task_id.is_some() {
            &input.parent_task_id
        } else {
            &None
        };

        let count: i64 = if let Some(parent_id) = parent_for_count {
            conn.query_row(
                "SELECT COUNT(*) FROM tasks WHERE parent_task_id = ?1",
                params![parent_id],
                |row| row.get(0),
            )?
        } else {
            conn.query_row(
                "SELECT COUNT(*) FROM tasks WHERE track_id = ?1 AND parent_task_id IS NULL",
                params![input.track_id],
                |row| row.get(0),
            )?
        };

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let position = count as i32;
        let status = "ready";

        conn.execute(
            "INSERT INTO tasks (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                id,
                input.track_id,
                input.title,
                input.description,
                status,
                position,
                input.parent_task_id,
                depth,
                now,
                now
            ],
        )?;

        Ok(Task {
            id,
            track_id: input.track_id,
            title: input.title,
            description: input.description,
            status: status.to_string(),
            position,
            parent_task_id: input.parent_task_id,
            depth,
            created_at: now,
            updated_at: now,
            completed_at: None,
        })
    }

    pub fn get_tasks(&self, track_id: Option<String>) -> Result<Vec<Task>> {
        let conn = self.conn.lock().unwrap();

        let (query, params_vec): (String, Vec<String>) = if let Some(tid) = track_id {
            (
                "SELECT id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, completed_at
                 FROM tasks WHERE track_id = ?1 ORDER BY position".to_string(),
                vec![tid],
            )
        } else {
            (
                "SELECT id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, completed_at
                 FROM tasks ORDER BY position".to_string(),
                vec![],
            )
        };

        let mut stmt = conn.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let tasks = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(Task {
                    id: row.get(0)?,
                    track_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    parent_task_id: row.get(6)?,
                    depth: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    completed_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn update_task(&self, id: &str, input: UpdateTaskInput) -> Result<Task> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        let current_task: Task = conn.query_row(
            "SELECT id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, completed_at
             FROM tasks WHERE id = ?1",
            params![id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    track_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    position: row.get(5)?,
                    parent_task_id: row.get(6)?,
                    depth: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    completed_at: row.get(10)?,
                })
            },
        )?;

        let title = input.title.unwrap_or(current_task.title);
        let description = input.description.or(current_task.description);
        let status = input.status.unwrap_or(current_task.status);
        let completed_at = if status == "done" {
            Some(now)
        } else {
            current_task.completed_at
        };

        conn.execute(
            "UPDATE tasks SET title = ?1, description = ?2, status = ?3, updated_at = ?4, completed_at = ?5
             WHERE id = ?6",
            params![title, description, status, now, completed_at, id],
        )?;

        Ok(Task {
            id: id.to_string(),
            track_id: current_task.track_id,
            title,
            description,
            status,
            position: current_task.position,
            parent_task_id: current_task.parent_task_id,
            depth: current_task.depth,
            created_at: current_task.created_at,
            updated_at: now,
            completed_at,
        })
    }

    pub fn delete_task(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn check_circular_dependency(&self, task_id: &str, blocks_task_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();

        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(blocks_task_id.to_string());

        while let Some(current_id) = queue.pop_front() {
            if current_id == task_id {
                return Ok(true);
            }

            if visited.contains(&current_id) {
                continue;
            }
            visited.insert(current_id.clone());

            let mut stmt = conn.prepare(
                "SELECT blocks_task_id FROM task_dependencies WHERE task_id = ?1",
            )?;

            let dependencies = stmt
                .query_map(params![current_id], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>>>()?;

            for dep in dependencies {
                queue.push_back(dep);
            }
        }

        Ok(false)
    }

    pub fn add_dependency(&self, task_id: &str, blocks_task_id: &str) -> Result<TaskDependency> {
        if self.check_circular_dependency(task_id, blocks_task_id)? {
            return Err(rusqlite::Error::ExecuteReturnedResults);
        }

        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO task_dependencies (id, task_id, blocks_task_id, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![id, task_id, blocks_task_id, now],
        )?;

        Ok(TaskDependency {
            id,
            task_id: task_id.to_string(),
            blocks_task_id: blocks_task_id.to_string(),
            created_at: now,
        })
    }

    pub fn get_dependencies(&self, task_id: Option<String>) -> Result<Vec<TaskDependency>> {
        let conn = self.conn.lock().unwrap();

        let (query, params_vec): (String, Vec<String>) = if let Some(tid) = task_id {
            (
                "SELECT id, task_id, blocks_task_id, created_at
                 FROM task_dependencies WHERE task_id = ?1".to_string(),
                vec![tid],
            )
        } else {
            (
                "SELECT id, task_id, blocks_task_id, created_at
                 FROM task_dependencies".to_string(),
                vec![],
            )
        };

        let mut stmt = conn.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let deps = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(TaskDependency {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    blocks_task_id: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(deps)
    }

    pub fn remove_dependency(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM task_dependencies WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn auto_update_task_statuses(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        let tasks: Vec<String> = conn
            .prepare("SELECT id FROM tasks WHERE status != 'done'")?
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>>>()?;

        for task_id in tasks {
            let has_incomplete_deps: bool = conn.query_row(
                "SELECT EXISTS(
                    SELECT 1 FROM task_dependencies td
                    JOIN tasks t ON td.blocks_task_id = t.id
                    WHERE td.task_id = ?1 AND t.status != 'done'
                )",
                params![task_id],
                |row| row.get(0),
            )?;

            let current_status: String = conn.query_row(
                "SELECT status FROM tasks WHERE id = ?1",
                params![task_id],
                |row| row.get(0),
            )?;

            let new_status = if has_incomplete_deps {
                "blocked"
            } else if current_status == "blocked" {
                "ready"
            } else {
                continue;
            };

            if new_status != current_status {
                let now = chrono::Utc::now().timestamp();
                conn.execute(
                    "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
                    params![new_status, now, task_id],
                )?;
            }
        }

        Ok(())
    }

    // Project CRUD operations
    pub fn create_project(&self, input: CreateProjectInput) -> Result<Project> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?;

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let position = count as i32;

        conn.execute(
            "INSERT INTO projects (id, name, description, color, position, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, input.name, input.description, input.color, position, now, now],
        )?;

        Ok(Project {
            id,
            name: input.name,
            description: input.description,
            color: input.color,
            position,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn get_projects(&self) -> Result<Vec<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, color, position, created_at, updated_at
             FROM projects ORDER BY position",
        )?;

        let projects = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    position: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(projects)
    }

    pub fn update_project(&self, id: &str, name: String, description: Option<String>, color: Option<String>) -> Result<Project> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE projects SET name = ?1, description = ?2, color = ?3, updated_at = ?4 WHERE id = ?5",
            params![name, description, color, now, id],
        )?;

        let project = conn.query_row(
            "SELECT id, name, description, color, position, created_at, updated_at FROM projects WHERE id = ?1",
            params![id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    position: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )?;

        Ok(project)
    }

    pub fn delete_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }
}

// User Preferences
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
    pub colors: ColorPreferences,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColorPreferences {
    pub status_blocked: String,
    pub status_ready: String,
    pub status_in_progress: String,
    pub status_done: String,
    pub bg_primary: String,
    pub bg_secondary: String,
    pub bg_tertiary: String,
    pub bg_quaternary: String,
    pub text_primary: String,
    pub text_secondary: String,
    pub text_tertiary: String,
    pub text_quaternary: String,
    pub border_primary: String,
    pub border_secondary: String,
    pub accent_primary: String,
    pub accent_hover: String,
    pub accent_star: String,
}

impl Default for ColorPreferences {
    fn default() -> Self {
        ColorPreferences {
            status_blocked: "220 38 38".to_string(),
            status_ready: "79 70 229".to_string(),
            status_in_progress: "20 158 158".to_string(),
            status_done: "28 133 31".to_string(),
            bg_primary: "247 249 251".to_string(),
            bg_secondary: "240 242 245".to_string(),
            bg_tertiary: "255 255 255".to_string(),
            bg_quaternary: "226 232 240".to_string(),
            text_primary: "42 44 48".to_string(),
            text_secondary: "74 82 92".to_string(),
            text_tertiary: "107 114 128".to_string(),
            text_quaternary: "156 163 175".to_string(),
            border_primary: "203 213 225".to_string(),
            border_secondary: "226 232 240".to_string(),
            accent_primary: "20 122 122".to_string(),
            accent_hover: "13 93 93".to_string(),
            accent_star: "245 158 11".to_string(),
        }
    }
}

impl Default for UserPreferences {
    fn default() -> Self {
        UserPreferences {
            colors: ColorPreferences::default(),
        }
    }
}

pub fn load_preferences(prefs_path: &PathBuf) -> UserPreferences {
    if let Ok(contents) = fs::read_to_string(prefs_path) {
        if let Ok(prefs) = serde_json::from_str(&contents) {
            return prefs;
        }
    }
    UserPreferences::default()
}

pub fn save_preferences(prefs_path: &PathBuf, prefs: &UserPreferences) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(prefs)?;
    fs::write(prefs_path, json)?;
    Ok(())
}
