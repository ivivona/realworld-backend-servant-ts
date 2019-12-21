import { Validation } from "io-ts";
import { right } from "fp-ts/lib/Either";
import { Tail, Push, Cast } from "../../type-ts";
import { zipWith } from "fp-ts/lib/Array";

export type HttpMethod =
  | "GET"
  // | "HEAD"
  | "PUT"
  | "POST"
  | "DELETE"
  // | "CONNECT"
  // | "OPTIONS"
  // | "TRACE"
  | "PATCH";

export type MimeType = "application/json" | "text/html" | "text/plain";

export type FromURLFragment<O> = (fragment: string) => Validation<O>;

const noOp = <I>(t: I) => right(t);

export class Capture<F extends string, O> {
  readonly _O!: O;
  constructor(readonly identifier: F, readonly decoder: FromURLFragment<O>) {}
}

export function capture<F extends string, O>(identifier: F): Capture<F, string>;
export function capture<F extends string, O>(
  identifier: F,
  decoder: FromURLFragment<O>
): Capture<F, O>;
export function capture<F extends string, O>(
  identifier: F,
  decoder?: FromURLFragment<O>
) {
  return { identifier, decoder: decoder ?? noOp };
}

export type FromQueryParam<O> = (param: string) => Validation<O>;

export class QueryParam<F extends string, O> {
  readonly _O!: O;
  constructor(readonly name: F, readonly decoder: FromQueryParam<O>) {}
}

export class QueryParams<F extends string, O> {
  readonly _O!: O;
  constructor(readonly name: F, readonly decoder: FromQueryParam<O>) {}
}

export function queryParam<F extends string, O>(name: F): QueryParam<F, string>;
export function queryParam<F extends string, O>(
  name: F,
  decoder: FromQueryParam<O>
): QueryParam<F, O>;
export function queryParam<F extends string, O>(
  name: F,
  decoder?: FromQueryParam<O>
) {
  return { name, decoder: decoder ?? noOp };
}

export function queryParams<F extends string, O>(
  name: F
): QueryParams<F, string>;
export function queryParams<F extends string, O>(
  name: F,
  decoder: FromQueryParam<O>
): QueryParams<F, O>;
export function queryParams<F extends string, O>(
  name: F,
  decoder?: FromQueryParam<O>
) {
  return { name, decoder: decoder ?? noOp };
}

export type HeaderValue = number | string | string[];
export type FromHeaderValue<I extends HeaderValue, O> = (
  param: I
) => Validation<O>;
export type ToHeaderValue<I extends HeaderValue, O> = (
  param: O
) => Validation<I>;

export class ReqHeader<F extends string, I extends HeaderValue, O> {
  readonly _I!: I;
  readonly _O!: O;
  constructor(readonly name: F, readonly decoder: FromHeaderValue<I, O>) {}
}

export class ResHeader<F extends string, I extends HeaderValue, O> {
  readonly _I!: I;
  readonly _O!: O;
  constructor(readonly name: F, readonly decoder: ToHeaderValue<I, O>) {}
}

export function reqHeader<
  F extends string,
  I extends HeaderValue = string,
  O = I
>(name: F): ReqHeader<F, string, string>;
export function reqHeader<F extends string, I extends HeaderValue, O>(
  name: F,
  decoder: FromHeaderValue<I, O>
): ReqHeader<F, I, O>;
export function reqHeader<
  F extends string,
  I extends HeaderValue = string,
  O = I
>(name: F, decoder?: FromHeaderValue<I, O>) {
  return { name, decoder: decoder ?? noOp };
}

export function resHeader<
  F extends string,
  I = string,
  O extends HeaderValue = string
>(name: F): ResHeader<F, string, string>;
export function resHeader<F extends string, I, O extends HeaderValue>(
  name: F,
  decoder: ToHeaderValue<O, I>
): ResHeader<F, O, I>;
export function resHeader<
  F extends string,
  I = string,
  O extends HeaderValue = string
>(name: F, decoder?: ToHeaderValue<O, I>) {
  return { name, decoder: decoder ?? noOp };
}

type NotRepeatingAcc<A, B extends unknown[], K extends keyof B[0], C> = {
  0: A;
  n: B[0][K] extends infer V
    ? V extends C
      ? never
      : NotRepeatingAcc<A, Tail<B>, K, C | V>
    : never;
}[B extends [] ? "0" : "n"];
export type NotRepeating<
  A extends unknown[],
  K extends keyof A[0]
> = A extends [] ? A : NotRepeatingAcc<A, A, K, never>;

export interface HasURLPath {
  readonly path: string;
}

export interface HasHTTPMethod<M extends HttpMethod> {
  readonly method: M;
}

export interface HasCaptures<C extends Capture<string, unknown>[]> {
  readonly captures: C;
}

export interface HasReqHeaders<H extends ReqHeader<any, any, unknown>[]> {
  readonly reqHeaders: H;
}

export interface HasResHeaders<H extends ResHeader<any, any, any>[]> {
  readonly resHeaders: H;
}

export interface HasQueryParams<P extends QueryParam<string, unknown>[]> {
  readonly queryParams: P;
}

export interface HasBody<D extends MimeDecoder<MimeType, any, any>> {
  readonly bodyDecoder: D;
}

export interface HasResponse<E extends MimeEncoder<MimeType, any, any>> {
  readonly resEncoder: E;
}

export type Hide<H, T> = T extends infer B & H ? B : T;

export type AddReqHeader<
  N extends string,
  V extends HeaderValue,
  O,
  B
> = B extends HasReqHeaders<infer H>
  ? Hide<HasReqHeaders<H>, B> & HasReqHeaders<Push<ReqHeader<N, V, O>, H>>
  : B & HasReqHeaders<[ReqHeader<N, V, O>]>;

export type UniqueReqHeader<N, B> = N extends string
  ? B extends HasReqHeaders<infer H>
    ? NotRepeating<Push<{ name: N }, H>, "name"> extends never
      ? never
      : N
    : N
  : never;

export type AddQueryParam<N extends string, B> = B extends HasQueryParams<
  infer H
>
  ? Hide<HasQueryParams<H>, B> & HasQueryParams<Push<QueryParam<N, string>, H>>
  : B & HasQueryParams<[QueryParam<N, string>]>;

export type UniqueQueryParam<N, B> = N extends string
  ? B extends HasQueryParams<infer H>
    ? NotRepeating<Push<{ name: N }, H>, "name"> extends never
      ? never
      : N
    : N
  : never;

export type AddResHeader<
  N extends string,
  V extends HeaderValue,
  I,
  B
> = B extends HasResHeaders<infer H>
  ? Hide<HasResHeaders<H>, B> & HasResHeaders<Push<ResHeader<N, V, I>, H>>
  : B & HasResHeaders<[ResHeader<N, V, I>]>;

export type UniqueResHeader<N, B> = N extends string
  ? B extends HasResHeaders<infer H>
    ? NotRepeating<Push<{ name: N }, H>, "name"> extends never
      ? 2
      : N
    : N
  : 1;

export class MimeDecoder<M extends MimeType, I, O> {
  readonly _I!: I;
  readonly _O!: O;
  constructor(
    readonly mimeType: M,
    readonly decoder: (input: I) => Validation<O>
  ) {}
}

export class MimeEncoder<M extends MimeType, I, O> {
  readonly _I!: I;
  readonly _O!: O;
  constructor(
    readonly mimeType: M,
    readonly encoder: (input: I) => Validation<O>
  ) {}
}

export interface EndpointDefinition
  extends HasURLPath,
    HasHTTPMethod<HttpMethod>,
    HasReqHeaders<ReqHeader<any, any, any>[]>,
    HasQueryParams<QueryParam<string, any>[]>,
    HasBody<MimeDecoder<MimeType, any, any>>,
    HasResHeaders<ResHeader<string, any, any>[]>,
    HasResponse<MimeEncoder<MimeType, any, any>> {}

interface Builder<E> {
  readonly endpoint: E;
}

type NoBody<
  T extends Builder<any>,
  M extends HttpMethod
> = T["endpoint"] extends HasHTTPMethod<M> ? Omit<T, "body"> : T;

class BuildResponse<E extends Partial<EndpointDefinition>>
  implements Builder<E> {
  constructor(readonly endpoint: E) {}

  response<M extends MimeType, C extends MimeEncoder<M, any, any>>(
    encoder: C
  ): E & HasResponse<C> {
    return { ...this.endpoint, resEncoder: encoder };
  }
}

class BuildResHeader<
  E extends Partial<EndpointDefinition>
> extends BuildResponse<E> {
  constructor(readonly endpoint: E) {
    super(endpoint);
  }

  resHeader<N extends string, V extends HeaderValue, O = V>(
    name: UniqueResHeader<N, E>
  ): BuildResHeader<AddResHeader<N, V, O, E>>;
  resHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueResHeader<N, E>,
    encoder: ToHeaderValue<V, O>
  ): BuildResHeader<AddResHeader<N, V, O, E>>;
  resHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueResHeader<N, E>,
    encoder?: ToHeaderValue<V, O>
  ): BuildResHeader<AddResHeader<Cast<N, string>, V, O, E>> {
    const { resHeaders, ...noResHeaders } = this.endpoint;
    if (resHeaders?.find(_ => _.name === name)) {
      throw new Error(`Response header [${name}] already specified`);
    }
    const newResHeaders: ResHeader<string, any, any>[] = resHeaders
      ? [...resHeaders, resHeader(name, encoder ?? noOp)]
      : [];
    const newEndpoint = {
      ...noResHeaders,
      resHeaders: newResHeaders
    } as AddResHeader<Cast<N, string>, V, O, E>;
    return new BuildResHeader<AddResHeader<Cast<N, string>, V, O, E>>(
      newEndpoint
    );
  }
}

class BuildBody<E extends Partial<EndpointDefinition>> extends BuildResHeader<
  E
> {
  constructor(readonly endpoint: E) {
    super(endpoint);
  }

  body<I, O, M extends MimeType, D extends MimeDecoder<M, I, O>>(
    mimeDecoder: D
  ): BuildResHeader<E & HasBody<D>> {
    return new BuildResHeader<E & HasBody<D>>({
      ...this.endpoint,
      bodyDecoder: mimeDecoder
    });
  }
}

class BuildQueryParam<E extends Partial<EndpointDefinition>> extends BuildBody<
  E
> {
  constructor(readonly endpoint: E) {
    super(endpoint);
  }

  query<P extends string, O = string>(
    param: UniqueQueryParam<P, E>
  ): BuildQueryParam<AddQueryParam<P, E>>;
  query<P extends string, O = string>(
    param: UniqueQueryParam<P, E>,
    decoder: FromQueryParam<O>
  ): BuildQueryParam<AddQueryParam<P, E>>;
  query<P extends string, O = string>(
    param: UniqueQueryParam<P, E>,
    decoder?: FromQueryParam<O>
  ): BuildQueryParam<AddQueryParam<P, E>> {
    const { queryParams, ...noQueryParams } = this.endpoint;
    if (queryParams?.find(_ => _.name === param)) {
      throw new Error(`Query parameter [${param}] already specified`);
    }
    const newQueryParams: QueryParam<string, any>[] = queryParams
      ? [
          ...queryParams,
          queryParam(param, decoder ?? (noOp as FromQueryParam<O>))
        ]
      : [];
    const newEndpoint = {
      ...noQueryParams,
      reqHeaders: newQueryParams
    } as AddQueryParam<P, E>;
    return new BuildQueryParam<AddQueryParam<P, E>>(newEndpoint);
  }
}

class BuildReqHeader<
  E extends Partial<EndpointDefinition>
> extends BuildQueryParam<E> {
  constructor(readonly endpoint: E) {
    super(endpoint);
  }

  reqHeader<N extends string, V extends HeaderValue, O = V>(
    name: UniqueReqHeader<N, E>
  ): BuildReqHeader<AddReqHeader<N, V, O, E>>;
  reqHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueReqHeader<N, E>,
    decoder: FromHeaderValue<V, O>
  ): BuildReqHeader<AddReqHeader<N, V, O, E>>;
  reqHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueReqHeader<N, E>,
    decoder?: FromHeaderValue<V, O>
  ): BuildReqHeader<AddReqHeader<Cast<N, string>, V, O, E>> {
    const { reqHeaders, ...noReqHeaders } = this.endpoint;
    if (reqHeaders?.find(_ => _.name === name)) {
      throw new Error(`Request header [${name}] already specified`);
    }
    const newReqHeaders: ReqHeader<string, any, any>[] = reqHeaders
      ? [...reqHeaders, reqHeader(name, decoder ?? noOp)]
      : [];
    const newEndpoint = {
      ...noReqHeaders,
      reqHeaders: newReqHeaders
    } as AddReqHeader<Cast<N, string>, V, O, E>;
    return new BuildReqHeader<AddReqHeader<Cast<N, string>, V, O, E>>(
      newEndpoint
    );
  }
}

function build<T extends Capture<string, unknown>[], M extends HttpMethod>(
  method: M,
  fragments: TemplateStringsArray,
  captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<M> & HasCaptures<T>> {
  return new BuildReqHeader<HasURLPath & HasHTTPMethod<M> & HasCaptures<T>>({
    path: zipWith(fragments.raw as string[], captures, (f, c) => {
      const identifier = c?.identifier ? `:${c.identifier}` : "";
      return (f ?? "") + identifier;
    }).join(""),
    captures,
    method
  });
}

export function GET<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): NoBody<
  BuildReqHeader<HasURLPath & HasHTTPMethod<"GET"> & HasCaptures<T>>,
  "GET"
> {
  return build<T, "GET">("GET", fragments, captures);
}

export function DELETE<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): NoBody<
  BuildReqHeader<HasURLPath & HasHTTPMethod<"DELETE"> & HasCaptures<T>>,
  "DELETE"
> {
  return build<T, "DELETE">("DELETE", fragments, captures);
}

export function POST<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"POST"> & HasCaptures<T>> {
  return build<T, "POST">("POST", fragments, captures);
}

export function PUT<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"PUT"> & HasCaptures<T>> {
  return build<T, "PUT">("PUT", fragments, captures);
}

// export function HEAD<T extends Capture<string, unknown>[]>(
//   fragments: TemplateStringsArray,
//   ...captures: NotRepeating<T, "identifier">
// ): BuildReqHeader<HasURLPath & HasHTTPMethod<"HEAD"> & HasCaptures<T>> {
//   return build<T, "HEAD">("HEAD", fragments, captures);
// }

export function PATCH<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"PATCH"> & HasCaptures<T>> {
  return build<T, "PATCH">("PATCH", fragments, captures);
}

// export function CONNECT<T extends Capture<string, unknown>[]>(
//   fragments: TemplateStringsArray,
//   ...captures: NotRepeating<T, "identifier">
// ): BuildReqHeader<HasURLPath & HasHTTPMethod<"CONNECT"> & HasCaptures<T>> {
//   return build<T, "CONNECT">("CONNECT", fragments, captures);
// }

// export function TRACE<T extends Capture<string, unknown>[]>(
//   fragments: TemplateStringsArray,
//   ...captures: NotRepeating<T, "identifier">
// ): BuildReqHeader<HasURLPath & HasHTTPMethod<"TRACE"> & HasCaptures<T>> {
//   return build<T, "TRACE">("TRACE", fragments, captures);
// }

// export function OPTIONS<T extends Capture<string, unknown>[]>(
//   fragments: TemplateStringsArray,
//   ...captures: NotRepeating<T, "identifier">
// ): BuildReqHeader<HasURLPath & HasHTTPMethod<"OPTIONS"> & HasCaptures<T>> {
//   return build<T, "OPTIONS">("OPTIONS", fragments, captures);
// }
