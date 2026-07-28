/**
 * Scanner Diagnostics — Structured diagnostic types and stable codes.
 */
import type { ScannerDiagnostic } from "./contracts.js";

export type DiagnosticSeverity = "info" | "warning" | "error";

/** Stable diagnostic codes used across all scanner passes. */
export const DiagnosticCode = {
  FILESYSTEM_PERMISSION_DENIED: "FILESYSTEM_PERMISSION_DENIED",
  FILESYSTEM_LIMIT_EXCEEDED: "FILESYSTEM_LIMIT_EXCEEDED",
  FILESYSTEM_SYMLINK_SKIPPED: "FILESYSTEM_SYMLINK_SKIPPED",
  MANIFEST_PARSE_FAILED: "MANIFEST_PARSE_FAILED",
  WORKSPACE_PATTERN_INVALID: "WORKSPACE_PATTERN_INVALID",
  WORKSPACE_PACKAGE_MISSING_MANIFEST: "WORKSPACE_PACKAGE_MISSING_MANIFEST",
  GIT_NOT_AVAILABLE: "GIT_NOT_AVAILABLE",
  GIT_COMMAND_FAILED: "GIT_COMMAND_FAILED",
  UNSUPPORTED_MANIFEST: "UNSUPPORTED_MANIFEST",
  SCAN_PARTIAL: "SCAN_PARTIAL",
  SCAN_ABORTED: "SCAN_ABORTED"
} as const;

export type DiagnosticCode = (typeof DiagnosticCode)[keyof typeof DiagnosticCode];

/** Create a structured scanner diagnostic. */
export function diagnostic(
  code: string,
  severity: DiagnosticSeverity,
  passId: string,
  message: string,
  options?: {
    path?: string;
    recoverable?: boolean;
    details?: unknown;
    remediation?: string;
  }
): ScannerDiagnostic {
  return {
    code,
    severity,
    passId,
    message,
    path: options?.path,
    recoverable: options?.recoverable ?? true,
    details: options?.details,
    remediation: options?.remediation
  };
}
