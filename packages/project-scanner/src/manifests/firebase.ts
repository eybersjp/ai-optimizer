/**
 * Firebase project detection.
 *
 * Detects Firebase projects via firebase.json and .firebaserc.
 */
export interface FirebaseInfo {
  hasFirebaseJson: boolean;
  hasFirebaserc: boolean;
  projectAlias?: string;
  hasFirestore?: boolean;
  hasStorage?: boolean;
  hasFunctions?: boolean;
  hasHosting?: boolean;
}

/**
 * Parse firebase.json content for Firebase detection.
 */
export function detectFirebase(raw: unknown, fileName: string): Partial<FirebaseInfo> {
  const info: Partial<FirebaseInfo> = {};

  if (fileName === "firebase.json" && typeof raw === "object" && raw !== null) {
    info.hasFirebaseJson = true;
    const data = raw as Record<string, unknown>;
    info.hasFirestore = !!data.firestore;
    info.hasStorage = !!data.storage;
    info.hasFunctions = !!data.functions;
    info.hasHosting = !!data.hosting;
  }

  if (fileName === ".firebaserc" && typeof raw === "object" && raw !== null) {
    info.hasFirebaserc = true;
    const data = raw as Record<string, unknown>;
    const projects = data.projects;
    if (projects && typeof projects === "object") {
      const p = projects as Record<string, unknown>;
      const val = Object.values(p)[0];
      info.projectAlias = val ? String(val) : undefined;
    }
  }

  return info;
}
