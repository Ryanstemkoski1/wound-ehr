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

function serialize(
  level: string,
  message: string,
  context?: LogContext
): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
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
