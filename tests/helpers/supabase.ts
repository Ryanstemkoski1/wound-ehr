// In-memory fake of the Supabase client used by server code.
//
// Every `supabase.from(table)` chain is recorded as a `RecordedQuery`, and its
// result comes from handlers registered by the test:
//
//   const db = useFakeSupabase({ user: makeAuthUser() });
//   db.on("visits", "select", { data: { status: "signed" } });
//   db.on("visits", "update", (q) => ({ data: { id: eqValue(q, "id") } }));
//   ...call the code under test...
//   expect(db.queries("visits", "update")[0].payload).toMatchObject({...});
//
// Handler resolution: unused `once` handlers win (in registration order),
// otherwise the most recently registered persistent handler. Without a
// handler, results mirror PostgREST defaults: `[]` for list selects, `null`
// for `maybeSingle()`, and a PGRST116 "no rows" error for `single()`.

import { vi } from "vitest";

export type Operation = "select" | "insert" | "update" | "upsert" | "delete";

export type FilterCall = { method: string; args: unknown[] };

export type RecordedQuery = {
  table: string;
  operation: Operation;
  /** Columns passed to `select()` (for a mutation: the returning columns). */
  columns: string | undefined;
  /** Body passed to `insert()`, `update()` or `upsert()`. */
  payload: unknown;
  /** Options passed to `select()` / `insert()` / `upsert()` / `delete()`. */
  options: unknown;
  /** Filters and modifiers in call order (eq, in, or, order, limit, ...). */
  filters: FilterCall[];
  /** True when a mutation chained `.select()` to return rows. */
  returning: boolean;
  single: boolean;
  maybeSingle: boolean;
};

export type FakeError = { message: string; code?: string; details?: string };

export type QueryResponse = {
  data?: unknown;
  error?: FakeError | null;
  count?: number | null;
};

export type Responder =
  | QueryResponse
  | ((query: RecordedQuery) => QueryResponse);

export type FakeAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type Handler = {
  table: string;
  operation: Operation | undefined;
  where: ((query: RecordedQuery) => boolean) | undefined;
  respond: Responder;
  once: boolean;
  used: boolean;
};

type HandlerOptions = {
  /** Only match queries for which this predicate returns true. */
  where?: (query: RecordedQuery) => boolean;
  /** Use this handler for a single matching query only. */
  once?: boolean;
};

export type FakeQueryBuilder = PromiseLike<{
  data: unknown;
  error: FakeError | null;
  count: number | null;
}> & {
  [method: string]: (...args: unknown[]) => FakeQueryBuilder;
};

const FILTER_METHODS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "contains",
  "containedBy",
  "overlaps",
  "textSearch",
  "match",
  "not",
  "or",
  "filter",
  "order",
  "limit",
  "range",
  "abortSignal",
  "returns",
  "throwOnError",
] as const;

export const NO_ROWS_ERROR: FakeError = {
  code: "PGRST116",
  message: "JSON object requested, multiple (or no) rows returned",
};

export function createFakeSupabase(
  options: { user?: FakeAuthUser | null } = {}
) {
  let currentUser: FakeAuthUser | null = options.user ?? null;
  const recorded: RecordedQuery[] = [];
  const handlers: Handler[] = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const rpcHandlers = new Map<
    string,
    QueryResponse | ((args: unknown) => QueryResponse)
  >();
  const storageCalls: Array<{
    bucket: string;
    method: string;
    args: unknown[];
  }> = [];

  function matches(handler: Handler, query: RecordedQuery) {
    return (
      handler.table === query.table &&
      (handler.operation === undefined ||
        handler.operation === query.operation) &&
      (handler.where === undefined || handler.where(query))
    );
  }

  function defaultResponse(query: RecordedQuery): QueryResponse {
    if (query.single) return { data: null, error: NO_ROWS_ERROR };
    if (query.maybeSingle) return { data: null };
    if (query.operation === "select" || query.returning) return { data: [] };
    return { data: null };
  }

  function resolve(query: RecordedQuery) {
    const onceHandler = handlers.find(
      (h) => h.once && !h.used && matches(h, query)
    );
    const handler =
      onceHandler ??
      [...handlers].reverse().find((h) => !h.once && matches(h, query));
    if (onceHandler) onceHandler.used = true;

    const response = handler
      ? typeof handler.respond === "function"
        ? handler.respond(query)
        : handler.respond
      : defaultResponse(query);

    return {
      data: "data" in response ? response.data : null,
      error: response.error ?? null,
      count: response.count ?? null,
    };
  }

  function from(table: string): FakeQueryBuilder {
    const query: RecordedQuery = {
      table,
      operation: "select",
      columns: undefined,
      payload: undefined,
      options: undefined,
      filters: [],
      returning: false,
      single: false,
      maybeSingle: false,
    };
    recorded.push(query);
    let operationSet = false;
    let result: ReturnType<typeof resolve> | undefined;

    const builder = {} as Record<string, unknown>;
    const chain =
      (apply: (...args: unknown[]) => void) =>
      (...args: unknown[]) => {
        apply(...args);
        return builder;
      };

    builder.select = chain((columns, selectOptions) => {
      if (operationSet) {
        query.returning = true;
        query.columns = (columns as string | undefined) ?? "*";
        return;
      }
      operationSet = true;
      query.operation = "select";
      query.columns = (columns as string | undefined) ?? "*";
      query.options = selectOptions;
    });
    for (const operation of ["insert", "update", "upsert"] as const) {
      builder[operation] = chain((payload, mutationOptions) => {
        operationSet = true;
        query.operation = operation;
        query.payload = payload;
        query.options = mutationOptions;
      });
    }
    builder.delete = chain((deleteOptions) => {
      operationSet = true;
      query.operation = "delete";
      query.options = deleteOptions;
    });
    for (const method of FILTER_METHODS) {
      builder[method] = chain((...args) => {
        query.filters.push({ method, args });
      });
    }
    builder.single = chain(() => {
      query.single = true;
    });
    builder.maybeSingle = chain(() => {
      query.maybeSingle = true;
    });
    builder.then = (
      onFulfilled?: (value: ReturnType<typeof resolve>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => {
      result ??= resolve(query);
      return Promise.resolve(result).then(onFulfilled, onRejected);
    };

    return builder as unknown as FakeQueryBuilder;
  }

  const ok = async () => ({ data: {}, error: null });

  const client = {
    from: vi.fn(from),
    rpc: vi.fn(async (fn: string, args?: unknown) => {
      rpcCalls.push({ fn, args });
      const handler = rpcHandlers.get(fn);
      const response =
        typeof handler === "function" ? handler(args) : (handler ?? {});
      return {
        data: "data" in response ? response.data : null,
        error: response.error ?? null,
      };
    }),
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: currentUser },
        error: null,
      })),
      signOut: vi.fn(ok),
      signUp: vi.fn(ok),
      signInWithPassword: vi.fn(ok),
      updateUser: vi.fn(ok),
      resetPasswordForEmail: vi.fn(ok),
      resend: vi.fn(ok),
    },
    storage: {
      from: vi.fn((bucket: string) => {
        const call =
          (method: string, data: unknown = {}) =>
          async (...args: unknown[]) => {
            storageCalls.push({ bucket, method, args });
            return { data, error: null };
          };
        return {
          upload: call("upload", { path: "uploaded" }),
          remove: call("remove", []),
          download: call("download", null),
          list: call("list", []),
          createSignedUrl: call("createSignedUrl", {
            signedUrl: "https://storage.test/signed",
          }),
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://storage.test/${bucket}/${path}` },
          }),
        };
      }),
    },
  };

  return {
    client,

    /** Register a response for queries on `table` (optionally one operation). */
    on(
      table: string,
      operation: Operation | undefined,
      respond: Responder,
      handlerOptions: HandlerOptions = {}
    ) {
      handlers.push({
        table,
        operation,
        where: handlerOptions.where,
        respond,
        once: handlerOptions.once ?? false,
        used: false,
      });
      return this;
    },

    /** Register a response for a single matching query. */
    once(table: string, operation: Operation | undefined, respond: Responder) {
      return this.on(table, operation, respond, { once: true });
    },

    /** Register a response for `supabase.rpc(fn, args)`. */
    onRpc(
      fn: string,
      respond: QueryResponse | ((args: unknown) => QueryResponse)
    ) {
      rpcHandlers.set(fn, respond);
      return this;
    },

    /** Change the authenticated user (null = signed out). */
    setUser(user: FakeAuthUser | null) {
      currentUser = user;
      return this;
    },

    /** Recorded queries, optionally narrowed to a table and operation. */
    queries(table?: string, operation?: Operation) {
      return recorded.filter(
        (q) =>
          (table === undefined || q.table === table) &&
          (operation === undefined || q.operation === operation)
      );
    },

    rpcCalls,
    storageCalls,
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

let current: FakeSupabase = createFakeSupabase();

/** The fake returned by the mocked `createClient()` / `createServiceClient()`. */
export function getFakeSupabase(): FakeSupabase {
  return current;
}

/** Install a fresh fake for the current test and return it. */
export function useFakeSupabase(
  options: { user?: FakeAuthUser | null } = {}
): FakeSupabase {
  current = createFakeSupabase(options);
  return current;
}

/** Called before every test by `tests/setup.ts`. */
export function resetFakeSupabase() {
  current = createFakeSupabase();
}

/** Value of the first filter `method(column, value)` applied to `column`. */
export function filterValue(
  query: RecordedQuery,
  method: string,
  column: string
): unknown {
  return query.filters.find((f) => f.method === method && f.args[0] === column)
    ?.args[1];
}

/** Value passed to `.eq(column, value)`. */
export function eqValue(query: RecordedQuery, column: string): unknown {
  return filterValue(query, "eq", column);
}

/** True when the query has a filter `method` on `column`. */
export function hasFilter(
  query: RecordedQuery,
  method: string,
  column: string
): boolean {
  return query.filters.some((f) => f.method === method && f.args[0] === column);
}
