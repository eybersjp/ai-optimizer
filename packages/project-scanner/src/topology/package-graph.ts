/**
 * Package Graph — Constructs dependency graph from workspace packages.
 */
import type { PackageGraph, PackageGraphNode, PackageGraphEdge, WorkspacePackage } from "../contracts.js";

/**
 * Build a package graph from discovered workspace packages.
 * Identifies internal workspace dependencies by matching dependency names
 * against known workspace package names.
 */
import type { ScannerDiagnostic, DependencyType } from "../contracts.js";
import { diagnostic, DiagnosticCode } from "../diagnostics.js";

/**
 * Build a package graph from discovered workspace packages.
 * Identifies internal workspace dependencies by matching dependency names
 * against known workspace package names.
 */
export function buildPackageGraph(
  packages: WorkspacePackage[],
  diagnostics?: ScannerDiagnostic[]
): PackageGraph {
  const nodes: PackageGraphNode[] = [];
  const edges: PackageGraphEdge[] = [];
  const edgeSet = new Set<string>();

  const nameToDirs = new Map<string, string[]>();
  const dirToPkgs = new Map<string, WorkspacePackage[]>();

  for (const pkg of packages) {
    const dirs = nameToDirs.get(pkg.name) ?? [];
    dirs.push(pkg.relativeDir);
    nameToDirs.set(pkg.name, dirs);

    const pkgs = dirToPkgs.get(pkg.relativeDir) ?? [];
    pkgs.push(pkg);
    dirToPkgs.set(pkg.relativeDir, pkgs);
  }

  // Diagnostics for duplicate names or directories
  if (diagnostics) {
    for (const [name, dirs] of nameToDirs) {
      if (dirs.length > 1) {
        diagnostics.push(
          diagnostic(
            DiagnosticCode.WORKSPACE_DUPLICATE_NAME,
            "warning",
            "topology",
            `Duplicate package name '${name}' declared in multiple directories: ${dirs.join(", ")}`,
            { path: dirs[0], recoverable: true, details: { name, directories: dirs } }
          )
        );
      }
    }

    for (const [dir, pkgs] of dirToPkgs) {
      if (pkgs.length > 1) {
        diagnostics.push(
          diagnostic(
            DiagnosticCode.WORKSPACE_DUPLICATE_DIRECTORY,
            "warning",
            "topology",
            `Directory '${dir}' produces duplicate workspace packages`,
            { path: dir, recoverable: true }
          )
        );
      }
    }
  }

  const packageNames = new Set(packages.map((p) => p.name));

  for (const pkg of packages) {
    nodes.push({
      name: pkg.name,
      relativeDir: pkg.relativeDir,
      role: pkg.role ?? "unknown"
    });

    const addEdge = (target: string, type: DependencyType) => {
      if (packageNames.has(target)) {
        const key = `${pkg.name}|${target}|${type}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: pkg.name, target, type });
        }
      } else if (diagnostics && (target.startsWith("@ai-optimize/") || target.startsWith("workspace:"))) {
        diagnostics.push(
          diagnostic(
            DiagnosticCode.WORKSPACE_DEPENDENCY_UNRESOLVED,
            "warning",
            "topology",
            `Workspace package '${pkg.name}' has unresolved internal dependency '${target}'`,
            { path: pkg.manifestPath, recoverable: true, details: { package: pkg.name, dependency: target } }
          )
        );
      }
    };

    for (const [dep] of Object.entries(pkg.dependencies)) {
      addEdge(dep, "workspace");
    }
    for (const [dep] of Object.entries(pkg.devDependencies)) {
      addEdge(dep, "development");
    }
    for (const [dep] of Object.entries(pkg.peerDependencies)) {
      addEdge(dep, "peer");
    }
  }

  // Sort for determinism
  nodes.sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return cmp !== 0 ? cmp : a.relativeDir.localeCompare(b.relativeDir);
  });

  edges.sort((a, b) => {
    const cmpSource = a.source.localeCompare(b.source);
    if (cmpSource !== 0) return cmpSource;
    const cmpTarget = a.target.localeCompare(b.target);
    if (cmpTarget !== 0) return cmpTarget;
    return a.type.localeCompare(b.type);
  });

  return { nodes, edges };
}

/**
 * Detect topology type from packages and graph.
 */
export function detectTopology(packages: WorkspacePackage[]): {
  type: "single-package" | "monorepo" | "multi-application" | "mixed-language" | "library-collection" | "unknown";
  confidence: number;
  evidence: string[];
} {
  if (packages.length === 0) {
    return { type: "single-package", confidence: 0.5, evidence: ["No workspace packages detected"] };
  }

  if (packages.length <= 1) {
    return { type: "single-package", confidence: 0.8, evidence: ["Single package in repository"] };
  }

  const evidence: string[] = [`${packages.length} workspace packages detected`];
  const roles = new Set(packages.map((p) => p.role));
  const languages = new Set<string>();
  for (const pkg of packages) {
    for (const lang of pkg.languages) languages.add(lang);
  }

  if (roles.has("frontend") && roles.has("daemon-service")) {
    evidence.push("Frontend and backend packages detected");
  }
  if (roles.has("frontend") && roles.has("cli")) {
    evidence.push("Frontend and CLI packages detected");
  }

  // Check for multiple applications
  const appCount = packages.filter((p) => p.role === "application" || p.role === "frontend" || p.role === "daemon-service" || p.role === "cli").length;
  if (appCount >= 2) {
    return { type: "multi-application", confidence: 0.9, evidence: [...evidence, `${appCount} application packages`] };
  }

  if (languages.size >= 2) {
    return { type: "mixed-language", confidence: 0.85, evidence: [...evidence, `${languages.size} languages across packages`] };
  }

  // Check if mostly library packages
  const libCount = packages.filter((p) => p.role === "library" || p.role === "contracts" || p.role === "adapter").length;
  if (libCount > packages.length / 2) {
    return { type: "library-collection", confidence: 0.8, evidence: [...evidence, `${libCount} library packages`] };
  }

  return { type: "monorepo", confidence: 0.85, evidence };
}
