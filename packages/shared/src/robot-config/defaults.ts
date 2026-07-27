export const TEAMCODE_RES_XML_RELATIVE = "TeamCode/src/main/res/xml";
export const HUB_CONFIG_REMOTE_DIR = "/sdcard/FIRST";

/** Android res/xml filenames: lowercase a-z, 0-9, underscore only. */
export function isValidAndroidXmlResourceName(fileBaseName: string): boolean {
  return /^[a-z0-9_]+$/.test(fileBaseName);
}

/** FTC device names should be simple identifiers (letters, digits, underscore). */
export function isValidFtcDeviceName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}
