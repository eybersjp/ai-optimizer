import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  },
  resolve: {
    alias: {
      "@ai-optimize/contracts": path.resolve("./packages/contracts/src/index.ts"),
      "@ai-optimize/evidence-engine": path.resolve("./packages/evidence-engine/src/index.ts"),
      "@ai-optimize/project-scanner": path.resolve("./packages/project-scanner/src/index.ts"),
      "@ai-optimize/project-classifier": path.resolve("./packages/project-classifier/src/index.ts"),
      "@ai-optimize/expert-engine": path.resolve("./packages/expert-engine/src/index.ts"),
      "@ai-optimize/recommendation-engine": path.resolve("./packages/recommendation-engine/src/index.ts"),
      "@ai-optimize/adapter-claude-code": path.resolve("./packages/adapters/claude-code/src/index.ts"),
      "@ai-optimize/adapter-vscode": path.resolve("./packages/adapters/vscode/src/index.ts"),
      "@ai-optimize/profile-compiler": path.resolve("./packages/profile-compiler/src/index.ts"),
      "@ai-optimize/activation-engine": path.resolve("./packages/activation-engine/src/index.ts"),
      "@ai-optimize/memory-engine": path.resolve("./packages/memory-engine/src/index.ts"),
      "@ai-optimize/mcp-server": path.resolve("./packages/mcp-server/src/index.ts")
    }
  }
});
