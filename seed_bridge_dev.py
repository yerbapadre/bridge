#!/usr/bin/env python3
"""
Seed script to create the Bridge Development project with tracks and initial tasks
"""

import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

DB_PATH = Path.home() / "Library/Application Support/com.bridge.app/bridge.db"

def main():
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        print("Please run Bridge at least once to create the database")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if Bridge Development project already exists
    cursor.execute("SELECT id FROM projects WHERE name = 'Bridge Development'")
    existing = cursor.fetchone()

    if existing:
        print("Bridge Development project already exists!")
        project_id = existing[0]
    else:
        # Create Bridge Development project
        project_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp())

        # Get current max position
        cursor.execute("SELECT MAX(position) FROM projects")
        max_pos = cursor.fetchone()[0]
        position = (max_pos + 1) if max_pos is not None else 0

        cursor.execute(
            "INSERT INTO projects (id, name, description, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (project_id, "Bridge Development", "Ideas and improvements for Bridge", None, position, now, now)
        )
        print(f"Created Bridge Development project")

    # Define tracks to create
    tracks = [
        {"name": "Features", "type": "main"},
        {"name": "Bugs", "type": "side"},
        {"name": "UX Improvements", "type": "side"},
        {"name": "Ideas", "type": "side"},
        {"name": "Support Requests", "type": "side"},
    ]

    track_ids = {}

    for i, track_data in enumerate(tracks):
        # Check if track already exists
        cursor.execute(
            "SELECT id FROM tracks WHERE project_id = ? AND name = ?",
            (project_id, track_data["name"])
        )
        existing_track = cursor.fetchone()

        if existing_track:
            print(f"Track '{track_data['name']}' already exists")
            track_ids[track_data["name"]] = existing_track[0]
        else:
            track_id = str(uuid.uuid4())
            now = int(datetime.now().timestamp())

            cursor.execute(
                "INSERT INTO tracks (id, project_id, name, type, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (track_id, project_id, track_data["name"], track_data["type"], None, i, now, now)
            )
            track_ids[track_data["name"]] = track_id
            print(f"Created track: {track_data['name']}")

    # Add initial task to Ideas track
    ideas_track_id = track_ids["Ideas"]

    # Check if the configurable stats task already exists
    cursor.execute(
        "SELECT id FROM tasks WHERE track_id = ? AND title LIKE '%Configurable header stats%'",
        (ideas_track_id,)
    )
    existing_task = cursor.fetchone()

    if existing_task:
        print("Configurable header stats task already exists")
    else:
        task_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp())

        # Get position for new task
        cursor.execute(
            "SELECT COUNT(*) FROM tasks WHERE track_id = ? AND parent_task_id IS NULL",
            (ideas_track_id,)
        )
        position = cursor.fetchone()[0]

        cursor.execute(
            """INSERT INTO tasks
               (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, is_current_focus)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                task_id,
                ideas_track_id,
                "Configurable header stats",
                "Allow users to configure which stats appear in the top-right header. Options: active terminals, tasks completed today/week, current focus streak, blocked tasks count, total focus time today, etc.",
                "ready",
                position,
                None,
                0,
                now,
                now,
                0
            )
        )
        print("Added task: Configurable header stats")

    # Add DIY mode task
    cursor.execute(
        "SELECT id FROM tasks WHERE track_id = ? AND title LIKE '%DIY mode%'",
        (ideas_track_id,)
    )
    existing_diy = cursor.fetchone()

    if existing_diy:
        print("DIY mode task already exists")
    else:
        task_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp())

        cursor.execute(
            "SELECT COUNT(*) FROM tasks WHERE track_id = ? AND parent_task_id IS NULL",
            (ideas_track_id,)
        )
        position = cursor.fetchone()[0]

        cursor.execute(
            """INSERT INTO tasks
               (id, track_id, title, description, status, position, parent_task_id, depth, created_at, updated_at, is_current_focus)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                task_id,
                ideas_track_id,
                "DIY mode - AI-powered self-modification",
                "Enable users to use Claude to automatically modify Bridge's source code based on tasks they create. Challenges: safety, testing, version control, conflicts with upstream updates. Could use plugin architecture or per-user forks.",
                "ready",
                position,
                None,
                0,
                now,
                now,
                0
            )
        )
        print("Added task: DIY mode - AI-powered self-modification")

    conn.commit()
    conn.close()

    print("\n✅ Bridge Development project seeded successfully!")
    print(f"Project ID: {project_id}")

if __name__ == "__main__":
    main()
