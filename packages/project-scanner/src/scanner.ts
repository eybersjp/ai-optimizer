/**
 * ProjectScanner — Multi-pass repository intelligence engine.
 *
 * Orchestrates 5 deterministic passes:
 *   1. Safe Filesystem Discovery
 *   2. Manifest and Technology Discovery
 *   3. Repository Topology and Package Graph
 *   4. Safe Git Intelligence
 *   5. Deterministic Architectural Synthesis
 *
 * Public API is the `scan()` method which returns a backwards-compatible ScanResult.
 */
import * as fs from "node:fs";
import type { ProjectAssertion } from "@ai-optimize/contracts";
import type {
  ScannerPass,
  ScannerContext,
  ScannerPassResult,
  ScannerConfiguration,
  ScannerDiagnostic,
  RepositoryFile,
  ManifestFinding,
  WorkspacePackage,
  PackageGraph,
  GitSummary,
  ArchitectureFinding,
  NewScanResult
} from "./contracts.js";
import { identityFilePath, deriveAssertionId } from "@ai-optimize/project-identity";
import { DEFAULT_SCANNER_CONFIG } from "./configuration.js";
import { FilesystemPass } from "./filesystem/filesystem-pass.js";
import { ManifestPass } from "./manifests/manifest-pass.js";
import { TopologyPass } from "./topology/topology-pass.js";
import { GitPass } from "./git/git-pass.js";
import { ArchitecturePass } from "./architecture/architecture-pass.js";

/** Backwards-compatible scan result that maps rich data into the legacy shape. */
export interface ScanResult {
  root: string;
  files: string[];
  manifests: Record<string, unknown>;
  dependencies: string[];
  frameworks: string[];
  languages: string[];
  assertions: ProjectAssertion[];

  /** Rich scan data (new fields). */
  rich: NewScanResult;
}

export class ProjectScanner {
  private config: ScannerConfiguration;
  private passes: ScannerPass[];

  constructor(config?: Partial<ScannerConfiguration>) {
    this.config = { ...DEFAULT_SCANNER_CONFIG, ...config };

    this.passes = [
      new FilesystemPass(this.config),
      new ManifestPass(this.config),
      new TopologyPass(this.config),
      new GitPass(this.config),
      new ArchitecturePass(this.config)
    ];
  }

  /**
   * Scan a project root and return a backwards-compatible ScanResult.
   */
  public scan(projectRoot: string, extraIgnores?: string[], options?: { projectId?: string }): ScanResult {
    const resolvedRoot = projectRoot;

    // Resolve project ID from identity service if available
    let projectId: string = options?.projectId ?? "";
    if (!projectId) {
      try {
        const idPath = identityFilePath(resolvedRoot);
        if (fs.existsSync(idPath)) {
          const raw = JSON.parse(fs.readFileSync(idPath, "utf-8"));
          projectId = raw.projectId ?? "prj_unregistered";
        } else {
          projectId = "prj_unregistered";
        }
      } catch {
        projectId = "prj_unregistered";
      }
    }

    // Build context
    const context: ScannerContext = {
      root: resolvedRoot,
      rootRelative: ".",
      config: this.config,
      extraIgnores: extraIgnores ?? [],
      files: [],
      assertions: [],
      diagnostics: [],
      manifests: [],
      workspacePackages: [],
      packageGraph: { nodes: [], edges: [] },
      gitSummary: null,
      architectureFindings: [],
      languages: new Set(),
      frameworks: new Map(),
      timing: {},
      filesInspected: 0,
      filesSkipped: 0,
      manifestsParsed: 0,
      diagnosticsCount: 0
    };

    // Run passes in sequence
    for (const pass of this.passes) {
      const start = Date.now();
      const result = pass.run(context);
      const elapsed = Date.now() - start;

      // Merge pass results into context
      context.files = result.files ?? context.files;
      context.assertions.push(...result.assertions);
      context.diagnostics.push(...result.diagnostics);
      context.manifests.push(...(result as any).manifests ?? []);
      context.workspacePackages.push(...(result as any).workspacePackages ?? []);
      if ((result as any).packageGraph) {
        context.packageGraph = (result as any).packageGraph;
      }
      if ((result as any).gitSummary) {
        context.gitSummary = (result as any).gitSummary;
      }
      context.architectureFindings.push(...(result as any).architectureFindings ?? []);
      if ((result as any).languages) {
        for (const lang of (result as any).languages as Set<string>) {
          context.languages.add(lang);
        }
      }
      if ((result as any).frameworks) {
        for (const [k, v] of (result as any).frameworks as Map<string, string>) {
          context.frameworks.set(k, v);
        }
      }
      context.filesInspected += (result as any).filesInspected ?? 0;
      context.filesSkipped += (result as any).filesSkipped ?? 0;
      context.manifestsParsed += (result as any).manifestsParsed ?? 0;
      context.diagnosticsCount += result.diagnostics.length;
      context.timing[pass.id] = elapsed;

      // Check for abort
      if (result.aborted) {
        context.diagnostics.push({
          code: "SCAN_ABORTED",
          severity: "error",
          passId: pass.id,
          message: `Pass '${pass.id}' aborted: ${result.abortedReason ?? "unknown reason"}`,
          path: undefined,
          recoverable: true,
          details: undefined,
          remediation: undefined
        });
        break;
      }
    }

    // Ensure deterministic assertion IDs using project identity service
    for (const ast of context.assertions) {
      if (!ast.id) {
        const sourcePath = ast.sources?.[0]?.file ?? ".";
        (ast as any).id = deriveAssertionId({
          projectId,
          scannerRuleId: "scanner-rule",
          scannerRuleVersion: "1.0.0",
          subject: ast.subject,
          predicate: ast.predicate,
          canonicalSourcePath: sourcePath
        });
      }
    }

    return this.buildResult(resolvedRoot, context);
  }

  /**
   * Build the backwards-compatible ScanResult from the scanner context.
   */
  private buildResult(root: string, context: ScannerContext): ScanResult {
    // Legacy flat fields (deterministically derived from rich data)
    const allDeps = new Set<string>();
    const allFrameworks = new Set<string>();
    const allFiles = context.files.map((f) => f.relativePath).sort();

    for (const pkg of context.workspacePackages) {
      for (const dep of Object.keys(pkg.dependencies ?? {})) allDeps.add(dep);
      for (const dep of Object.keys(pkg.devDependencies ?? {})) allDeps.add(dep);
    }

    for (const [fw] of context.frameworks) allFrameworks.add(fw);

    const languages = [...context.languages].sort();
    const frameworks = [...allFrameworks].sort();
    const dependencies = [...allDeps].sort();

    const manifests: Record<string, unknown> = {};
    for (const mf of context.manifests) {
      manifests[mf.relativePath] = mf.raw;
    }

    return {
      root,
      files: allFiles,
      manifests,
      dependencies,
      frameworks,
      languages,
      assertions: context.assertions,
      rich: {
        root,
        rootRelative: ".",
        files: context.files,
        diagnostics: context.diagnostics,
        manifests: context.manifests,
        workspacePackages: context.workspacePackages,
        packageGraph: context.packageGraph,
        gitSummary: context.gitSummary,
        architectureFindings: context.architectureFindings,
        languages: [...context.languages].sort(),
        frameworks: Object.fromEntries(context.frameworks),
        timing: context.timing,
        filesInspected: context.filesInspected,
        filesSkipped: context.filesSkipped,
        manifestsParsed: context.manifestsParsed
      }
    };
  }
}
