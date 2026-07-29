import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildJavaEnvForHome, configuredJavaHomeCandidates } from "../src/discovery/java-home.js";

describe("configuredJavaHomeCandidates", () => {
  it("prefers FTC_JAVA_HOME over JAVA_HOME and dedupes", () => {
    expect(
      configuredJavaHomeCandidates({
        FTC_JAVA_HOME: "C:\\jdk17",
        JAVA_HOME: "C:\\jdk17",
      }),
    ).toEqual(["C:\\jdk17"]);
    expect(
      configuredJavaHomeCandidates({
        FTC_JAVA_HOME: "C:\\ftc",
        JAVA_HOME: "C:\\java",
      }),
    ).toEqual(["C:\\ftc", "C:\\java"]);
  });
});

describe("buildJavaEnvForHome", () => {
  it("sets JAVA_HOME and prepends bin to PATH on Windows", () => {
    const home = "C:\\Program Files\\Eclipse Adoptium\\jdk-17";
    const env = buildJavaEnvForHome(home, { Path: "C:\\Windows\\System32" }, "win32");
    expect(env.JAVA_HOME).toBe(home);
    expect(env.Path).toBe(`${path.join(home, "bin")};C:\\Windows\\System32`);
  });

  it("does not duplicate bin when already on PATH", () => {
    const home = "/usr/lib/jvm/java-17";
    const bin = path.join(home, "bin");
    const env = buildJavaEnvForHome(home, { PATH: `${bin}:/usr/bin` }, "linux");
    expect(env.PATH).toBe(`${bin}:/usr/bin`);
  });
});
