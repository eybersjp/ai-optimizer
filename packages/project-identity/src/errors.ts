/**
 * Structured identity error codes.
 *
 * These replace generic string errors for all identity-domain failures.
 */
export type IdentityErrorCode =
  | "PROJECT_NOT_REGISTERED"
  | "IDENTITY_CONFLICT"
  | "IDENTITY_FILE_INVALID"
  | "IDENTITY_RECONCILIATION_REQUIRED"
  | "IDENTITY_RECONCILIATION_FAILED"
  | "REGISTERED_ROOT_MISMATCH";

export class IdentityError extends Error {
  public readonly code: IdentityErrorCode;
  public readonly detail?: unknown;

  constructor(code: IdentityErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
    this.detail = detail;
  }
}

export function isIdentityError(err: unknown): err is IdentityError {
  return err instanceof IdentityError;
}
