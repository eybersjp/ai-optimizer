/**
 * Filesystem Pass (Pass 1) — Safe, bounded filesystem discovery.
 *
 * Pass ID: "filesystem"
 * Version: "1.0.0"
 *
 * Discovers all relevant repository files while respecting ignore patterns,
 * safety limits, and symlink constraints.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ScannerPass, ScannerContext, ScannerPassResult } from "../contracts.js";
import type { ScannerConfiguration } from "../configuration.js";
import { safeWalk } from "./safe-walker.js";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";

export class FilesystemPass implements ScannerPass {
  readonly id = "filesystem";
  readonly version = "1.0.0";

  private config: ScannerConfiguration;

  constructor(config: ScannerConfiguration) {
    this.config = config;
  }

  run(context: ScannerContext): ScannerPassResult {
    if (!fs.existsSync(context.root)) {
      return {
        passId: this.id,
        version: this.version,
        aborted: true,
        abortedReason: `Project root does not exist: ${context.root}`,
        assertions: [],
        diagnostics: []
      };
    }

    // Read repository-level ignore files (.gitignore, .ai-optimizeignore)
    const fileIgnores = this.loadIgnoreFiles(context.root);
    const combinedIgnores = [...context.extraIgnores, ...fileIgnores];

    const result = safeWalk(context.root, {
      config: this.config,
      extraIgnores: combinedIgnores
    });

    // Create evidence assertions
    const evidence = new EvidenceEngine();
    evidence.createAssertion({
      subject: "filesystem",
      predicate: "total-files",
      value: result.files.length,
      status: "observed",
      confidence: 1.0,
      sources: [{ file: ".", reason: "Directory walk scan" }],
      explanation: `Discovered ${result.files.length} files in repository`
    });

    // Assertion for symlinks
    const symlinks = result.files.filter((f) => f.isSymlink);
    if (symlinks.length > 0) {
      evidence.createAssertion({
        subject: "filesystem",
        predicate: "symlink-count",
        value: symlinks.length,
        status: "observed",
        confidence: 1.0,
        sources: [{ file: ".", reason: "Symlink detection during walk" }],
        explanation: `Found ${symlinks.length} symlinks in repository`
      });
    }

    return {
      passId: this.id,
      version: this.version,
      aborted: result.aborted,
      abortedReason: result.aborted ? "Max file count exceeded" : undefined,
      files: result.files,
      assertions: evidence.getAssertions(),
      diagnostics: result.diagnostics,
      filesInspected: result.inspected,
      filesSkipped: result.skipped
    };
  }

  private loadIgnoreFiles(root: string): string[] {
    const ignoreFiles = [".gitignore", ".ai-optimizeignore"];
    const patterns: string[] = [];

    for (const filename of ignoreFiles) {
      const fullPath = path.join(root, filename);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
              patterns.push(trimmed.replace(/^\//, ""));
            }
          }
        } catch { /* ignore read errors */ }
      }
    }

    return patterns;
  }
}

