import { describe, expect, it } from "vitest";
import { parseLogcatLine, formatLogEntry } from "../src/logcat/parse.js";

describe("Logcat parsing", () => {
  it("parses threadtime lines", () => {
    const line = "01-01 12:00:00.123  1111  2222 E TeamCode: boom";
    const entry = parseLogcatLine(line);
    expect(entry.level).toBe("E");
    expect(entry.tag).toBe("TeamCode");
    expect(entry.message).toBe("boom");
    expect(formatLogEntry(entry, false)).toContain("E/TeamCode: boom");
  });

  it("falls back for raw lines", () => {
    const entry = parseLogcatLine("not a normal line");
    expect(entry.tag).toBe("raw");
    expect(formatLogEntry(entry, true)).toBe("not a normal line");
  });
});
