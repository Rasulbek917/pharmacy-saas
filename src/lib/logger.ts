import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

type Level = "info" | "warn" | "error";

const LOG_DIR = join(process.cwd(), "logs");

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
}

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const entry: Record<string, unknown> = {
    ts,
    level,
    msg: message,
  };
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      entry[key] = serialize(value);
    }
  }
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    const file = join(LOG_DIR, `app-${ts.slice(0, 10)}.log`);
    appendFileSync(file, line + "\n");
  } catch {
    // Logging must never break a request (read-only FS, permissions, ...)
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    write("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    write("error", message, meta);
  },
};

// Server-only: make sure a crashing process leaves a trace behind.
const g = globalThis as typeof globalThis & { __pharmaErrorHandlers?: boolean };
if (typeof process !== "undefined" && typeof process.on === "function" && !g.__pharmaErrorHandlers) {
  g.__pharmaErrorHandlers = true;

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", {
      error: reason instanceof Error ? reason : new Error(String(reason)),
    });
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception — process to'xtatilmoqda", { error });
    process.exit(1);
  });
}
