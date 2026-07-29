// Source Artifact Guard — Verifies no generated build artifacts exist in src directories.
import * as fs from "node:fs";
import * as path from "node:path";

export interface SourceArtifactViolation {
  file: string;
  reason: string;
}

export function checkSourceArtifacts(root = path.resolve(".")): SourceArtifactViolation[] {
  const violations: SourceArtifactViolation[] = [];
  const searchDirs = ["apps", "packages"];

  function scanDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build") {
          scanDir(fullPath);
        }
      } else if (entry.isFile()) {
        const norm = fullPath.replace(/\\/g, "/");
        if (norm.includes("/src/")) {
          const relPath = path.relative(root, fullPath).replace(/\\/g, "/");
          if (entry.name.endsWith(".js") || entry.name.endsWith(".js.map") || entry.name.endsWith(".d.ts.map")) {
            violations.push({
              file: relPath,
              reason: "Generated JS or map artifact found inside src/ directory"
            });
          } else if (entry.name.endsWith(".d.ts")) {
            const baseName = entry.name.slice(0, -5);
            const tsPair = path.join(dirPath, `${baseName}.ts`);
            const tsxPair = path.join(dirPath, `${baseName}.tsx`);
            if (fs.existsSync(tsPair) || fs.existsSync(tsxPair)) {
              violations.push({
                file: relPath,
                reason: `Generated declaration file found alongside authored source (${baseName}.ts)`
              });
            }
          }
        }
      }
    }
  }

  for (const base of searchDirs) {
    scanDir(path.join(root, base));
  }

  return violations;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/guard-source-artifacts.ts")) {
  const violations = checkSourceArtifacts();
  if (violations.length > 0) {
    console.error("❌ Generated build artifacts found in source directories:");
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.reason}`);
    }
    process.exit(1);
  } else {
    console.log("✓ Source directory build artifact guard passed cleanly.");
  }
}
