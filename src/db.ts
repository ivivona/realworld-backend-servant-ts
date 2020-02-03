import { parse } from "pg-connection-string";
import {
  ConnectionPoolConfig,
  makeConnectionPool,
  camelCasedQueries,
  isDriverQueryError,
  ConnectedEnvironment
} from "pg-ts-v2";
import { fail } from "assert";
import { Type } from "io-ts";
import { QueryConfig } from "pg";
import { fold as foldE, Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { fold, right, left, map } from "fp-ts/lib/TaskEither";
import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { Option } from "fp-ts/lib/Option";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";

export class PgDuplicatedKeyError extends Error {
  public readonly _PgDuplicatedKeyError: void;

  constructor(
    public readonly error: unknown,
    public readonly query: QueryConfig,
    public readonly context: unknown
  ) {
    super("Duplicate key value violates unique constraint.");

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PgDuplicatedKeyError);
    }

    this.name = this.constructor.name;
  }
}

const originalOrDuplicatedKeyError = <E>(original: E) => {
  if (
    isDriverQueryError(original) &&
    original.message.includes("duplicate key value violates unique constraint")
  ) {
    const error = new PgDuplicatedKeyError(
      original,
      original.query,
      original.context
    );
    return error;
  }
  return original;
};
export const isDuplicatedKeyError = (e: unknown): e is PgDuplicatedKeyError => {
  return e instanceof PgDuplicatedKeyError;
};

const eitherToPromise = <E, A>(either: Either<E, A>) =>
  foldE(
    (e: E) => Promise.reject(e),
    (a: A) => Promise.resolve(a)
  )(either);

const getPoolConfig = (connectionString: string): ConnectionPoolConfig => {
  const {
    client_encoding,
    fallback_application_name,
    ...connectionConfig
  } = parse(connectionString);

  return {
    ...connectionConfig,
    onError: fail,
    parsers: {},
    statement_timeout: 200000
  } as ConnectionPoolConfig;
};

export async function queries(
  connectionString: string
): Promise<{
  queryAny: <A = any>(
    type: Type<A, any, unknown>,
    query: QueryConfig,
    context?: unknown
  ) => Promise<A[]>;
  queryNone: (query: QueryConfig<any[]>, context?: unknown) => Promise<void>;
  queryOne: <A = any>(
    type: Type<A, any, unknown>,
    query: QueryConfig,
    context?: unknown
  ) => Promise<A>;
  queryOneOrMore: <A = any>(
    type: Type<A, any, unknown>,
    query: QueryConfig,
    context?: unknown
  ) => Promise<NonEmptyArray<A>>;
  queryOneOrNone: <A = any>(
    type: Type<A, any, unknown>,
    query: QueryConfig,
    context?: unknown
  ) => Promise<Option<A>>;
}> {
  return pipe(
    makeConnectionPool(getPoolConfig(connectionString)),
    map(pool => {
      function asyncify<A = any, R = A>(
        method: (
          type: Type<A, any, unknown>,
          query: QueryConfig,
          context?: unknown
        ) => ReaderTaskEither<ConnectedEnvironment, unknown, R>
      ) {
        return (
          type: Type<A, any, unknown>,
          query: QueryConfig,
          context?: unknown
        ) =>
          pipe(
            pool.withConnection(method(type, query, context)),
            fold(
              error => left(originalOrDuplicatedKeyError(error)),
              result => right(result)
            )
          )().then(eitherToPromise);
      }
      const queryNone = (query: QueryConfig<any[]>, context?: unknown) => {
        return pipe(
          pool.withConnection(camelCasedQueries.queryNone(query, context)),
          fold(
            error => left(originalOrDuplicatedKeyError(error)),
            result => right(result)
          )
        )().then(eitherToPromise);
      };
      const queryAny = asyncify(camelCasedQueries.queryAny);
      const queryOne = asyncify(camelCasedQueries.queryOne);
      const queryOneOrMore = asyncify(camelCasedQueries.queryOneOrMore);
      const queryOneOrNone = asyncify(camelCasedQueries.queryOneOrNone);
      return {
        queryAny,
        queryNone,
        queryOne,
        queryOneOrMore,
        queryOneOrNone
      };
    })
  )().then(eitherToPromise);
}
