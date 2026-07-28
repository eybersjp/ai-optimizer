import * as fs from "node:fs";
import * as path from "node:path";
import { ProjectProfile } from "@ai-optimize/contracts";

export class MCPServer {
  public getTools() {
    return [
      {
        name: "project_get_profile",
        description: "Retrieve provider-neutral canonical project profile"
      },
      {
        name: "project_get_context_capsule",
        description: "Retrieve compact task-specific context capsule"
      },
      {
        name: "configuration_get_status",
        description: "Retrieve active configuration & activation status"
      }
    ];
  }

  public getResources() {
    return [
      "ai-optimize://project/profile",
      "ai-optimize://project/state",
      "ai-optimize://project/current-task"
    ];
  }

  public handleToolCall(projectRoot: string, name: string, args: Record<string, any>): any {
    const aiOptDir = path.join(projectRoot, ".ai-optimize");
    const profilePath = path.join(aiOptDir, "project-profile.json");

    if (name === "project_get_profile") {
      if (fs.existsSync(profilePath)) {
        return JSON.parse(fs.readFileSync(profilePath, "utf-8"));
      }
      throw new Error(`Project profile not compiled at ${profilePath}`);
    }

    if (name === "configuration_get_status") {
      const managedPath = path.join(aiOptDir, "managed-artifacts.json");
      const active = fs.existsSync(profilePath);
      const managed = fs.existsSync(managedPath) ? JSON.parse(fs.readFileSync(managedPath, "utf-8")) : [];
      return { active, managedArtifacts: managed };
    }

    if (name === "project_get_context_capsule") {
      let profile: ProjectProfile | null = null;
      if (fs.existsSync(profilePath)) {
        profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
      }
      return {
        project: profile?.project.name ?? path.basename(projectRoot),
        archetype: profile?.project.archetype ?? "unknown",
        activeExperts: profile?.experts.enabled ?? [],
        qualityGates: profile?.qualityGates
      };
    }

    throw new Error(`Unknown MCP tool call: ${name}`);
  }
}
