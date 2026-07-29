# AI Optimize

> **Configuration Compiler and Governance System for AI Coding Environments**

AI Optimize is a project configuration compiler layer designed to govern external AI execution environments (Claude Code, VS Code, Codex, Continue, local models). 

Instead of operating as another autonomous coding agent or chat interface, **AI Optimize** acts as an evidence-backed compiler that analyzes local repositories, infers architectural contracts, activates specialized expert knowledge packs, and transactionally manages environment configurations with 100% hash-verified rollback capabilities.

---

## 🏗️ Architecture & Pipeline Flow

```text
Project Intelligence Engine (5-Pass Autonomous Scanner)
        ↓
Evidence Engine (Traceable Assertions & Provenance)
        ↓
Expert-Pack Engine (Executable Knowledge Packs)
        ↓
Profile Compiler (Pure Canonical Configuration Compiler)
        ↓
Safe Activation & Hash-Verified Rollback Engine
        ↓
Agent & IDE Adapters (Claude Code, VS Code, Codex)
        ↓
Memory & Event Engine (JSONL + Node.js Native SQLite)
        ↓
Fastify Daemon API & React Dashboard
```

---

## ✨ Key Capabilities

1. **5-Pass Autonomous Project Scanner**
   - **Pass 1 (Filesystem)**: Fast, bounded discovery ignoring dependencies & build outputs with path normalisation.
   - **Pass 2 (Dependencies & Stack)**: Manifest parsing (`package.json`, `pyproject.toml`, `Cargo.toml`, `Dockerfile`, `compose.yaml`, `firebase.json`, `supabase`, etc.) mapping 13+ languages and 17+ frameworks.
   - **Pass 3 (Topology)**: Package graph construction, monorepo/workspace topology detection, role assignment (frontend, cli, daemon, library, contracts, adapter).
   - **Pass 4 (Git Inspection)**: Branch, HEAD, SHA, dirty state, and redacted remotes via non-interpolated execution without sending history to LLMs.
   - **Pass 5 (Architectural Synthesis)**: Deterministic rule-based architectural synthesis (`monorepo`, `frontend-backend-separation`, `shared-contracts`, `adapter-architecture`, `test-framework`, `database-presence`) with confidence scoring.

2. **Evidence-Backed Assertion Engine**
   - Every project finding is stored as a traceable assertion with confidence scores, subject-predicate definitions, and exact file/line provenance (`observed`, `inferred`, `recommended`, `unresolved`).

3. **Executable Expert Knowledge Packs**
   - Modular packs (`core-software`, `typescript`, `github`, `testing`, `security`) containing activation triggers, rule definitions, and quality gate validators.

4. **Pure Function Configuration Compiler**
   - Pure, deterministic compiler (`compile(input) => output`) that transforms project profile and active expert packs into target provider configurations (`CLAUDE.md`, `.claude/rules/`, `.vscode/settings.json`).

5. **Transactional Activation & Atomic Rollback**
   - Implements a strict activation pipeline: `Acquire Lock` → `Compute Hashes` → `Create Snapshot Backup` → `Staged Write` → `Health Check` → `Atomic Replacement`. On error, automatic hash-verified rollback restores the previous baseline.

6. **Model Context Protocol (MCP) Integration**
   - Local MCP server exposing project profile intelligence (`ai-optimize://project/profile`, `project_get_context_capsule`, `configuration_get_status`) to external AI hosts.

---

## 📦 Monorepo Structure

```text
ai-optimize/
├── apps/
│   ├── cli/                   # Commander CLI (`ai-optimize`)
│   ├── daemon/                # Fastify REST Daemon API (http://127.0.0.1:4737)
│   └── dashboard/             # React + Vite local web UI
│
├── packages/
│   ├── contracts/             # Provider-neutral Zod schemas & types
│   ├── project-scanner/       # 5-pass autonomous scanner
│   ├── project-classifier/    # Archetype & maturity classifier
│   ├── evidence-engine/       # Assertion builder & provenance tracking
│   ├── expert-engine/         # Pack loader & evaluator
│   ├── recommendation-engine/ # Deterministic & inference recommendations
│   ├── profile-compiler/      # Pure configuration compiler
│   ├── activation-engine/     # Transactional lock, atomic swap & rollback
│   ├── memory-engine/         # Layered JSONL event stream & node:sqlite index
│   ├── mcp-server/            # MCP server exposing project tools & resources
│   └── adapters/
│       ├── claude-code/       # CLAUDE.md (< 200 lines) & .claude/ generator
│       └── vscode/            # .vscode/settings.json managed section patcher
│
├── expert-packs/              # Executable knowledge packs
│   ├── core-software/
│   ├── typescript/
│   ├── github/
│   ├── testing/
│   └── security/
│
└── tests/                     # Vitest integration and unit test suite
```

---

## 🚀 Quickstart

### Prerequisites

- **Node.js**: `v24.0.0` or higher
- **Package Manager**: `pnpm` (v9.0.0+)

### Setup

```bash
# Clone the repository
git clone https://github.com/eybersjp/ai-optimize.git
cd ai-optimizer

# Install dependencies
pnpm install

# Build all monorepo packages
pnpm build

# Run test suite
pnpm test

# Generate machine-readable test inventory report
pnpm test:list

# Execute complete repository verification (build, test, lint, whitespace check, test inventory)
pnpm verify
```

---

## 💻 CLI Commands (`ai-optimize`)

| Command | Description |
| :--- | :--- |
| `ai-optimize init [dir]` | Initialize repository and generate canonical project profile (`.ai-optimize/project-profile.json`) |
| `ai-optimize analyse [dir]` | Scan repository architecture, stack, and evidence assertions |
| `ai-optimize explain [dir]` | Display evidence assertions supporting current classification |
| `ai-optimize recommendations [dir]` | Show rule and inference-based project recommendations |
| `ai-optimize compile [dir]` | Compile target IDE and agent configurations |
| `ai-optimize diff [dir]` | Show proposed file changes before activation |
| `ai-optimize activate [dir]` | Safely activate compiled configuration with backup & lock |
| `ai-optimize status [dir]` | Show active configuration status and managed artifacts |
| `ai-optimize rollback [dir]` | Rollback active configuration to previous snapshot |

---

## 🔌 Fastify Daemon API & Dashboard

Start the local background daemon API:

```bash
pnpm daemon
```

The Fastify server listens on `http://127.0.0.1:4737` and exposes:
- `POST /api/v1/projects/init`
- `GET /api/v1/projects/analyse`
- `GET /api/v1/projects/explain`
- `GET /api/v1/projects/recommendations`
- `POST /api/v1/projects/compile`
- `POST /api/v1/projects/activate`
- `POST /api/v1/projects/rollback`
- `GET /api/v1/projects/status`

Start the Vite + React Dashboard:

```bash
pnpm dashboard
```

---

## 🌐 Model Context Protocol (MCP) Tools & Resources

AI Optimize exposes an MCP server for AI host integration:

### Tools
- `project_get_profile`: Retrieve provider-neutral canonical project profile.
- `project_get_context_capsule`: Retrieve task-scoped compact context package.
- `configuration_get_status`: Inspect active managed artifacts and configuration state.

### Resources
- `ai-optimize://project/profile`
- `ai-optimize://project/state`
- `ai-optimize://project/current-task`

---

## 📄 License

[MIT License](file:///c:/Users/SSTECH/developments/ai-optimizer/LICENSE)
