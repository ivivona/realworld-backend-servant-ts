import { Validation } from "io-ts";
import { right } from "fp-ts/lib/Either";
import { Tail, Push } from "../../type-ts";

export type HttpMethod =
  | "GET"
  | "HEAD"
  | "PUT"
  | "POST"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
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
  constructor(readonly name: F, readonly decoder: FromURLFragment<O>) {}
}

export class QueryParams<F extends string, O> {
  readonly _O!: O;
  constructor(readonly name: F, readonly decoder: FromURLFragment<O>) {}
}

export function queryParam<F extends string, O>(name: F): QueryParam<F, string>;
export function queryParam<F extends string, O>(
  name: F,
  decoder: FromURLFragment<O>
): QueryParam<F, O>;
export function queryParam<F extends string, O>(
  name: F,
  decoder?: FromURLFragment<O>
) {
  return { name, decoder: decoder ?? noOp };
}

export function queryParams<F extends string, O>(
  name: F
): QueryParams<F, string>;
export function queryParams<F extends string, O>(
  name: F,
  decoder: FromURLFragment<O>
): QueryParams<F, O>;
export function queryParams<F extends string, O>(
  name: F,
  decoder?: FromURLFragment<O>
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

export interface BuildReqHeader {
  reqHeader<N extends string, V extends HeaderValue = string, O = V>(
    name: UniqueReqHeader<N, this>
  ): typeof name extends never ? never : AddReqHeader<N, V, O, this>;
  reqHeader<N extends string, V extends HeaderValue, O = V>(
    name: UniqueReqHeader<N, this>,
    value: V
  ): typeof name extends never ? never : AddReqHeader<N, V, V, this>;
  reqHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueReqHeader<N, this>,
    value: V,
    decoder: FromHeaderValue<V, O>
  ): typeof name extends never ? never : AddReqHeader<N, V, O, this>;
}

export interface BuildQueryParam {
  query<P extends string>(
    param: UniqueQueryParam<P, this>
  ): typeof param extends never
    ? never
    : AddQueryParam<P, Hide<BuildReqHeader, this>>;
}

export interface BuildBody {
  body<I, O, M extends MimeType, D extends MimeDecoder<M, I, O>>(
    mimeDecoder: D
  ): Hide<
    HasBody<never>,
    Hide<BuildBody, Hide<BuildReqHeader, Hide<BuildQueryParam, this>>>
  > &
    HasBody<D>;
}

export interface BuildResHeader {
  resHeader<N extends string, V extends HeaderValue = string, O = V>(
    name: UniqueResHeader<N, this>
  ): typeof name extends never
    ? never
    : AddResHeader<
        N,
        V,
        O,
        Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
      >;
  resHeader<N extends string, V extends HeaderValue, O = V>(
    name: UniqueResHeader<N, this>,
    value: V
  ): typeof name extends never
    ? never
    : AddResHeader<
        N,
        V,
        O,
        Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
      >;
  resHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueResHeader<N, this>,
    value: V,
    encoder: ToHeaderValue<V, O>
  ): typeof name extends never
    ? never
    : AddResHeader<
        N,
        V,
        O,
        Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
      >;
}

export interface BuildResponse {
  response<M extends MimeType, I, O, E extends MimeEncoder<M, I, O>>(
    encoder: E
  ): Hide<
    HasResponse<any>,
    Hide<
      BuildResponse,
      Hide<
        BuildResHeader,
        Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
      >
    >
  > &
    HasResponse<E>;
}

export declare function GET<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader &
  BuildQueryParam &
  BuildResHeader &
  BuildResponse &
  HasURLPath &
  HasHTTPMethod<"GET"> &
  HasCaptures<typeof captures> &
  HasReqHeaders<[]> &
  HasQueryParams<[]> &
  HasBody<never> &
  HasResHeaders<[]> &
  HasResponse<any>;

export declare function DELETE<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader &
  BuildQueryParam &
  BuildResHeader &
  BuildResponse &
  HasURLPath &
  HasHTTPMethod<"DELETE"> &
  HasCaptures<typeof captures> &
  HasReqHeaders<[]> &
  HasQueryParams<[]> &
  HasBody<never> &
  HasResHeaders<[]> &
  HasResponse<never>;

export declare function POST<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader &
  BuildQueryParam &
  BuildBody &
  BuildResHeader &
  BuildResponse &
  HasURLPath &
  HasHTTPMethod<"POST"> &
  HasCaptures<typeof captures> &
  HasReqHeaders<[]> &
  HasQueryParams<[]> &
  HasBody<never> &
  HasResHeaders<[]> &
  HasResponse<never>;
