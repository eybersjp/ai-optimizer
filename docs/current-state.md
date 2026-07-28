# AI Optimize - Current Implementation State

## 1. Genuinely Implemented

The following components are fully operational, tested, and integrated into the build pipeline:

- **Monorepo Architecture**: 16 workspace projects managed via pnpm, compiled using TypeScript with strict mode.
- **Provider-Neutral Domain Contracts (`@ai-optimize/contracts`)**: Complete Zod schemas and type definitions for project profiles, evidence assertions, expert packs, compiler output, activation results, and adapter interfaces.
- **4-Pass Repository Scanner (`@ai-optimize/project-scanner`)**:
  - Pass 1 (Filesystem Walk): Recursive file discovery ignoring dependencies and build outputs.
  - Pass 2 (Dependencies & Stack): Manifest parsing (`package.json`) mapping languages and frameworks (`react`, `nextjs`, `fastify`, `supabase`, `vitest`).
  - Pass 3 (Topology): Monorepo vs. single-package detection via `pnpm-workspace.yaml` / `lerna.json`.
  - Pass 4 (Git Check): Detection of `.git` repository directory.
- **Traceable Assertion Engine (`@ai-optimize/evidence-engine`)**: Assertion builder storing status (`observed`, `inferred`, `recommended`, `unresolved`), confidence scores, and source file/line provenance.
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

## 4. Current Test Coverage

- **Integration Tests**: 3 test suites in `tests/`:
  - `tests/scanner.test.ts`: Verifies project scanning and classification on the repository workspace.
  - `tests/compiler.test.ts`: Verifies end-to-end profile compilation and artifact generation for Claude Code & VS Code.
  - `tests/activation.test.ts`: Verifies transactional activation, backup snapshot creation, and full rollback in an isolated temporary directory.
- **Unit Test Coverage**: Package-level unit tests (`packages/*`) are currently unwritten.

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
