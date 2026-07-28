/**
 * Git Runner — Safe child_process execution for Git commands.
 *
 * Uses execFile with:
 * - Fixed executable (git)
 * - Argument arrays (no shell interpolation)
 * - Timeout
 * - Bounded output
 * - Structured failure handling
 */
import { execFile } from "node:child_process";

export interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Run a Git command safely.
 *
 * @param args - Git arguments (e.g., ["rev-parse", "--git-dir"]).
 * @param cwd - Working directory.
 * @param timeout - Timeout in milliseconds.
 */
export function runGit(args: string[], cwd: string, timeout: number): Promise<GitCommandResult> {
  return new Promise((resolve) => {
    const child = execFile(
      "git",
      args,
      {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1 MB
        windowsHide: true
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout?.trim() ?? "",
          stderr: stderr?.trim() ?? "",
          exitCode: error !== null ? ((error.code as number | undefined) ?? 1) : 0
        });
      }
    );
  });
}

/**
 * Check if a directory is inside a Git work tree.
 */
export async function isGitRepo(cwd: string, timeout: number): Promise<boolean> {
  const result = await runGit(["rev-parse", "--git-dir"], cwd, timeout);
  return result.exitCode === 0;
}

/**
 * Get the top-level Git directory.
 */
export async function getGitTopLevel(cwd: string, timeout: number): Promise<string | null> {
  const result = await runGit(["rev-parse", "--show-toplevel"], cwd, timeout);
  return result.exitCode === 0 ? result.stdout : null;
}

/**
 * Redact credentials from a Git remote URL.
 */
export function redactUrl(url: string): string {
  return url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
}
