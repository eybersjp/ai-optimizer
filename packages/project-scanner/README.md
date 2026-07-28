# @ai-optimize/project-scanner

> **Evidence-Backed Multi-Pass Repository Intelligence Engine**

The `@ai-optimize/project-scanner` package provides a deterministic, bounded, provider-neutral repository scanner. It inspects single packages, monorepos, and mixed-language projects without relying on an external LLM.

---

## 🧭 Pass Sequence

The `ProjectScanner` orchestrates 5 deterministic passes in strict sequence:

1. **Pass 1 — Safe Filesystem Discovery (`filesystem`)**
   - Bounded recursive file discovery ignoring build outputs, dependencies, and temporary state.
   - Respects `.gitignore`, `.ai-optimizeignore`, and configurable scanner ignore rules.
   - Sorts paths deterministically and normalises all paths to portable forward-slash format (`/`).
   - Prevents symlink loops and skips directory symlinks by default (`followSymlinks: false`).

2. **Pass 2 — Manifest & Technology Discovery (`manifest`)**
   - Discovers and parses manifests across JavaScript, TypeScript, Python, Rust, Docker, Firebase, Supabase, Vercel, Netlify, and CI workflows.
   - Collects package metadata, workspace topologies, dependencies, devDependencies, entry points, and scripts.
   - Detects source-file extensions and technology frameworks.

3. **Pass 3 — Repository Topology & Package Graph (`topology`)**
   - Expands workspace patterns (`pnpm-workspace.yaml`, `package.json` `workspaces`).
   - Builds a typed package dependency graph (`nodes`, `edges`) with dependency types (`workspace`, `development`, `runtime`, `peer`, `optional`).
   - Classifies package roles (`frontend`, `cli`, `daemon-service`, `contracts`, `adapter`, `library`, `test`, `expert-pack`).
   - Determines overall topology (`single-package`, `monorepo`, `multi-application`, `mixed-language`, `library-collection`).

4. **Pass 4 — Safe Git Intelligence (`git`)**
   - Safely executes Git commands via non-interpolated child process arrays (`git status`, `git rev-parse`, `git log`, `git remote`).
   - Collects branch, HEAD state, commit SHA, dirty file counts, redacted remotes, and recent commits (max 10).
   - Git absence or command failure produces structured diagnostics rather than crashing the scan.

5. **Pass 5 — Deterministic Architectural Synthesis (`architecture`)**
   - Synthesises high-level architectural findings from evidence using rule-based logic (no external LLM calls).
   - Assigns rule IDs, rule versions, confidence scores, and supporting evidence references.
   - Distinguishes observed facts from inferred patterns and unresolved ambiguities.

---

## 📄 Supported Manifest Types

| Domain | Manifest Files | Parser / Handling |
| :--- | :--- | :--- |
| **JS / TS** | `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsconfig.*.json`, `vite.config.*`, `next.config.*`, `vitest.config.*`, `jest.config.*`, `eslint.config.*`, `.eslintrc.*`, `prettier.config.*` | `JSON.parse`, `yaml.parse`, structured inspection |
| **Python** | `pyproject.toml`, `requirements.txt`, `requirements-dev.txt`, `setup.py`, `setup.cfg`, `Pipfile` | TOML parser, line-based requirements parser |
| **Rust** | `Cargo.toml`, `Cargo.lock` | TOML parser, text inspection |
| **Containers** | `Dockerfile`, `Dockerfile.*`, `compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml`, `vercel.json`, `netlify.toml` | Dockerfile FROM instruction parser, YAML, TOML |
| **Data & Platforms** | `supabase/config.toml`, `supabase/migrations/**`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, `prisma/schema.prisma`, `drizzle.config.*` | JSON, TOML, path matching |
| **CI / Workflows** | `.github/workflows/*.yml`, `.github/workflows/*.yaml` | YAML parser |

---

## 🔤 Supported Languages

- **TypeScript** (`.ts`, `.tsx`, `.mts`, `.cts`, `tsconfig.json`, `typescript` dep)
- **JavaScript** (`.js`, `.jsx`, `.mjs`, `.cjs`)
- **Python** (`.py`, `pyproject.toml`, `requirements.txt`)
- **Rust** (`.rs`, `Cargo.toml`)
- **SQL** (`.sql`, `supabase/migrations`)
- **HTML** (`.html`)
- **CSS / SCSS / SASS / LESS** (`.css`, `.scss`, `.sass`, `.less`)
- **JSON** (`.json`)
- **YAML** (`.yaml`, `.yml`)
- **TOML** (`.toml`)
- **Shell** (`.sh`, `.bash`, `.zsh`)
- **PowerShell** (`.ps1`, `.psm1`)

---

## 🛠️ Framework & Tool Detection Rules

| Technology | Detection Evidence | Scope / Notes |
| :--- | :--- | :--- |
| **React** | `react`, `react-dom` in `package.json` | Observed from package dependencies |
| **Next.js** | `next` in `package.json`, `next.config.*` | Observed from dependencies and config |
| **Vite** | `vite` in `package.json`, `vite.config.*` | Observed from devDependencies and config |
| **Express** | `express` in `package.json` | Explicitly separated from Fastify |
| **Fastify** | `fastify` in `package.json` | Explicitly separated from Express |
| **Vitest** | `vitest` in `package.json`, `vitest.config.*` | Test framework |
| **Jest** | `jest` in `package.json`, `jest.config.*` | Test framework |
| **Vue** | `vue` in `package.json` | Frontend framework |
| **Svelte** | `svelte`, `sveltekit` in `package.json` | Frontend framework |
| **Tailwind CSS** | `tailwindcss` in `package.json` | Styling utility |
| **Supabase** | `@supabase/supabase-js`, `supabase/config.toml` | Backend platform |
| **Firebase** | `firebase`, `firebase-admin`, `firebase.json` | Backend platform |
| **SQLite** | `node:sqlite`, `sqlite3`, `better-sqlite3` import in source code | Native / DB library |
| **Prisma** | `prisma`, `@prisma/client`, `prisma/schema.prisma` | ORM |
| **Drizzle** | `drizzle-orm`, `drizzle-kit`, `drizzle.config.*` | ORM |
| **Commander** | `commander` in `package.json` | CLI parser |
| **MCP SDK** | `@modelcontextprotocol/sdk` in `package.json` | Protocol SDK |

---

## 🔒 Safety Limits & Ignore Behaviour

The scanner operates within strict configurable bounds (`ScannerConfiguration`):

- **Max Files (`maxFiles`)**: Default `100,000` files. Triggers `FILESYSTEM_LIMIT_EXCEEDED` warning.
- **Max Depth (`maxDepth`)**: Default `50` directories. Triggers `FILESYSTEM_LIMIT_EXCEEDED` warning.
- **Max Manifest Size (`maxManifestSize`)**: Default `2 MB`. Skips oversized manifests safely.
- **Max Text Inspection Size (`maxTextInspectionSize`)**: Default `1 MB`. Skips full inspection for large source files.
- **Git Command Timeout (`gitTimeoutMs`)**: Default `5,000 ms`.
- **Default Ignored Directories**: `.git`, `node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.nuxt`, `.svelte-kit`, `.turbo`, `.cache`, `.parcel-cache`, `.vite`, `target`, `vendor`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.ai-optimize/backups`, `.ai-optimize/staging`, `.ai-optimize/activation.lock`, `.ai-optimize/state.db`.
- **Default Ignored Files**: `*.pyc`, `*.pyo`, `*.so`, `*.dylib`, `*.dll`, `*.exe`, `*.bin`, `*.class`, `*.map`, `*.d.ts.map`, `*.js.map`, `*.db-journal`, `*.db-wal`, `*.db-shm`.

---

## 🩺 Diagnostic Codes

Structured diagnostics are recorded during scanning with stable error codes:

- `FILESYSTEM_PERMISSION_DENIED`: Unreadable directory or file.
- `FILESYSTEM_LIMIT_EXCEEDED`: Exceeded max files or directory depth.
- `FILESYSTEM_SYMLINK_SKIPPED`: Directory symlink skipped or loop detected.
- `MANIFEST_PARSE_FAILED`: Malformed JSON, YAML, or TOML manifest.
- `WORKSPACE_PATTERN_INVALID`: Unmatchable or invalid workspace glob.
- `WORKSPACE_PACKAGE_MISSING_MANIFEST`: Workspace folder lacks `package.json`.
- `GIT_NOT_AVAILABLE`: Repository is not under Git control.
- `GIT_COMMAND_FAILED`: Git command returned non-zero exit code or timed out.
- `UNSUPPORTED_MANIFEST`: Recognized manifest with unsupported structure.
- `SCAN_PARTIAL`: Scan completed with non-fatal diagnostics.
- `SCAN_ABORTED`: Scan terminated due to critical limit or error.

---

## 🎯 Deterministic Guarantees & LLM Separation

1. **Deterministic Output**: Identical repository contents always yield byte-identical scan results (files, package graph, assertions, diagnostics, IDs).
2. **Zero External LLM Dependency**: Architectural synthesis in Pass 5 uses explicit deterministic rules. LLM semantic analysis is strictly separated into higher-level recommendation engines.
3. **Portable Paths**: Portable profile output uses forward slashes (`/`) and repository-relative root (`.`). Canonical absolute paths are restricted to transient runtime context.
4. **Identity Provenance**: All assertion IDs are derived deterministically via SHA-256 (`deriveAssertionId`) using `@ai-optimize/project-identity`.
