# AI Optimize - Project Memory

## Product Purpose
AI Optimize is a local-first, provider-neutral configuration compiler and governance system for AI coding environments.
Instead of operating as an autonomous coding agent, AI Optimize acts as an evidence-backed compiler layer that analyzes local repositories, infers architectural contracts, activates expert knowledge packs, and transactionally manages IDE and agent configurations with hash-verified rollback capabilities.

---

## Architectural Constraints
- **Language & Runtime**: TypeScript with strict mode (`"strict": true`), running on Node.js 24 (`v24.13.0`).
- **Package Manager**: `pnpm` monorepo (16 workspace projects).
- **Storage & State**: Local-first operation. Native Node.js `node:sqlite` via `DatabaseSync`.
- **Database Restrictions**: No Prisma, No Drizzle, No external SQLite drivers or cloud database ORMs.
- **Dependencies**: No unnecessary cloud dependencies.
- **Domain Contracts**: Provider-neutral Zod contracts in `@ai-optimize/contracts`.
- **Integration**: AI provider integrations must use isolated adapters (`@ai-optimize/adapter-claude-code`, `@ai-optimize/adapter-vscode`).
- **Compilation**: Deterministic compilation (`compile(input) => output`).
- **Evidence & Governance**: All architectural assertions must be evidence-backed with traceable provenance.
- **Activation**: Transaction-safe configuration activation with atomic snapshots and automated rollback.
- **Code Quality**: No mock implementations in production code; no `TODO` placeholders for required behavior.
- **Compatibility**: Preserve backwards compatibility unless a documented defect requires a breaking change.

---

## Current Packages and Applications

### Applications (`apps/`)
- `apps/cli` (`@ai-optimize/cli`): Commander.js CLI binary (`ai-optimize`) providing `init`, `analyse`, `explain`, `recommendations`, `compile`, `diff`, `activate`, `status`, and `rollback` commands.
- `apps/daemon` (`@ai-optimize/daemon`): Fastify REST Daemon API listening on `http://127.0.0.1:4737` exposing endpoints for scanning, compilation, activation, and memory logging.
- `apps/dashboard` (`@ai-optimize/dashboard`): React + Vite local web interface for project state, evidence assertions, and activation governance.

### Core Packages (`packages/`)
- `packages/contracts` (`@ai-optimize/contracts`): Provider-neutral Zod domain contracts and TypeScript types.
- `packages/project-scanner` (`@ai-optimize/project-scanner`): Autonomous multi-pass project scanner.
- `packages/project-classifier` (`@ai-optimize/project-classifier`): Archetype and maturity classifier mapping stack findings to expert packs.
- `packages/evidence-engine` (`@ai-optimize/evidence-engine`): Assertion engine tracking subject-predicate observations with confidence and provenance.
- `packages/expert-engine` (`@ai-optimize/expert-engine`): Built-in and custom Expert Pack loader and active pack resolver.
- `packages/recommendation-engine` (`@ai-optimize/recommendation-engine`): Deterministic and inference-based project recommendation generator.
- `packages/profile-compiler` (`@ai-optimize/profile-compiler`): Pure function configuration compiler dispatching to registered adapters.
- `packages/activation-engine` (`@ai-optimize/activation-engine`): Transactional lock, SHA-256 backup snapshot creator, managed block patcher, atomic replacer, and rollback engine.
- `packages/memory-engine` (`@ai-optimize/memory-engine`): JSONL event stream logger (`.ai-optimize/events.jsonl`) indexed in native `node:sqlite`.
- `packages/mcp-server` (`@ai-optimize/mcp-server`): Model Context Protocol server exposing project profile tools and resources.

### Adapters (`packages/adapters/`)
- `packages/adapters/claude-code` (`@ai-optimize/adapter-claude-code`): Adapter generating `CLAUDE.md`, `.claude/rules/architecture.md`, and `.claude/settings.json` with 200-line limit validation.
- `packages/adapters/vscode` (`@ai-optimize/adapter-vscode`): Adapter generating managed configuration blocks for `.vscode/settings.json`.

### Expert Packs (`expert-packs/`)
- Built-in executable packs: `core-software`, `typescript`, `github`, `testing`, `security`, `design-taste`, `impeccable-design`, `motion-design`.

---

## Known Defects and Resolved Issues

### Resolved (Milestone 2)
1. **Non-deterministic ID generation** — fixed by creating `@ai-optimize/project-identity` package. All IDs (`prj_`, `act_`, `bk_`, `evt_`, `cor_`, `ast_`) now use `node:crypto.randomBytes()` and SHA-256. `Math.random()` is eliminated from all identity-related production source files.
2. **Assertion IDs not deterministic** — `EvidenceEngine` derives assertion IDs from stable canonical fields (projectId, scannerRuleId, subject, predicate, canonicalSourcePath) via SHA-256. Identical inputs produce identical `ast_` IDs.
3. **Compilation not deterministic** — `ProfileCompiler` ensures stable adapter ordering, artifact sorting, and LF-terminated 2-space-indent JSON serialisation. Identical compile inputs produce byte-identical compile outputs.
4. **Classifier generated its own project IDs** — `ProjectClassifier.classify()` now takes a required `ClassifyOptions` parameter with `projectId` from the canonical identity service. It never generates project IDs.
5. **CLI ran fresh scan+classify on every command** — All 9 CLI commands and all 7 daemon endpoints now load canonical identity and pass the same `projectId` through classification and compilation.
6. **Inconsistent project IDs in checked-in state** — The current repository had `prj_HJCZZU3X` (managed-artifacts) and `prj_5IKAG2Z3` (project-profile). Reconciled to `prj_HJCZZU3X` as canonical with `prj_5IKAG2Z3` as a superseded alias in `.ai-optimize/project.json`.

### Remaining Defects
7. **Invalid JSON syntax in VSCode adapter**: `VSCodeAdapter` generates managed blocks with `//` single-line comments in `.vscode/settings.json`, causing strict JSON parsers to fail.
8. **Incomplete Scanner Passes**: Scanner Pass 4 (Git Inspection) only checks `.git` directory existence; Pass 5 (Semantic Inspection) is not implemented.
9. **Lack of stdio MCP Transport**: `@ai-optimize/mcp-server` implements tool logic but lacks a stdio server entry point for external AI host connections.

---

## Decisions Made During Implementation
- Added `packages/mcp-server/package.json` to integrate `@ai-optimize/mcp-server` into the 16-project pnpm workspace.
- Updated root `package.json` `lint` command to `pnpm -r exec tsc --noEmit`.
- Annotated callback signatures in `tests/compiler.test.ts` and explicit ESM file extension in `apps/dashboard/src/main.tsx`.
- Created and checked out baseline development branch `dev/trustworthy-core-v0.1.1`.
- Created `packages/project-identity` as a separate domain service package for canonical project identity management. Chose a dedicated package over inline identity logic to maintain a clean dependency boundary.
- `project.json` (`.ai-optimize/project.json`) is NOT gitignored because it represents canonical project identity that must travel with the repository. It is committed and versioned alongside `project-profile.json`. Unlike backups and lock files (ephemeral runtime state), `project.json` is the single source of truth for stable project ID across all operations, migrations, and clones.
- Selected `prj_HJCZZU3X` as the canonical project ID for this repository because it is the consistent identity across all five managed-artifact records (`managed-artifacts.json`), while `prj_5IKAG2Z3` only appeared in a single generated profile.
- Identity tests operate on isolated temporary directories (`fs.mkdtempSync`) to avoid depending on the developer's actual checkout path or committed local runtime state.

---

## Unresolved Issues
- Scanner Pass 4 and Pass 5 completeness.
- Invalid JSON comment syntax in VSCode managed settings block.
- Lack of standalone CLI stdio transport entry point for `mcp-server`.
- Unit test coverage gaps for individual packages.

---

## Completed Milestones
- **Baseline Milestone**: Established trustworthy core development baseline (`dev/trustworthy-core-v0.1.1`). 100% passing build (`pnpm build`), test suite (`pnpm test`), and typecheck (`pnpm lint`).
- **Milestone 2 (Stable and Deterministic Project Identity)**: Created `@ai-optimize/project-identity` package with crypto-based ID generation, stable assertion IDs, deterministic compilation, legacy migration, controlled reconciliation, typed identity errors, and 17+ comprehensive identity tests. Branch: `dev/trustworthy-core-v0.1.1`.
