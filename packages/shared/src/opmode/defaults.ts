export const DEFAULT_OPMODE_PACKAGE = "org.firstinspires.ftc.teamcode";

export function isValidJavaClassName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/** Dotted Java package: identifiers only (blocks path traversal / source injection). */
export function isValidJavaPackageName(packageName: string): boolean {
  if (!packageName || packageName.length > 256) {
    return false;
  }
  return /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(packageName);
}

export function packageToRelativePath(packageName: string): string {
  return packageName.split(".").filter(Boolean).join("/");
}
