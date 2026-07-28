import * as fs from "node:fs";
import * as path from "node:path";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";
import { ProjectAssertion } from "@ai-optimize/contracts";

export interface ScanResult {
  root: string;
  files: string[];
  manifests: Record<string, any>;
  dependencies: string[];
  frameworks: string[];
  languages: string[];
  assertions: ProjectAssertion[];
}

export class ProjectScanner {
  private ignoreDirs = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    ".venv",
    "vendor"
  ]);

  public scan(projectRoot: string): ScanResult {
    const evidenceEngine = new EvidenceEngine();
    const resolvedRoot = path.resolve(projectRoot);

    if (!fs.existsSync(resolvedRoot)) {
      throw new Error(`Project root directory does not exist: ${resolvedRoot}`);
    }

    // Pass 1: Filesystem Discovery
    const files: string[] = [];
    this.walkDirectory(resolvedRoot, "", files);

    evidenceEngine.createAssertion({
      subject: "filesystem",
      predicate: "total-files",
      value: files.length,
      status: "observed",
      confidence: 1.0,
      sources: [{ file: ".", reason: "Directory walk scan" }],
      explanation: `Discovered ${files.length} files in repository`
    });

    // Pass 2: Dependency & Stack Analysis
    const manifests: Record<string, any> = {};
    const dependencies = new Set<string>();
    const frameworks = new Set<string>();
    const languages = new Set<string>();

    const packageJsonPath = path.join(resolvedRoot, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        manifests["package.json"] = pkg;
        languages.add("typescript");

        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies
        };

        for (const dep of Object.keys(allDeps)) {
          dependencies.add(dep);
        }

        // Framework Detection mapping
        if (allDeps["next"]) frameworks.add("nextjs");
        if (allDeps["react"]) frameworks.add("react");
        if (allDeps["express"] || allDeps["fastify"]) frameworks.add("fastify");
        if (allDeps["@supabase/supabase-js"]) frameworks.add("supabase");
        if (allDeps["firebase"]) frameworks.add("firebase");
        if (allDeps["vitest"] || allDeps["jest"]) frameworks.add("vitest");

        evidenceEngine.createAssertion({
          subject: "stack",
          predicate: "package-manifest",
          value: { name: pkg.name, version: pkg.version },
          status: "observed",
          confidence: 1.0,
          sources: [{ file: "package.json", reason: "Read package.json dependencies" }],
          explanation: `Package manifest found with ${Object.keys(allDeps).length} dependencies`
        });
      } catch (err: any) {
        // Ignore JSON parse errors gracefully
      }
    }

    // Pass 3: Topology Analysis
    const pnpmWorkspacePath = path.join(resolvedRoot, "pnpm-workspace.yaml");
    const isMonorepo = fs.existsSync(pnpmWorkspacePath) || fs.existsSync(path.join(resolvedRoot, "lerna.json"));

    evidenceEngine.createAssertion({
      subject: "architecture",
      predicate: "repository-topology",
      value: isMonorepo ? "monorepo" : "single-package",
      status: "observed",
      confidence: 1.0,
      sources: isMonorepo
        ? [{ file: "pnpm-workspace.yaml", reason: "Found workspace config file" }]
        : [{ file: "package.json", reason: "Single package root" }],
      explanation: isMonorepo
        ? "Monorepo topology detected via workspace config"
        : "Single package repository structure"
    });

    // Pass 4: Git Summary
    const gitDir = path.join(resolvedRoot, ".git");
    const hasGit = fs.existsSync(gitDir);
    if (hasGit) {
      evidenceEngine.createAssertion({
        subject: "vcs",
        predicate: "git-repository",
        value: true,
        status: "observed",
        confidence: 1.0,
        sources: [{ file: ".git", reason: ".git directory present" }],
        explanation: "Git version control system identified"
      });
    }

    return {
      root: resolvedRoot,
      files,
      manifests,
      dependencies: Array.from(dependencies),
      frameworks: Array.from(frameworks),
      languages: Array.from(languages),
      assertions: evidenceEngine.getAssertions()
    };
  }

  private walkDirectory(currentDir: string, relativePath: string, fileList: string[]): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (this.ignoreDirs.has(entry.name)) continue;

      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        this.walkDirectory(fullPath, relPath, fileList);
      } else {
        fileList.push(relPath);
      }
    }
  }
}
