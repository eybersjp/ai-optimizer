import * as fs from "node:fs";
import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface ProjectEvent {
  id: string;
  type: string;
  projectId: string;
  payload: Record<string, any>;
  timestamp: string;
}

export class MemoryEngine {
  private db: DatabaseSync | null = null;

  public init(storagePath?: string): void {
    const dbPath = storagePath || ":memory:";
    if (dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        project_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
    `);
  }

  public recordEvent(projectRoot: string, type: string, projectId: string, payload: Record<string, any>): ProjectEvent {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    const event: ProjectEvent = { id, type, projectId, payload, timestamp };

    // 1. Append to .ai-optimize/events.jsonl
    const aiOptDir = path.join(projectRoot, ".ai-optimize");
    fs.mkdirSync(aiOptDir, { recursive: true });
    const jsonlPath = path.join(aiOptDir, "events.jsonl");
    fs.appendFileSync(jsonlPath, `${JSON.stringify(event)}\n`, "utf-8");

    // 2. Insert into SQLite index if initialized
    if (this.db) {
      const stmt = this.db.prepare(
        "INSERT INTO events (id, type, project_id, payload, timestamp) VALUES (?, ?, ?, ?, ?)"
      );
      stmt.run(id, type, projectId, JSON.stringify(payload), timestamp);
    }

    return event;
  }

  public getEvents(projectId: string): ProjectEvent[] {
    if (!this.db) return [];
    const stmt = this.db.prepare("SELECT * FROM events WHERE project_id = ? ORDER BY timestamp ASC");
    const rows = stmt.all(projectId) as any[];

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      projectId: r.project_id,
      payload: JSON.parse(r.payload),
      timestamp: r.timestamp
    }));
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
