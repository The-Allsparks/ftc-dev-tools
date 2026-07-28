/**
 * Read a password from an interactive terminal without echoing characters.
 * Returns undefined when stdin is not a TTY.
 */
export async function readHiddenPassword(prompt: string): Promise<string | undefined> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return undefined;
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  stdout.write(prompt);

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  let password = "";

  return await new Promise((resolve) => {
    const cleanup = (): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
    };

    const onData = (chunk: string): void => {
      for (const ch of chunk) {
        switch (ch) {
          case "\r":
          case "\n":
          case "\u0004":
            cleanup();
            resolve(password || undefined);
            return;
          case "\u0003":
            cleanup();
            resolve(undefined);
            return;
          case "\u007f":
          case "\b":
            password = password.slice(0, -1);
            stdout.write("\b \b");
            break;
          default:
            if (ch >= " " || ch === "\t") {
              password += ch;
              stdout.write("*");
            }
            break;
        }
      }
    };

    stdin.on("data", onData);
  });
}
