import type { ExtensionContext } from "vscode";
import {
  LAST_SUCCESSFUL_BUILD_KEY,
  isLastSuccessfulBuildSnapshot,
  type LastSuccessfulBuildSnapshot,
} from "@ftc-dev-tools/shared";

export class BuildSnapshotStore {
  constructor(private readonly context: ExtensionContext) {}

  load(): LastSuccessfulBuildSnapshot | undefined {
    const raw = this.context.workspaceState.get(LAST_SUCCESSFUL_BUILD_KEY);
    return isLastSuccessfulBuildSnapshot(raw) ? raw : undefined;
  }

  async save(apkPath?: string): Promise<LastSuccessfulBuildSnapshot> {
    const snapshot: LastSuccessfulBuildSnapshot = {
      completedAt: new Date().toISOString(),
      apkPath,
    };
    await this.context.workspaceState.update(LAST_SUCCESSFUL_BUILD_KEY, snapshot);
    return snapshot;
  }
}
