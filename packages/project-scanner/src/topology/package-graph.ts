/**
 * Package Graph — Constructs dependency graph from workspace packages.
 */
import type { PackageGraph, PackageGraphNode, PackageGraphEdge, WorkspacePackage } from "../contracts.js";

/**
 * Build a package graph from discovered workspace packages.
 * Identifies internal workspace dependencies by matching dependency names
 * against known workspace package names.
 */
export function buildPackageGraph(packages: WorkspacePackage[]): PackageGraph {
  const nodes: PackageGraphNode[] = [];
  const edges: PackageGraphEdge[] = [];

  const packageNames = new Set(packages.map((p) => p.name));

  for (const pkg of packages) {
    nodes.push({
      name: pkg.name,
      relativeDir: pkg.relativeDir,
      role: pkg.role ?? "unknown"
    });

    // Detect workspace dependencies
    for (const [dep] of Object.entries(pkg.dependencies)) {
      if (packageNames.has(dep)) {
        edges.push({ source: pkg.name, target: dep, type: "workspace" });
      }
    }
    for (const [dep] of Object.entries(pkg.devDependencies)) {
      if (packageNames.has(dep)) {
        edges.push({ source: pkg.name, target: dep, type: "development" });
      }
    }
  }

  // Sort for determinism
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  edges.sort((a, b) => {
    const cmp = a.source.localeCompare(b.source);
    return cmp !== 0 ? cmp : a.target.localeCompare(b.target);
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
