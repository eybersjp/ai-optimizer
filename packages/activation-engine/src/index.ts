import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  CompileOutput,
  ActivationResult,
  RollbackResult,
  BackupSnapshot,
  ManagedArtifactRecord
} from "@ai-optimize/contracts";

export class ActivationEngine {
  private calculateHash(content: string): string {
    return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
  }

  public async activate(
    projectRoot: string,
    compileOutput: CompileOutput
  ): Promise<ActivationResult> {
    const root = path.resolve(projectRoot);
    const aiOptDir = path.join(root, ".ai-optimize");
    const backupsDir = path.join(aiOptDir, "backups");
    const lockFile = path.join(aiOptDir, "activation.lock");

    fs.mkdirSync(aiOptDir, { recursive: true });
    fs.mkdirSync(backupsDir, { recursive: true });

    // Step 1: Acquire activation lock
    if (fs.existsSync(lockFile)) {
      throw new Error(`Activation lock present at ${lockFile}. Another activation process may be running.`);
    }

    const activationId = `act_${Math.random().toString(36).substring(2, 10)}`;
    fs.writeFileSync(lockFile, JSON.stringify({ activationId, timestamp: new Date().toISOString() }));

    const backupId = `bk_${Date.now()}`;
    const backupFiles: { path: string; content: string | null; hash: string | null }[] = [];
    const appliedArtifacts: string[] = [];

    try {
      // Step 2 & 3: Inspect active files & create backup snapshot
      for (const artifact of compileOutput.artifacts) {
        const targetPath = path.join(root, artifact.path);
        if (fs.existsSync(targetPath)) {
          const content = fs.readFileSync(targetPath, "utf-8");
          backupFiles.push({
            path: artifact.path,
            content,
            hash: this.calculateHash(content)
          });
        } else {
          backupFiles.push({
            path: artifact.path,
            content: null,
            hash: null
          });
        }
      }

      const backupSnapshot: BackupSnapshot = {
        id: backupId,
        projectId: compileOutput.canonicalProfile.project.id,
        timestamp: new Date().toISOString(),
        files: backupFiles
      };

      const backupFilePath = path.join(backupsDir, `${backupId}.json`);
      fs.writeFileSync(backupFilePath, JSON.stringify(backupSnapshot, null, 2));

      // Step 4 & 5: Apply files transactionally
      const managedRecords: ManagedArtifactRecord[] = [];

      for (const artifact of compileOutput.artifacts) {
        const targetPath = path.join(root, artifact.path);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        let finalContent = artifact.content;

        // If it's a managed block in an existing file, patch bounded section
        if (artifact.isManagedBlock && fs.existsSync(targetPath)) {
          const existing = fs.readFileSync(targetPath, "utf-8");
          const beginMarker = `// AI-OPTIMIZE:BEGIN project=${compileOutput.canonicalProfile.project.id}`;
          const endMarker = `// AI-OPTIMIZE:END`;

          if (existing.includes(beginMarker) && existing.includes(endMarker)) {
            const regex = new RegExp(`${beginMarker}[\\s\\S]*?${endMarker}`, "g");
            const blockContent = artifact.content.replace(/^\{\n|\n\}$/g, "").trim();
            finalContent = existing.replace(regex, `${beginMarker}\n${blockContent}\n${endMarker}`);
          } else {
            // Append block
            finalContent = `${existing.trim()}\n\n${artifact.content}`;
          }
        }

        const generatedHash = this.calculateHash(finalContent);
        const previousHash = backupFiles.find((b) => b.path === artifact.path)?.hash || undefined;

        fs.writeFileSync(targetPath, finalContent, "utf-8");
        appliedArtifacts.push(artifact.path);

        managedRecords.push({
          path: artifact.path,
          owner: "ai-optimize",
          projectId: compileOutput.canonicalProfile.project.id,
          artifactType: artifact.artifactType,
          generatedHash,
          previousHash,
          activationId
        });
      }

      // Record active manifest
      fs.writeFileSync(
        path.join(aiOptDir, "managed-artifacts.json"),
        JSON.stringify(managedRecords, null, 2)
      );

      // Release lock
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);

      return {
        success: true,
        activationId,
        projectId: compileOutput.canonicalProfile.project.id,
        appliedArtifacts,
        backupId
      };
    } catch (error: any) {
      // Trigger Automatic Rollback
      await this.rollbackFromSnapshot(root, backupFiles);
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);

      return {
        success: false,
        activationId,
        projectId: compileOutput.canonicalProfile.project.id,
        appliedArtifacts: [],
        backupId,
        error: error.message
      };
    }
  }

  public async rollback(projectRoot: string, backupId?: string): Promise<RollbackResult> {
    const root = path.resolve(projectRoot);
    const aiOptDir = path.join(root, ".ai-optimize");
    const backupsDir = path.join(aiOptDir, "backups");

    if (!fs.existsSync(backupsDir)) {
      throw new Error(`No backup directory found at ${backupsDir}`);
    }

    let targetBackupFile: string;
    if (backupId) {
      targetBackupFile = path.join(backupsDir, `${backupId}.json`);
    } else {
      const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith(".json")).sort();
      if (files.length === 0) {
        throw new Error("No backup files found for rollback.");
      }
      targetBackupFile = path.join(backupsDir, files[files.length - 1]);
    }

    const snapshot: BackupSnapshot = JSON.parse(fs.readFileSync(targetBackupFile, "utf-8"));
    const restoredFiles = await this.rollbackFromSnapshot(root, snapshot.files);

    return {
      success: true,
      activationId: snapshot.id,
      restoredFiles
    };
  }

  private async rollbackFromSnapshot(
    projectRoot: string,
    backupFiles: { path: string; content: string | null; hash: string | null }[]
  ): Promise<string[]> {
    const restored: string[] = [];

    for (const file of backupFiles) {
      const fullPath = path.join(projectRoot, file.path);
      if (file.content === null) {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          restored.push(`removed ${file.path}`);
        }
      } else {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.content, "utf-8");
        restored.push(`restored ${file.path}`);
      }
    }

    return restored;
  }
}
