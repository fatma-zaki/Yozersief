/**
 * Structured JSON logs (brief A2). Personal data stays out of logs: phone numbers are masked
 * and known sensitive keys are redacted before anything is written.
 */
import { maskPhone } from "./phone";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const REDACTED_KEYS = /password|secret|token|^(otp|code|authorization|cookie)$/i;
const PHONE_IN_TEXT = /(?<!\d)(?:\+?20|0)?1[0125]\d{8}(?!\d)/g;

const minLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function scrubString(value: string): string {
  return value.replace(PHONE_IN_TEXT, (match) => maskPhone(match));
}

export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (typeof value === "string") return scrubString(value);
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message), stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Fields = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = REDACTED_KEYS.test(key) ? "[redacted]" : scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  child(bindings: Fields): Logger;
}

function createLogger(bindings: Fields = {}): Logger {
  const write = (level: Level, msg: string, fields?: Fields) => {
    if (LEVELS[level] < LEVELS[minLevel]) return;
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      msg: scrubString(msg),
      ...(scrub({ ...bindings, ...fields }) as Fields),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (msg, fields) => write("debug", msg, fields),
    info: (msg, fields) => write("info", msg, fields),
    warn: (msg, fields) => write("warn", msg, fields),
    error: (msg, fields) => write("error", msg, fields),
    child: (more) => createLogger({ ...bindings, ...more }),
  };
}

export const logger = createLogger();
