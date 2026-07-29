# AI Optimize - Current Implementation State

## 1. Genuinely Implemented

The following components are fully operational, tested, and integrated into the build pipeline:

- **Monorepo Architecture**: 17 workspace projects managed via pnpm (1 root + 3 apps + 13 packages), compiled using TypeScript with strict mode.
- **Provider-Neutral Domain Contracts (`@ai-optimize/contracts`)**: Complete Zod schemas and type definitions for project profiles, evidence assertions, expert packs, compiler output, activation results, and adapter interfaces.
- **5-Pass Evidence-Backed Repository Scanner (`@ai-optimize/project-scanner`)**:
  - Pass 1 (Safe Filesystem Walk): Bounded file discovery ignoring build outputs and temp state, with symlink loop detection and path normalisation.
  - Pass 2 (Manifests & Tech): Discovers and parses manifests (`package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `Dockerfile`, `compose.yaml`, `firebase.json`, `supabase/config.toml`, etc.) mapping 13+ languages and 17+ frameworks (`react`, `nextjs`, `vite`, `express`, `fastify`, `vitest`, `sqlite`, `supabase`, `firebase`, etc.) with explicit package ownership (`owningPackage`, `owningPackageDir`, `sourcePath`, `evidenceId`). Deduplicates pnpm workspace package discovery (17 authoritative workspace packages) and distinguishes non-package repository units, expert packs, applications, libraries, and configuration units.
  - Pass 3 (Topology & Graph): Expands workspace patterns with pattern provenance (`matchedBy`), builds package graph (`nodes`, `edges`), enforces graph invariants, assigns package roles, and detects topology type (`single-package`, `monorepo`, `multi-application`, `mixed-language`).
  - Pass 4 (Safe Git Intelligence): Non-interpolated child process execution collecting branch, HEAD, commit SHA, dirty state, redacted remotes, and recent commits (max 10).
  - Pass 5 (Deterministic Architectural Synthesis): Rule-based architectural synthesis (`monorepo`, `frontend-backend-separation`, `shared-contracts`, `adapter-architecture`, `test-framework`, `database-presence`) with explicit confidence scores and supporting evidence references.
- **Traceable Assertion Engine (`@ai-optimize/evidence-engine`)**: Assertion builder storing status (`observed`, `inferred`, `recommended`, `unresolved`), confidence scores, and source file/line provenance. Deterministic assertion IDs generated via `@ai-optimize/project-identity`.
- **Archetype Classifier (`@ai-optimize/project-classifier`)**: Stack-to-archetype classifier mapping findings to active expert pack lists.
- **Expert Pack Engine (`@ai-optimize/expert-engine`)**: YAML pack loader (`pack.yaml`) for 8 built-in expert packs.
- **Recommendation Engine (`@ai-optimize/recommendation-engine`)**: Generates rule-based and evidence-inferred recommendations.
- **Pure Profile Compiler (`@ai-optimize/profile-compiler`)**: Compiles canonical `.ai-optimize/project-profile.json` and dispatches to registered adapters.
- **Claude Code Adapter (`@ai-optimize/adapter-claude-code`)**: Generates `CLAUDE.md`, `.claude/rules/architecture.md`, and `.claude/settings.json` with 200-line limit validation.
- **VS Code Adapter (`@ai-optimize/adapter-vscode`)**: Generates managed settings blocks for `.vscode/settings.json`.
- **Transactional Activation Engine (`@ai-optimize/activation-engine`)**: Lock file creation (`activation.lock`), SHA-256 backup snapshot creation (`.ai-optimize/backups/`), managed artifact tracking (`managed-artifacts.json`), atomic file writing, and automated rollback on failure.
- **Memory Engine (`@ai-optimize/memory-engine`)**: JSONL event stream logging (`.ai-optimize/events.jsonl`) indexed with Node.js 24 native `node:sqlite` (`DatabaseSync`).
- **CLI (`apps/cli`)**: Commander CLI (`ai-optimize`) implementing 9 core commands (`init`, `analyse`, `explain`, `recommendations`, `compile`, `diff`, `activate`, `status`, `rollback`).
- **Fastify Daemon API (`apps/daemon`)**: REST daemon listening on `http://127.0.0.1:4737`.
- **React Dashboard (`apps/dashboard`)**: Vite + React single page interface displaying project status, findings, recommendations, and activation state.

---

## 2. Partially Implemented

- **Scanner Pass 4 & Pass 5**: Pass 4 only checks for `.git` folder existence rather than parsing git status/history; Pass 5 (Semantic Inspection) is a stub.
- **Model Context Protocol Server (`@ai-optimize/mcp-server`)**: Handler methods for `project_get_profile`, `project_get_context_capsule`, and `configuration_get_status` exist, but stdio transport server runner is missing.
- **VS Code Managed Block Patching**: Generates managed section strings with `//` comment markers which violate strict standard JSON format.
- **Dashboard UI**: Renders static UI tabs for visualization rather than live streaming daemon REST API data.

---

## 3. Described in README Only

- **Autonomous 5-pass Git Branch Analysis**: Deep git commit and branch summary extraction without sending full history to LLMs.
- **Multi-tenant Security Pack Validators**: Advanced tenant isolation AST code analysis.
- **Live MCP Host Governance**: Active host-side tool execution in external agent runtime sessions.

---

## 4. Current Test Coverage & Verification

- **Authoritative Subsystem Test Inventory** (`pnpm test:list`, `pnpm verify`):
  - `tests/activation.test.ts` (Subsystem: `activation`, 1 test)
  - `tests/classifier.test.ts` (Subsystem: `classifier`, 4 tests)
  - `tests/compiler.test.ts` (Subsystem: `compiler`, 8 tests)
  - `tests/identity.test.ts` (Subsystem: `identity`, 57 tests)
  - `tests/identity-hardening.test.ts` (Subsystem: `identity hardening`, 9 tests)
  - `tests/scanner.test.ts` (Subsystem: `scanner`, 26 tests)
  - `tests/audit-verification.test.ts` (Subsystem: `audit verification`, 7 tests)
- **Total Test Suite**: 7 test files, 112 tests, 100% PASSING.
- **Verification Runner** (`pnpm verify`): Executes `pnpm build`, `pnpm test`, `pnpm lint`, `git diff --check`, and outputs machine-readable test inventory.

---

## 5. Current Safety Limitations

- **Managed Project Identity**: A dedicated `@ai-optimize/project-identity` package handles creation, loading, validation, migration, and reconciliation of canonical project identity. The identity is persisted in `.ai-optimize/project.json` (versioned schema, `prj_` prefix, crypto-generated IDs).
- **Deterministic Assertion IDs**: `EvidenceEngine` now derives assertion IDs via SHA-256 from stable canonical fields (projectId, scannerRuleId, subject, predicate, etc.), replacing the old timestamp+random approach. `Math.random()` is eliminated from all identity-related production code.
- **Deterministic Compilation**: `ProfileCompiler` produces byte-identical outputs for identical canonical inputs. Adapter ordering, artifact ordering, and JSON serialisation are all deterministic. No compile-time timestamps or random values appear in generated artifacts.
- **Crypto-based Identifiers**: All identifier generators (`generateProjectId`, `generateActivationId`, `generateBackupId`, `generateEventId`, `generateCorrelationId`) use `node:crypto.randomBytes()` instead of `Math.random()`.
- **Legacy Migration**: Repositories without `.ai-optimize/project.json` are auto-migrated. Candidates are discovered from project-profile.json, managed-artifacts.json, events.jsonl, and backup snapshots. Conflicts are surfaced as `IDENTITY_CONFLICT` with structured error details.
- **Controlled Reconciliation**: `ai-optimize identity status` and `ai-optimize identity reconcile --use <id>` commands allow safe resolution of conflicting project IDs. Superseded IDs are preserved in the `aliases` array.
- **Typed Identity Errors**: Structured error codes (`PROJECT_NOT_REGISTERED`, `IDENTITY_CONFLICT`, `IDENTITY_FILE_INVALID`, `IDENTITY_RECONCILIATION_REQUIRED`, `IDENTITY_RECONCILIATION_FAILED`, `REGISTERED_ROOT_MISMATCH`) replace generic string errors.

### Known Limitations
- **Locking Concurrency**: File-based locking (`activation.lock`) uses non-atomic file presence checks.
- **Daemon Security**: The Fastify daemon API listens on local port `4737` without request authentication or authorization tokens.
- **JSON Formatting in `.vscode/settings.json`**: Insertion of comment markers into VS Code configuration can cause errors in non-comment-aware JSON parsers.
- **Scanner Pass 4 & 5**: Pass 4 only checks for `.git` folder existence; Pass 5 (Semantic Inspection) is a stub.
