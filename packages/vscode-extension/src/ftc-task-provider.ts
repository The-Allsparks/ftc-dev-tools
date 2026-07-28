import * as vscode from "vscode";

const TASK_TYPE = "ftc-dev-tools";

const ACTION_COMMAND: Record<string, string> = {
  build: "ftc.build",
  deploy: "ftc.deploy",
  buildAndDeploy: "ftc.buildAndDeploy",
};

class FtcCommandPseudoterminal implements vscode.Pseudoterminal {
  private readonly closeEmitter = new vscode.EventEmitter<number>();
  private readonly writeEmitter = new vscode.EventEmitter<string>();
  readonly onDidClose = this.closeEmitter.event;
  readonly onDidWrite = this.writeEmitter.event;

  constructor(private readonly commandId: string) {}

  open(): void {
    this.writeEmitter.fire(`Running FTC Dev Tools command: ${this.commandId}\r\n`);
    void vscode.commands.executeCommand(this.commandId).then(
      () => this.closeEmitter.fire(0),
      () => this.closeEmitter.fire(1),
    );
  }

  close(): void {
    // Command execution is fire-and-forget; nothing to tear down.
  }
}

export function registerFtcTaskProvider(context: vscode.ExtensionContext): void {
  const provider: vscode.TaskProvider = {
    provideTasks: () => [],
    resolveTask(task: vscode.Task): vscode.Task | undefined {
      const action = (task.definition as { action?: string }).action;
      const commandId = action ? ACTION_COMMAND[action] : undefined;
      if (!commandId) {
        return undefined;
      }
      const scope = task.scope ?? vscode.TaskScope.Workspace;
      return new vscode.Task(
        task.definition,
        scope,
        task.name,
        TASK_TYPE,
        new vscode.CustomExecution(() => Promise.resolve(new FtcCommandPseudoterminal(commandId))),
      );
    },
  };
  context.subscriptions.push(vscode.tasks.registerTaskProvider(TASK_TYPE, provider));
}
