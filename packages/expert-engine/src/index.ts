import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "yaml";
import { ExpertPack, ExpertPackSchema, ProjectProfile } from "@ai-optimize/contracts";

export class ExpertEngine {
  private packs: Map<string, ExpertPack> = new Map();

  public loadBuiltinPacks(expertPacksDir: string): void {
    if (!fs.existsSync(expertPacksDir)) return;

    const entries = fs.readdirSync(expertPacksDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packYamlPath = path.join(expertPacksDir, entry.name, "pack.yaml");
        if (fs.existsSync(packYamlPath)) {
          try {
            const rawContent = fs.readFileSync(packYamlPath, "utf-8");
            const rawParsed = parse(rawContent);
            const pack = ExpertPackSchema.parse(rawParsed);
            this.packs.set(pack.id, pack);
          } catch (err) {
            // Ignore invalid packs gracefully
          }
        }
      }
    }
  }

  public registerPack(pack: ExpertPack): void {
    this.packs.set(pack.id, pack);
  }

  public resolveActivePacks(profile: ProjectProfile): ExpertPack[] {
    const enabledIds = new Set(profile.experts.enabled);
    const activePacks: ExpertPack[] = [];

    for (const [id, pack] of this.packs.entries()) {
      if (enabledIds.has(id)) {
        activePacks.push(pack);
      }
    }

    return activePacks;
  }
}
