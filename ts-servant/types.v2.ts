import { Validation } from "io-ts";
import { Tail, Push } from "../../type-ts";
import { zipWith } from "fp-ts/lib/Array";
import { capture, queryParam } from "./builders";

export type HttpMethod = "GET";
// | "HEAD"
// | "PUT"
// | "POST"
// | "DELETE";
// | "CONNECT"
// | "OPTIONS"
// | "TRACE"
// | "PATCH";

// export type MimeType = "application/json" | "text/html" | "text/plain";

export type FromURLFragment<O> = (fragment: string) => Validation<O>;

export class Capture<F extends string = string, O = any> {
  readonly _O!: O;
  constructor(readonly identifier: F, readonly decoder: FromURLFragment<O>) {}
}

export type FromQueryParam<O> = (param: string) => Validation<O>;

export class QueryParam<F extends string = string, O = any> {
  readonly _O!: O;
  constructor(readonly name: F, readonly decoder: FromURLFragment<O>) {}
}

// export class QueryParams<F extends string = string, O = any> {
//   readonly _O!: O;
//   constructor(readonly name: F, readonly decoder: FromURLFragment<O>) {}
// }

// export type HeaderValue = number | string | string[];
// export type FromHeaderValue<I extends HeaderValue, O> = (
//   param: I
// ) => Validation<O>;
// export type ToHeaderValue<I extends HeaderValue, O> = (
//   param: O
// ) => Validation<I>;

// export class ReqHeader<
//   F extends string = string,
//   I extends HeaderValue = string,
//   O = any
// > {
//   readonly _I!: I;
//   readonly _O!: O;
//   constructor(readonly name: F, readonly decoder: FromHeaderValue<I, O>) {}
// }

// export class ResHeader<
//   F extends string = string,
//   I extends HeaderValue = string,
//   O = any
// > {
//   readonly _I!: I;
//   readonly _O!: O;
//   constructor(readonly name: F, readonly decoder: ToHeaderValue<I, O>) {}
// }

type NotRepeatingAcc<A, B extends any[], K extends keyof B[0], C> = {
  0: A;
  n: B[0][K] extends infer V
    ? V extends C
      ? never
      : NotRepeatingAcc<A, Tail<B>, K, C | V>
    : never;
}[B extends [] ? "0" : "n"];
export type NotRepeating<A extends any[], K extends keyof A[0]> = A extends []
  ? A
  : NotRepeatingAcc<A, A, K, never>;

export interface HasURLPath {
  readonly path: string;
}

export interface HasHTTPMethod<M extends HttpMethod> {
  readonly method: M;
}

export interface HasCaptures<C extends Capture<string, unknown>[]> {
  readonly captures: NotRepeating<C, "identifier">;
}

// export interface HasReqHeaders<H extends ReqHeader<any, any, unknown>[]> {
//   readonly reqHeaders: H;
// }

// export interface HasResHeaders<H extends ResHeader<any, any, any>[]> {
//   readonly resHeaders: H;
// }

export interface HasQueryParams<P extends QueryParam<string, unknown>[]> {
  readonly queryParams: P;
}

// export interface HasBody<D extends MimeDecoder<MimeType, any, any>> {
//   readonly bodyDecoder: D;
// }

// export interface HasResponse<E extends MimeEncoder<MimeType, any, any>> {
//   readonly resEncoder: E;
// }

export type Hide<H, T> = T extends infer B & H ? B : T;

// export type AddReqHeader<
//   N extends string,
//   V extends HeaderValue,
//   O,
//   B
// > = B extends HasReqHeaders<infer H>
//   ? Hide<HasReqHeaders<H>, B> & HasReqHeaders<Push<ReqHeader<N, V, O>, H>>
//   : B & HasReqHeaders<[ReqHeader<N, V, O>]>;

// export type UniqueReqHeader<N, B> = N extends string
//   ? B extends HasReqHeaders<infer H>
//     ? NotRepeating<Push<{ name: N }, H>, "name"> extends never
//       ? never
//       : N
//     : N
//   : never;

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

// export type AddResHeader<
//   N extends string,
//   V extends HeaderValue,
//   I,
//   B
// > = B extends HasResHeaders<infer H>
//   ? Hide<HasResHeaders<H>, B> & HasResHeaders<Push<ResHeader<N, V, I>, H>>
//   : B & HasResHeaders<[ResHeader<N, V, I>]>;

// export type UniqueResHeader<N, B> = N extends string
//   ? B extends HasResHeaders<infer H>
//     ? NotRepeating<Push<{ name: N }, H>, "name"> extends never
//       ? 2
//       : N
//     : N
//   : 1;

// export class MimeDecoder<M extends MimeType, I = any, O = any> {
//   readonly _I!: I;
//   readonly _O!: O;
//   constructor(
//     readonly mimeType: M,
//     readonly decoder: (input: I) => Validation<O>
//   ) {}
// }

// export class MimeEncoder<M extends MimeType, I, O> {
//   readonly _I!: I;
//   readonly _O!: O;
//   constructor(
//     readonly mimeType: M,
//     readonly encoder: (input: I) => Validation<O>
//   ) {}
// }

export interface EndpointDefinition {
  path: string;
  method: HttpMethod;
  captures: Capture<string, any>[];
  queryParams: QueryParam[];
  // reqHeaders: ReqHeader[];
  // body: MimeDecoder;
  // resHeaders: ResHeader[];
  // response: MimeEncoder;
}

class BuildEndpoint<E> implements BuildMethod<E>, BuildQueryParam<E> {
  constructor(readonly endpoint: E) {}

  method<M extends HttpMethod>(m: M): BuildQueryParam<E & HasHTTPMethod<M>> {
    return new BuildEndpoint<E & HasHTTPMethod<M>>({
      ...this.endpoint,
      method: m
    });
  }

  query<P extends string>(
    param: UniqueQueryParam<P, E>
  ): BuildQueryParam<AddQueryParam<P, E>> {
    return new BuildEndpoint<AddQueryParam<P, E>>({});
  }
}

function path<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildMethod<HasURLPath & HasCaptures<T>> {
  return new BuildEndpoint({
    path: zipWith(fragments.raw as string[], captures, (f, c) => {
      const identifier = c?.identifier ? `:${c.identifier}` : "";
      return (f ?? "") + identifier;
    }).join(""),
    captures
  });
}

const _test = path`/user/${capture("a")}`
  .method("GET")
  .query("a")
  .query("b");

// export interface BuildReqHeader {
//   reqHeader<N extends string, V extends HeaderValue = string, O = V>(
//     name: UniqueReqHeader<N, this>
//   ): typeof name extends never ? never : AddReqHeader<N, V, O, this>;
//   reqHeader<N extends string, V extends HeaderValue, O = V>(
//     name: UniqueReqHeader<N, this>,
//     value: V
//   ): typeof name extends never ? never : AddReqHeader<N, V, V, this>;
//   reqHeader<N extends string, V extends HeaderValue, O>(
//     name: UniqueReqHeader<N, this>,
//     value: V,
//     decoder: FromHeaderValue<V, O>
//   ): typeof name extends never ? never : AddReqHeader<N, V, O, this>;
// }

export interface BuildMethod<E> {
  method<M extends HttpMethod>(m: M): BuildQueryParam<E & HasHTTPMethod<M>>;
}

export interface BuildQueryParam<E> {
  query<P extends string>(
    param: UniqueQueryParam<P, E>
  ): BuildQueryParam<AddQueryParam<P, E>>;
}

// export interface BuildBody {
//   body<I, O, M extends MimeType, D extends MimeDecoder<M, I, O>>(
//     mimeDecoder: D
//   ): Hide<
//     HasBody<never>,
//     Hide<BuildBody, Hide<BuildReqHeader, Hide<BuildQueryParam, this>>>
//   > &
//     HasBody<D>;
// }

// export interface BuildResHeader {
//   resHeader<N extends string, V extends HeaderValue = string, O = V>(
//     name: UniqueResHeader<N, this>
//   ): typeof name extends never
//     ? never
//     : AddResHeader<
//         N,
//         V,
//         O,
//         Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
//       >;
//   resHeader<N extends string, V extends HeaderValue, O = V>(
//     name: UniqueResHeader<N, this>,
//     value: V
//   ): typeof name extends never
//     ? never
//     : AddResHeader<
//         N,
//         V,
//         O,
//         Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
//       >;
//   resHeader<N extends string, V extends HeaderValue, O>(
//     name: UniqueResHeader<N, this>,
//     value: V,
//     encoder: ToHeaderValue<V, O>
//   ): typeof name extends never
//     ? never
//     : AddResHeader<
//         N,
//         V,
//         O,
//         Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
//       >;
// }

// export interface BuildResponse {
//   response<M extends MimeType, I, O, E extends MimeEncoder<M, I, O>>(
//     encoder: E
//   ): Hide<
//     HasResponse<any>,
//     Hide<
//       BuildResponse,
//       Hide<
//         BuildResHeader,
//         Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
//       >
//     >
//   > &
//     HasResponse<E>;
// }

// class Builder<M extends HttpMethod, T extends Capture<string, unknown>[]>
//   implements
//     // BuildReqHeader,
//     // BuildQueryParam &
//     // BuildBody &
//     // BuildResHeader &
//     BuildResponse,
//     HasURLPath,
//     HasHTTPMethod<M>,
//     HasCaptures<T>,
//     // HasReqHeaders<[]> &
//     // HasQueryParams<[]> &
//     // HasBody<any>,
//     // HasResHeaders<[]> &
//     HasResponse<any> {
//   resEncoder: MimeEncoder<any, any, any> | null = null;
//   // readonly reqHeaders: ReqHeader<string, any, any>[] = []

//   constructor(
//     readonly method: M,
//     readonly path: string,
//     readonly captures: T
//   ) {}

//   response<M extends MimeType, I, O, E extends MimeEncoder<M, I, O>>(
//     encoder: E
//   ): Hide<
//     HasResponse<any>,
//     Hide<
//       BuildResponse,
//       Hide<
//         BuildResHeader,
//         Hide<BuildBody, Hide<BuildQueryParam, Hide<BuildReqHeader, this>>>
//       >
//     >
//   > &
//     HasResponse<E> {
//     this.resEncoder = encoder;
//     return this;
//   }

//   // reqHeader<N extends string, V extends HeaderValue, O>(
//   //   name: UniqueReqHeader<N, this>,
//   //   value?: V,
//   //   decoder?: FromHeaderValue<V, O>
//   // ): UniqueReqHeader<N, this> extends never
//   //   ? never
//   //   : AddReqHeader<N, V, O, this> {
//   //     this.reqHeaders.push(reqHeader(name as string, decoder));
//   //     return this;
//   //   }
// }

// function method<M extends HttpMethod, T extends Capture<string, unknown>[]>(
//   method: M,
//   fragments: TemplateStringsArray,
//   captures: T
// ): Builder<M, T> {
//   return new Builder(
//     method,
//     zipWith(fragments.raw as string[], captures, (f, c) => {
//       const identifier = c?.identifier ? `:${c.identifier}` : "";
//       return (f ?? "") + identifier;
//     }).join(""),
//     captures
//   );
// }

// export declare function GET<T extends Capture<string, unknown>[]>(
//   fragments: TemplateStringsArray,
//   ...captures: NotRepeating<T, "identifier">
// ): // BuildReqHeader &
// // BuildQueryParam &
// // BuildResHeader &
// BuildResponse &
//   HasURLPath &
//   HasHTTPMethod<"GET"> &
//   HasCaptures<typeof captures> &
//   // HasReqHeaders<[]> &
//   // HasQueryParams<[]> &
//   HasBody<never> &
//   // HasResHeaders<[]> &
//   HasResponse<any> {
//   return method("GET", fragments, captures);
// };

// // export declare function DELETE<T extends Capture<string, unknown>[]>(
// //   fragments: TemplateStringsArray,
// //   ...captures: NotRepeating<T, "identifier">
// // ): BuildReqHeader &
// //   BuildQueryParam &
// //   BuildResHeader &
// //   BuildResponse &
// //   HasURLPath &
// //   HasHTTPMethod<"DELETE"> &
// //   HasCaptures<typeof captures> &
// //   HasReqHeaders<[]> &
// //   HasQueryParams<[]> &
// //   HasBody<never> &
// //   HasResHeaders<[]> &
// //   HasResponse<never>;

// // export declare function POST<T extends Capture<string, unknown>[]>(
// //   fragments: TemplateStringsArray,
// //   ...captures: NotRepeating<T, "identifier">
// // ): BuildReqHeader &
// //   BuildQueryParam &
// //   BuildBody &
// //   BuildResHeader &
// //   BuildResponse &
// //   HasURLPath &
// //   HasHTTPMethod<"POST"> &
// //   HasCaptures<typeof captures> &
// //   HasReqHeaders<[]> &
// //   HasQueryParams<[]> &
// //   HasBody<never> &
// //   HasResHeaders<[]> &
// //   HasResponse<never>;
