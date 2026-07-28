/**
 * Docker and container detection.
 *
 * Detects:
 * - Dockerfile presence
 * - Docker Compose files
 * - Container-related configuration
 */
export interface DockerInfo {
  hasDockerfile: boolean;
  hasCompose: boolean;
  composeVersion?: string;
  baseImages?: string[];
}

/**
 * Detect Docker/container usage from manifest content.
 */
export function detectDocker(raw: string, fileName: string): Partial<DockerInfo> {
  const info: Partial<DockerInfo> = {};

  if (fileName.startsWith("Dockerfile")) {
    info.hasDockerfile = true;
    // Extract base images
    const images: string[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("FROM ")) {
        const image = trimmed.slice(5).split(/\s+/)[0]?.trim();
        if (image) images.push(image);
      }
    }
    if (images.length > 0) info.baseImages = images;
  }

  if (fileName === "compose.yaml" || fileName === "compose.yml" ||
      fileName.startsWith("docker-compose.")) {
    info.hasCompose = true;
    if (raw.includes("version:")) {
      const match = raw.match(/version:\s*["']?([\d.]+)["']?/);
      if (match) info.composeVersion = match[1];
    }
  }

  return info;
}
