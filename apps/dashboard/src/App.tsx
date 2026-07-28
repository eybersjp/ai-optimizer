import React, { useState, useEffect } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "projects" | "discovery" | "suggested" | "activation" | "memory" | "activity"
  >("projects");

  return (
    <div className="container">
      <header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.75rem" }}>AI Optimize</h1>
            <p style={{ margin: 0, color: "#94a3b8" }}>Configuration Compiler & Governance System</p>
          </div>
          <span className="badge">Daemon: Connected (http://127.0.0.1:4737)</span>
        </div>
      </header>

      <nav style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        {(["projects", "discovery", "suggested", "activation", "memory", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? "#2563eb" : "#1e293b",
              color: "white",
              border: "1px solid #334155",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              textTransform: "capitalize"
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="card">
        {activeTab === "projects" && (
          <div>
            <h2>Projects</h2>
            <p>Active project: <strong>ai-optimizer</strong> (c:\Users\SSTECH\developments\ai-optimizer)</p>
            <p>Archetype: <code>modular-monolith</code> | Status: <span style={{ color: "#4ade80" }}>Active</span></p>
          </div>
        )}

        {activeTab === "discovery" && (
          <div>
            <h2>Discovery Findings & Evidence</h2>
            <ul>
              <li><strong>[OBSERVED]</strong> pnpm-workspace.yaml present &rarr; Monorepo topology</li>
              <li><strong>[OBSERVED]</strong> package.json present &rarr; TypeScript & Node.js 24</li>
              <li><strong>[INFERRED]</strong> Modular monolith compilation target</li>
            </ul>
          </div>
        )}

        {activeTab === "suggested" && (
          <div>
            <h2>Suggested Configuration</h2>
            <p>Enabled Experts: <code>core-software</code>, <code>typescript</code>, <code>testing</code>, <code>security</code></p>
            <p>Generated Artifacts: <code>CLAUDE.md</code>, <code>.claude/rules/architecture.md</code>, <code>.vscode/settings.json</code></p>
          </div>
        )}

        {activeTab === "activation" && (
          <div>
            <h2>Activation & Diff Governance</h2>
            <p>Lock acquired &rarr; Hash checked &rarr; Snapshot backup created &rarr; Staged replace passed</p>
            <button style={{ background: "#dc2626", color: "white", padding: "0.5rem 1rem", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Rollback Activation
            </button>
          </div>
        )}

        {activeTab === "memory" && (
          <div>
            <h2>Project Memory & Event Log</h2>
            <p>Stored in <code>.ai-optimize/events.jsonl</code> & SQLite database</p>
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            <h2>Audit & Activity History</h2>
            <p>Latest event: <code>ACTIVATION_COMPLETED</code> at {new Date().toLocaleTimeString()}</p>
          </div>
        )}
      </main>
    </div>
  );
}
