import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { ProjectScanner } from "@ai-optimize/project-scanner";
import { ProjectClassifier } from "@ai-optimize/project-classifier";

function createTempDir(prefix: string = "scanner-test-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanTempDir(dirPath: string): void {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe("Milestone 3 — Evidence-Backed Multi-Pass Repository Scanner", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  // Test 1: TypeScript pnpm monorepo
  it("1. TypeScript pnpm monorepo", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "root", private: true }, null, 2)
    );
    const pkgDir = path.join(tmpDir, "packages", "core");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@scope/core", version: "1.0.0", devDependencies: { typescript: "^5.0.0" } })
    );
    fs.writeFileSync(path.join(pkgDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.languages).toContain("typescript");
    expect(result.rich.workspacePackages.length).toBeGreaterThanOrEqual(1);
    expect(result.rich.workspacePackages.some((p) => p.name === "@scope/core")).toBe(true);
    expect(result.rich.packageGraph.nodes.length).toBeGreaterThan(0);
  });

  // Test 2: React and Vite application
  it("2. React and Vite application", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "my-react-app",
        dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
        devDependencies: { vite: "^5.0.0" }
      })
    );
    fs.writeFileSync(path.join(tmpDir, "vite.config.ts"), "export default {};");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.frameworks).toContain("react");
    expect(result.frameworks).toContain("vite");
  });

  // Test 3: Next.js and Supabase application
  it("3. Next.js and Supabase application", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "saas-app",
        dependencies: { next: "^14.0.0", "@supabase/supabase-js": "^2.0.0" }
      })
    );
    fs.writeFileSync(path.join(tmpDir, "next.config.mjs"), "export default {};");
    fs.mkdirSync(path.join(tmpDir, "supabase"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "supabase", "config.toml"), 'project_id = "test-project"');

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.frameworks).toContain("nextjs");
    expect(result.frameworks).toContain("supabase");
  });

  // Test 4: Express backend
  it("4. Express backend", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "express-api", dependencies: { express: "^4.18.0" } })
    );

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.frameworks).toContain("express");
    expect(result.frameworks).not.toContain("fastify");
  });

  // Test 5: Fastify backend
  it("5. Fastify backend", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "fastify-api", dependencies: { fastify: "^4.20.0" } })
    );

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.frameworks).toContain("fastify");
    expect(result.frameworks).not.toContain("express");
  });

  // Test 6: Python project using pyproject.toml
  it("6. Python project using pyproject.toml", () => {
    fs.writeFileSync(
      path.join(tmpDir, "pyproject.toml"),
      '[project]\nname = "my-python-lib"\nversion = "0.1.0"\ndependencies = [\n  "requests>=2.0.0"\n]\n'
    );
    fs.writeFileSync(path.join(tmpDir, "main.py"), 'print("hello")');

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.languages).toContain("python");
    expect(result.rich.manifests.some((m) => m.type === "pyproject.toml")).toBe(true);
  });

  // Test 7: Python project using requirements.txt
  it("7. Python project using requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask==3.0.0\npytest>=7.0.0\n");
    fs.writeFileSync(path.join(tmpDir, "app.py"), "from flask import Flask");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.languages).toContain("python");
    expect(result.rich.manifests.some((m) => m.type === "requirements.txt")).toBe(true);
  });

  // Test 8: Rust Cargo project
  it("8. Rust Cargo project", () => {
    fs.writeFileSync(
      path.join(tmpDir, "Cargo.toml"),
      '[package]\nname = "my-rust-cli"\nversion = "0.1.0"\nedition = "2021"\n'
    );
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "main.rs"), 'fn main() { println!("Hello"); }');

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.languages).toContain("rust");
    expect(result.rich.manifests.some((m) => m.type === "Cargo.toml")).toBe(true);
  });

  // Test 9: Mixed TypeScript and Python monorepo
  it("9. Mixed TypeScript and Python monorepo", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    const tsDir = path.join(tmpDir, "packages", "web");
    fs.mkdirSync(tsDir, { recursive: true });
    fs.writeFileSync(path.join(tsDir, "package.json"), JSON.stringify({ name: "web" }));
    fs.writeFileSync(path.join(tsDir, "index.ts"), "export const x = 1;");

    const pyDir = path.join(tmpDir, "packages", "service");
    fs.mkdirSync(pyDir, { recursive: true });
    fs.writeFileSync(path.join(pyDir, "pyproject.toml"), '[project]\nname = "service"\n');
    fs.writeFileSync(path.join(pyDir, "service.py"), "def run(): pass");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.languages).toContain("typescript");
    expect(result.languages).toContain("python");
  });

  // Test 10: Firebase project
  it("10. Firebase project", () => {
    fs.writeFileSync(
      path.join(tmpDir, "firebase.json"),
      JSON.stringify({ firestore: { rules: "firestore.rules" }, hosting: { public: "public" } })
    );
    fs.writeFileSync(path.join(tmpDir, ".firebaserc"), JSON.stringify({ projects: { default: "my-fb-proj" } }));

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.frameworks).toContain("firebase");
    expect(result.rich.manifests.some((m) => m.type === "firebase.json")).toBe(true);
  });

  // Test 11: Docker Compose project
  it("11. Docker Compose project", () => {
    fs.writeFileSync(path.join(tmpDir, "Dockerfile"), "FROM node:20-alpine\nWORKDIR /app\n");
    fs.writeFileSync(path.join(tmpDir, "docker-compose.yml"), 'version: "3.8"\nservices:\n  app:\n    build: .\n');

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.manifests.some((m) => m.type === "Dockerfile")).toBe(true);
    expect(result.rich.manifests.some((m) => m.type === "docker-compose.yaml")).toBe(true);
  });

  // Test 12: Repository with SQL migrations
  it("12. Repository with SQL migrations", () => {
    const migDir = path.join(tmpDir, "migrations");
    fs.mkdirSync(migDir, { recursive: true });
    fs.writeFileSync(path.join(migDir, "001_create_users.sql"), "CREATE TABLE users (id INT PRIMARY KEY);");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.languages).toContain("sql");
  });

  // Test 13: Malformed package.json
  it("13. Malformed package.json", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), '{ name: "invalid json" ');

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.diagnostics.some((d) => d.code === "MANIFEST_PARSE_FAILED")).toBe(true);
  });

  // Test 14: Malformed workspace configuration
  it("14. Malformed workspace configuration", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "packages: [invalid: yaml: syntax:");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.diagnostics.some((d) => d.code === "MANIFEST_PARSE_FAILED")).toBe(true);
  });

  // Test 15: Malformed TOML
  it("15. Malformed TOML", () => {
    fs.writeFileSync(path.join(tmpDir, "pyproject.toml"), "[invalid toml section header\nkey = val");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.diagnostics.some((d) => d.code === "MANIFEST_PARSE_FAILED")).toBe(true);
  });

  // Test 16: Missing workspace package manifest
  it("16. Missing workspace package manifest", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    const emptyPkgDir = path.join(tmpDir, "packages", "empty-dir");
    fs.mkdirSync(emptyPkgDir, { recursive: true });

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.diagnostics.some((d) => d.code === "WORKSPACE_PACKAGE_MISSING_MANIFEST")).toBe(true);
  });

  // Test 17: Symlink loop or equivalent safe symlink test
  it("17. Symlink loop or equivalent safe symlink test", () => {
    const subDir = path.join(tmpDir, "subdir");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "file.txt"), "hello");

    try {
      fs.symlinkSync(subDir, path.join(subDir, "loop"), "dir");
    } catch {
      // Windows without symlink privileges might fail; skip if OS restricts
      return;
    }

    const scanner = new ProjectScanner({ followSymlinks: false });
    const result = scanner.scan(tmpDir);

    expect(result.files).toBeDefined();
    expect(result.rich.diagnostics.some((d) => d.code === "FILESYSTEM_SYMLINK_SKIPPED")).toBe(true);
  });

  // Test 18: Unreadable path handling
  it("18. Unreadable path handling", () => {
    const subDir = path.join(tmpDir, "restricted");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "secret.txt"), "data");

    // Try setting 000 permissions on POSIX
    try {
      fs.chmodSync(subDir, 0o000);
    } catch {
      // Permission changes might not apply on Windows, test safely
    }

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.files).toBeDefined();

    // Restore permissions for cleanup
    try {
      fs.chmodSync(subDir, 0o755);
    } catch {}
  });

  // Test 19: Repository without Git
  it("19. Repository without Git", () => {
    fs.writeFileSync(path.join(tmpDir, "index.js"), "console.log('no git');");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.gitSummary).toBeNull();
    expect(result.rich.diagnostics.some((d) => d.code === "GIT_NOT_AVAILABLE")).toBe(true);
  });

  // Test 20: Git repository with uncommitted files
  it("20. Git repository with uncommitted files", () => {
    fs.writeFileSync(path.join(tmpDir, "index.js"), "console.log('git repo');");

    try {
      execFileSync("git", ["init"], { cwd: tmpDir, stdio: "ignore" });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: tmpDir, stdio: "ignore" });
      execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tmpDir, stdio: "ignore" });
    } catch {
      return; // Git CLI not available in test environment
    }

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    expect(result.rich.gitSummary).not.toBeNull();
    expect(result.rich.gitSummary?.isClean).toBe(false);
  });

  // Test 21: Scan limit exceeded
  it("21. Scan limit exceeded", () => {
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(tmpDir, `file_${i}.txt`), `content ${i}`);
    }

    const scanner = new ProjectScanner({ maxFiles: 3 });
    const result = scanner.scan(tmpDir);

    expect(result.files.length).toBeLessThanOrEqual(3);
    expect(result.rich.diagnostics.some((d) => d.code === "FILESYSTEM_LIMIT_EXCEEDED")).toBe(true);
  });

  // Test 22: Deep directory limit
  it("22. Deep directory limit", () => {
    const deepPath = path.join(tmpDir, "a", "b", "c", "d", "e");
    fs.mkdirSync(deepPath, { recursive: true });
    fs.writeFileSync(path.join(deepPath, "deep.txt"), "too deep");

    const scanner = new ProjectScanner({ maxDepth: 2 });
    const result = scanner.scan(tmpDir);

    expect(result.rich.diagnostics.some((d) => d.code === "FILESYSTEM_LIMIT_EXCEEDED")).toBe(true);
  });

  // Test 23: Binary file avoidance
  it("23. Binary file avoidance", () => {
    const binPath = path.join(tmpDir, "test.png");
    fs.writeFileSync(binPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    const binFile = result.rich.files.find((f) => f.name === "test.png");
    expect(binFile).toBeDefined();
    expect(binFile?.isBinary).toBe(true);
  });

  // Test 24: Deterministic repeated scan
  it("24. Deterministic repeated scan", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "det-test" }));
    fs.writeFileSync(path.join(tmpDir, "index.ts"), "export const a = 1;");
    fs.writeFileSync(path.join(tmpDir, "utils.ts"), "export const b = 2;");

    const scanner = new ProjectScanner();
    const result1 = scanner.scan(tmpDir);
    const result2 = scanner.scan(tmpDir);

    expect(result1.files).toEqual(result2.files);
    expect(result1.languages).toEqual(result2.languages);
    expect(result1.frameworks).toEqual(result2.frameworks);
    expect(result1.dependencies).toEqual(result2.dependencies);

    // Compare assertion IDs and content
    const ids1 = result1.assertions.map((a) => a.id).sort();
    const ids2 = result2.assertions.map((a) => a.id).sort();
    expect(ids1).toEqual(ids2);
  });

  // Test 25: Windows and POSIX path normalisation
  it("25. Windows and POSIX path normalisation", () => {
    const subDir = path.join(tmpDir, "src", "nested");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "app.ts"), "console.log('nested');");

    const scanner = new ProjectScanner();
    const result = scanner.scan(tmpDir);

    for (const f of result.rich.files) {
      expect(f.relativePath).not.toContain("\\");
    }
  });

  // Test 26: AI Optimize self-scan
  it("26. AI Optimize self-scan reconciliation and package-owned technology proof", () => {
    const root = path.resolve(".");
    const scanner = new ProjectScanner();
    const classifier = new ProjectClassifier();

    const scanResult = scanner.scan(root);
    const profile = classifier.classify(scanResult, { projectId: "prj_TESTFIXEDID0001" });

    // 1. Authoritative workspace count and package graph nodes
    expect(scanResult.rich.workspacePackages.length).toBe(17);
    expect(scanResult.rich.packageGraph.nodes.length).toBe(17);

    // Distinct counts for non-package units
    expect(scanResult.rich.expertPacks.length).toBeGreaterThan(0);
    expect(scanResult.rich.repositoryUnits.length).toBeGreaterThan(17);

    // 2. Explicit technology ownership assertions
    const techs = scanResult.rich.technologies;

    const reactTech = techs.find((t) => t.id === "react");
    expect(reactTech).toBeDefined();
    expect(reactTech?.owningPackage).toBe("@ai-optimize/dashboard");
    expect(reactTech?.owningPackageDir).toBe("apps/dashboard");

    const viteTech = techs.find((t) => t.id === "vite");
    expect(viteTech).toBeDefined();
    expect(viteTech?.owningPackage).toBe("@ai-optimize/dashboard");
    expect(viteTech?.owningPackageDir).toBe("apps/dashboard");

    const fastifyTech = techs.find((t) => t.id === "fastify");
    expect(fastifyTech).toBeDefined();
    expect(fastifyTech?.owningPackage).toBe("@ai-optimize/daemon");
    expect(fastifyTech?.owningPackageDir).toBe("apps/daemon");

    const commanderTech = techs.find((t) => t.id === "commander");
    expect(commanderTech).toBeDefined();
    expect(commanderTech?.owningPackage).toBe("@ai-optimize/cli");
    expect(commanderTech?.owningPackageDir).toBe("apps/cli");

    const vitestTech = techs.find((t) => t.id === "vitest");
    expect(vitestTech).toBeDefined();
    expect(vitestTech?.owningPackage).toBe("ai-optimize-monorepo");
    expect(vitestTech?.owningPackageDir).toBe(".");

    const sqliteTech = techs.find((t) => t.id === "node:sqlite");
    expect(sqliteTech).toBeDefined();
    expect(sqliteTech?.owningPackage).toBe("@ai-optimize/memory-engine");
    expect(sqliteTech?.owningPackageDir).toBe("packages/memory-engine");
    expect(sqliteTech?.sourcePath).toBe("packages/memory-engine/src/index.ts");

    const pnpmTech = techs.find((t) => t.id === "pnpm");
    expect(pnpmTech).toBeDefined();
    expect(pnpmTech?.owningPackage).toBe("ai-optimize-monorepo");
    expect(pnpmTech?.sourcePath).toBe("pnpm-workspace.yaml");

    // TypeScript ownership across packages
    const tsTechs = techs.filter((t) => t.id === "typescript");
    expect(tsTechs.length).toBe(17);

    // 3. Express is NOT detected
    expect(scanResult.frameworks).not.toContain("express");
    expect(techs.some((t) => t.id === "express")).toBe(false);

    // 4. Duplicate pattern match provenance
    const claudeCodePkg = scanResult.rich.workspacePackages.find((p) => p.relativeDir === "packages/adapters/claude-code");
    expect(claudeCodePkg).toBeDefined();
    expect(claudeCodePkg?.matchedBy).toContain("pnpm-workspace.yaml:packages/adapters/*");

    // Profile verification
    expect(profile.project.name).toBe("ai-optimizer");
    expect(profile.project.root).toBe(".");
    expect(profile.project.id).toBe("prj_TESTFIXEDID0001");
  });
});
