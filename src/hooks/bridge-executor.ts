import { spawn } from "child_process";
import type { HookStdinPayload, HookStdoutResult } from "./bridge-types.js";

const DEFAULT_TIMEOUT = 10_000;

/**
 * Execute a hook command as a subprocess.
 *
 * - Writes `payload` as JSON to stdin
 * - Parses stdout as JSON
 * - Kills process on timeout
 * - Returns null on any error (non-zero exit, parse failure, timeout)
 */
export async function executeHookCommand(
  command: string,
  payload: HookStdinPayload,
  timeout: number = DEFAULT_TIMEOUT,
  env?: Record<string, string>,
): Promise<HookStdoutResult | null> {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", command], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
      cwd: payload.cwd,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        console.warn(
          `[cc-plugin-loader] Hook command timed out after ${timeout}ms: ${command}`,
        );
        resolve(null);
      }
    }, timeout);

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        console.warn(
          `[cc-plugin-loader] Hook command failed to spawn: ${command}`,
          err.message,
        );
        resolve(null);
      }
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        console.warn(
          `[cc-plugin-loader] Hook command exited with code ${code}: ${command}`,
          stderr || "(no stderr)",
        );
        resolve(null);
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        // Empty stdout is valid — treat as { continue: true }
        resolve({ continue: true });
        return;
      }

      try {
        const result = JSON.parse(trimmed) as HookStdoutResult;
        resolve(result);
      } catch {
        console.warn(
          `[cc-plugin-loader] Hook command returned invalid JSON: ${command}`,
          trimmed,
        );
        resolve(null);
      }
    });

    // Write payload to stdin and close
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
