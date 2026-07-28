/**
 * Topology Pass (Pass 3) — Repository Topology and Package Graph.
 *
 * Pass ID: "topology"
 * Version: "1.0.0"
 *
 * Constructs a package graph for monorepos, detects topology type,
 * and assigns package roles based on generic evidence.
 */import type { ScannerPass, ScannerContext, ScannerPassResult, WorkspacePackage } from "../contracts.js";
import type { ScannerConfiguration } from "../configuration.js";
import { EvidenceEngine } from "@ai-optimize/evidence-engine";
import { buildPackageGraph, detectTopology } from "./package-graph.js";

export class TopologyPass implements ScannerPass {
  readonly id = "topology";
  readonly version = "1.0.0";

  constructor(_config: ScannerConfiguration) {}

  run(context: ScannerContext): ScannerPassResult {
    const evidence = new EvidenceEngine();

    // Use workspace packages discovered by the manifest pass
    const packages: WorkspacePackage[] = context.workspacePackages;
    const graph = buildPackageGraph(packages);
    const topology = detectTopology(packages);

    // Evidence assertions
    evidence.createAssertion({
      subject: "architecture",
      predicate: "repository-topology",
      value: topology.type,
      status: topology.confidence >= 1.0 ? "observed" : "inferred",
      confidence: topology.confidence,
      sources: topology.evidence.map((e) => ({ file: ".", reason: e })),
      explanation: `Repository topology: ${topology.type}`
    });

    if (graph.nodes.length > 0) {
      evidence.createAssertion({
        subject: "architecture",
        predicate: "package-count",
        value: graph.nodes.length,
        status: "observed",
        confidence: 1.0,
        sources: [{ file: "pnpm-workspace.yaml", reason: "Workspace configuration defines packages" }],
        explanation: `Discovered ${graph.nodes.length} workspace packages`
      });
    }

    // Role assertions for specific packages
    for (const node of graph.nodes) {
      evidence.createAssertion({
        subject: `package-${node.name}`,
        predicate: "role",
        value: node.role,
        status: node.role !== "unknown" ? "inferred" : "unresolved",
        confidence: node.role !== "unknown" ? 0.85 : 0.3,
        sources: [{ file: node.relativeDir, reason: `Package located at '${node.relativeDir}'` }],
        explanation: `Package '${node.name}' is a '${node.role}'`
      });
    }

    return {
      passId: this.id,
      version: this.version,
      aborted: false,
      assertions: evidence.getAssertions(),
      diagnostics: [],
      packageGraph: graph,
      workspacePackages: packages,
      topologyType: topology.type,
      topologyConfidence: topology.confidence
    };
  }
}
