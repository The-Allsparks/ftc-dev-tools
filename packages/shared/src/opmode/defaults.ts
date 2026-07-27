export const DEFAULT_OPMODE_PACKAGE = "org.firstinspires.ftc.teamcode";

export function isValidJavaClassName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function packageToRelativePath(packageName: string): string {
  return packageName.split(".").filter(Boolean).join("/");
}
