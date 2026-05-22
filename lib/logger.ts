// Structured server-side logger.
//
// All server-action error calls should use this instead of console.error so
// that log lines are structured JSON — queryable in Datadog, Logtail, Sentry,
// etc. without additional parsing.
//
// To integrate a real logging service, replace the console.* calls below with
// your provider's SDK (e.g. Pino, Winston, @logtail/node, @sentry/nextjs).
// Call sites do NOT need to change.

export type LogContext = Record<string, unknown>;

export type Logger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext
  ): void;
};

const isDev = process.env.NODE_ENV !== "production";

// Context keys whose values are PHI / sensitive and must never be written to
// logs. Patterns are anchored/specific so structural keys like `errorName`,
// `tableName`, or `recordType` are NOT redacted.
const REDACT_KEY_PATTERNS: RegExp[] = [
  /^patient_?id$/i,
  /mrn/i,
  /^dob$/i,
  /date_?of_?birth/i,
  /ssn/i,
  /^email$/i,
  /^phone$/i,
  /^address$/i,
  /first_?name/i,
  /last_?name/i,
  /full_?name/i,
  /patient_?name/i,
  /signature_?data/i,
  /audio_?url/i,
  /transcript/i,
  /^notes?$/i,
];

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEY_PATTERNS.some((re) => re.test(k))
        ? "[redacted]"
        : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function serialize(
  level: string,
  message: string,
  context?: LogContext
): string {
  const safe = context ? (redact(context) as LogContext) : undefined;
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...safe,
  });
}

export const logger: Logger = {
  debug(message, context) {
    if (isDev) {
      console.debug(serialize("debug", message, context));
    }
  },

  info(message, context) {
    console.info(serialize("info", message, context));
  },

  warn(message, context) {
    console.warn(serialize("warn", message, context));
  },

  error(message, errorOrContext, context) {
    const isError = errorOrContext instanceof Error;
    const ctx: LogContext = {
      ...context,
      ...(isError
        ? {
            errorMessage: errorOrContext.message,
            errorName: errorOrContext.name,
            stack: isDev ? errorOrContext.stack : undefined,
          }
        : errorOrContext),
    };
    console.error(serialize("error", message, ctx));
  },
};
