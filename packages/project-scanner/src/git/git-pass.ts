/**
 * Git Pass (Pass 4) — Safe Git Intelligence.
 *
 * Pass ID: "git"
 * Version: "1.0.0"
 *
 * Collects bounded Git repository intelligence without reading full history.
 * Git absence does not fail the scan — it produces diagnostics.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ScannerPass, ScannerContext, ScannerPassResult, GitSummary, RemoteInfo } from "../contracts.js";
import type { ScannerConfiguration } from "../configuration.js";
import type { ScannerDiagnostic } from "../contracts.js";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";
import { diagnostic, DiagnosticCode } from "../diagnostics.js";
import { runGit, isGitRepo, getGitTopLevel, redactUrl } from "./git-runner.js";

export class GitPass implements ScannerPass {
  readonly id = "git";
  readonly version = "1.0.0";

  private config: ScannerConfiguration;

  constructor(config: ScannerConfiguration) {
    this.config = config;
  }

  run(context: ScannerContext): ScannerPassResult {
    const evidence = new EvidenceEngine();
    const diagnosticsList: typeof context.diagnostics = [];

    // Quick check: does .git directory exist?
    const gitDir = path.join(context.root, ".git");
    if (!fs.existsSync(gitDir)) {
      evidence.createAssertion({
        subject: "vcs",
        predicate: "git-repository",
        value: false,
        status: "observed",
        confidence: 1.0,
        sources: [{ file: ".git", reason: ".git directory not found" }],
        explanation: "Not a Git repository"
      });

      return {
        passId: this.id,
        version: this.version,
        aborted: false,
        assertions: evidence.getAssertions(),
        diagnostics: [
          diagnostic(
            DiagnosticCode.GIT_NOT_AVAILABLE,
            "info",
            this.id,
            "No .git directory found; Git intelligence is unavailable",
            { recoverable: true }
          )
        ],
        gitSummary: null
      };
    }

    // Defer Git commands to avoid blocking — we'll collect what we can
    return this.collectGitInfo(context, evidence, diagnosticsList);
  }

  private collectGitInfo(
    context: ScannerContext,
    evidence: EvidenceEngine,
    diagnosticsList: typeof context.diagnostics
  ): ScannerPassResult {
    // We collect Git info synchronously using the async runner but since
    // ScannerPass.run() is synchronous, we need to block. For a production
    // scanner this would be async, but for now we use a simplified approach.
    const summary: GitSummary = {
      insideWorkTree: false,
      topLevel: "",
      currentBranch: null,
      detachedHead: false,
      currentSha: null,
      isClean: true,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      remotes: [],
      recentCommits: []
    };

    try {
      // We use the synchronous spawnSync approach due to pass interface constraints
      const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
      const runSync = (args: string[]): { stdout: string; exitCode: number } => {
        try {
          const stdout = execFileSync("git", args, {
            cwd: context.root,
            timeout: this.config.gitTimeoutMs,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
            encoding: "utf-8"
          });
          return { stdout: stdout?.trim() ?? "", exitCode: 0 };
        } catch (err: any) {
          return { stdout: err.stdout?.toString()?.trim() ?? "", exitCode: err.code ?? 1 };
        }
      };

      // Top-level dir
      const topLevelResult = runSync(["rev-parse", "--show-toplevel"]);
      if (topLevelResult.exitCode === 0) {
        summary.insideWorkTree = true;
        summary.topLevel = topLevelResult.stdout;
      }

      // Current branch
      const branchResult = runSync(["rev-parse", "--abbrev-ref", "HEAD"]);
      if (branchResult.exitCode === 0 && branchResult.stdout !== "HEAD") {
        summary.currentBranch = branchResult.stdout;
      } else {
        summary.detachedHead = true;
      }

      // Current commit SHA
      const shaResult = runSync(["rev-parse", "--short", "HEAD"]);
      if (shaResult.exitCode === 0) {
        summary.currentSha = shaResult.stdout;
      }

      // Status
      const statusResult = runSync(["status", "--porcelain"]);
      if (statusResult.exitCode === 0) {
        const lines = statusResult.stdout ? statusResult.stdout.split("\n").filter(Boolean) : [];
        summary.stagedCount = lines.filter((l: string) => l.startsWith("M") || l.startsWith("A") || l.startsWith("D")).length;
        summary.unstagedCount = lines.filter((l: string) => l.startsWith(" M") || l.startsWith(" D")).length;
        summary.untrackedCount = lines.filter((l: string) => l.startsWith("??")).length;
        summary.isClean = lines.length === 0;
      }

      // Remotes
      const remoteResult = runSync(["remote", "-v"]);
      if (remoteResult.exitCode === 0) {
        const lines = remoteResult.stdout ? remoteResult.stdout.split("\n").filter(Boolean) : [];
        const seen = new Set<string>();
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            const name = parts[0]!;
            const url = redactUrl(parts[1]!);
            if (!seen.has(name)) {
              seen.add(name);
              summary.remotes.push({ name, url });
            }
          }
        }
      }

      // Recent commits
      const logResult = runSync(["log", `--max-count=${this.config.maxGitCommits}`, "--oneline"]);
      if (logResult.exitCode === 0) {
        summary.recentCommits = logResult.stdout
          ? logResult.stdout.split("\n").filter(Boolean).slice(0, this.config.maxGitCommits)
          : [];
      }

      // Evidence
      evidence.createAssertion({
        subject: "vcs",
        predicate: "git-repository",
        value: true,
        status: "observed",
        confidence: 1.0,
        sources: [{ file: ".git", reason: "Git repository detected" }],
        explanation: "Git version control system identified"
      });

      if (summary.currentBranch) {
        evidence.createAssertion({
          subject: "vcs",
          predicate: "current-branch",
          value: summary.currentBranch,
          status: "observed",
          confidence: 1.0,
          sources: [{ file: ".git", reason: "Current branch determined via git rev-parse" }],
          explanation: `Currently on branch '${summary.currentBranch}'`
        });
      }

      if (!summary.isClean) {
        evidence.createAssertion({
          subject: "vcs",
          predicate: "dirty-files",
          value: { staged: summary.stagedCount, unstaged: summary.unstagedCount, untracked: summary.untrackedCount },
          status: "observed",
          confidence: 1.0,
          sources: [{ file: ".git", reason: "Git status via git status --porcelain" }],
          explanation: `Working tree has ${summary.stagedCount + summary.unstagedCount + summary.untrackedCount} uncommitted files`
        });
      }
    } catch (err) {
      diagnosticsList.push(
        diagnostic(
          DiagnosticCode.GIT_COMMAND_FAILED,
          "warning",
          this.id,
          `Git command failed: ${(err as Error).message}`,
          { recoverable: true }
        )
      );
    }

    return {
      passId: this.id,
      version: this.version,
      aborted: false,
      assertions: evidence.getAssertions(),
      diagnostics: diagnosticsList,
      gitSummary: summary
    };
  }
}
