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

## Known Defects
1. **Missing workspace package manifest**: `packages/mcp-server` was missing `package.json`, excluding it from pnpm workspace builds. *(Fixed in baseline)*.
2. **Root lint script failure**: Root `package.json` `lint` script executed `tsc --noEmit` from root, failing on workspace cross-package imports and JSX syntax. *(Fixed to `pnpm -r exec tsc --noEmit` in baseline)*.
3. **Implicit `any` in test suite**: `tests/compiler.test.ts` contained untyped predicate parameters in `Array.prototype.find`. *(Fixed in baseline)*.
4. **Non-deterministic ID generation**: `ProjectClassifier`, `EvidenceEngine`, and `ActivationEngine` generate IDs using `Math.random()` and `Date.now()`, violating strict compilation determinism.
5. **Invalid JSON syntax in VSCode adapter**: `VSCodeAdapter` generates managed blocks with `//` single-line comments in `.vscode/settings.json`, causing strict JSON parsers to fail.
6. **Incomplete Scanner Passes**: Scanner Pass 4 (Git Inspection) only checks `.git` directory existence; Pass 5 (Semantic Inspection) is not implemented.
7. **Lack of stdio MCP Transport**: `@ai-optimize/mcp-server` implements tool logic but lacks a stdio server entry point for external AI host connections.

---

## Decisions Made During Implementation
- Added `packages/mcp-server/package.json` to integrate `@ai-optimize/mcp-server` into the 16-project pnpm workspace.
- Updated root `package.json` `lint` command to `pnpm -r exec tsc --noEmit`.
- Annotated callback signatures in `tests/compiler.test.ts` and explicit ESM file extension in `apps/dashboard/src/main.tsx`.
- Created and checked out baseline development branch `dev/trustworthy-core-v0.1.1`.

---

## Unresolved Issues
- Non-deterministic ID generation in classifier, evidence engine, and activation engine.
- Scanner Pass 4 and Pass 5 completeness.
- Invalid JSON comment syntax in VSCode managed settings block.
- Lack of standalone CLI stdio transport entry point for `mcp-server`.
- Unit test coverage gaps for individual packages.

---

## Completed Milestones
- **Baseline Milestone**: Established trustworthy core development baseline (`dev/trustworthy-core-v0.1.1`). 100% passing build (`pnpm build`), test suite (`pnpm test`), and typecheck (`pnpm lint`).
