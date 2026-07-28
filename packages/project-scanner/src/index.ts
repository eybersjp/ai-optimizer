/**
 * @ai-optimize/project-scanner
 *
 * Evidence-backed multi-pass repository intelligence engine.
 *
 * Public API:
 *   - ProjectScanner orchestrates 5 deterministic passes
 *   - ScanResult (backwards-compatible) with rich sub-field
 *   - Scanner types for custom integration
 */

export { ProjectScanner } from "./scanner.js";
export type { ScanResult } from "./scanner.js";

// Full rich type exports for consumer integration
export type {
  ScannerPass,
  ScannerContext,
  ScannerPassResult,
  ScannerConfiguration,
  ScannerDiagnostic,
  DiagnosticSeverity,
  RepositoryFile,
  ManifestFinding,
  WorkspacePackage,
  PackageRole,
  RepositoryUnit,
  RepositoryUnitType,
  TechnologyFinding,
  PackageGraph,
  PackageGraphNode,
  PackageGraphEdge,
  DependencyType,
  GitSummary,
  RemoteInfo,
  ArchitectureFinding,
  NewScanResult
} from "./contracts.js";

// Diagnostic utilities
export { DiagnosticCode } from "./diagnostics.js";
export type { DiagnosticCode as DiagnosticCodeType } from "./diagnostics.js";

// Configuration
export { DEFAULT_SCANNER_CONFIG } from "./configuration.js";
