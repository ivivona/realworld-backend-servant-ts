import { Capture } from "../ts-servant";
import { Type, string, success } from "io-ts";
import {
  JsonC,
  EndpointDefinition,
  Builder,
  MimeEncoder,
  MimeType,
  HasResponse,
  StatusCode,
  NotRepeating,
  HasURLPath,
  HasHTTPMethod,
  HasCaptures,
  NoBody,
  zipWith,
  UniqueReqHeader,
  AddReqHeader,
  HeaderValue,
  ReqHeader,
  UniqueResHeader,
  AddResHeader,
  HasBody,
  MimeDecoder,
  HttpMethod,
  UniqueQueryParam,
  AddQueryParam,
  QueryParam,
  QueryParams,
  ResHeader
} from "../ts-servant/types";
import * as codecs from "../ts-servant/codecs";
import { Cast } from "../../type-ts";

const identity = <A>() =>
  new Type<A, A, A>(
    "identity",
    (a): a is A => !!a,
    (a, _) => success(a),
    a => a
  );

export function capture<F extends string, O>(identifier: F): Capture<F, string>;
export function capture<F extends string, O>(
  identifier: F,
  decoder: Type<O, unknown, unknown>
): Capture<F, O>;
export function capture<F extends string, O>(
  identifier: F,
  decoder?: Type<O, unknown, unknown>
) {
  return { identifier, decoder: decoder?.decode ?? string.decode };
}

export function fromJson<A>(decoder: Type<A, unknown, unknown>) {
  return codecs.fromJson(decoder.decode);
}

export function asJson<A>(encoder: Type<A, JsonC["_T"], unknown>) {
  return codecs.asJson(encoder.encode);
}

class BuildResponse<E extends Partial<EndpointDefinition>>
  implements Builder<E> {
  constructor(readonly endpoint: E) {}

  response<C extends MimeEncoder<any, any>>(
    encoder: C
  ): E & HasResponse<C, 200>;
  response<C extends MimeEncoder<any, any>, S extends StatusCode>(
    encoder: C,
    status: S
  ): E & HasResponse<C, S>;
  response<C extends MimeEncoder<any, any>, S extends StatusCode>(
    encoder: C,
    status?: S
  ): E & HasResponse<C, S> {
    return {
      ...this.endpoint,
      resEncoder: encoder,
      status: status ?? ((200 as any) as S)
    };
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
    encoder: Type<O, V, unknown>
  ): BuildResHeader<AddResHeader<N, V, O, E>>;
  resHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueResHeader<N, E>,
    encoder?: Type<O, V, unknown>
  ): BuildResHeader<AddResHeader<Cast<N, string>, V, O, E>> {
    const { resHeaders, ...noResHeaders } = this.endpoint;
    if (resHeaders?.find(_ => _.name === name)) {
      throw new Error(`Response header [${name}] already specified`);
    }
    const newResHeaders: ResHeader<string, any, any>[] = [
      ...(resHeaders ?? []),
      resHeader(name, encoder ?? identity<any>())
    ];
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

  body<O, M extends MimeType<any>, D extends MimeDecoder<M, O>>(
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
  ): BuildQueryParam<AddQueryParam<P, E, O>>;
  query<P extends string, O = string>(
    param: UniqueQueryParam<P, E>,
    decoder: Type<O, unknown, unknown>
  ): BuildQueryParam<AddQueryParam<P, E, O>>;
  query<P extends string, O = string>(
    param: UniqueQueryParam<P, E>,
    decoder?: Type<O, unknown, unknown>
  ): BuildQueryParam<AddQueryParam<P, E, O>> {
    const { queryParams, ...noQueryParams } = this.endpoint;
    if (queryParams?.find(_ => _.name === param)) {
      throw new Error(`Query parameter [${param}] already specified`);
    }
    const newQueryParams: QueryParam<string, any>[] = [
      ...(queryParams ?? []),
      queryParam(param, decoder ?? identity<any>())
    ];
    const newEndpoint = {
      ...noQueryParams,
      queryParams: newQueryParams
    } as AddQueryParam<P, E, O>;
    return new BuildQueryParam<AddQueryParam<P, E, O>>(newEndpoint);
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
    decoder: Type<O, V, unknown>
  ): BuildReqHeader<AddReqHeader<N, V, O, E>>;
  reqHeader<N extends string, V extends HeaderValue, O>(
    name: UniqueReqHeader<N, E>,
    decoder?: Type<O, V, unknown>
  ): BuildReqHeader<AddReqHeader<Cast<N, string>, V, O, E>> {
    const { reqHeaders, ...noReqHeaders } = this.endpoint;
    if (reqHeaders?.find(_ => _.name === name)) {
      throw new Error(`Request header [${name}] already specified`);
    }
    const newReqHeaders: ReqHeader<string, any, any>[] = [
      ...(reqHeaders ?? []),
      reqHeader(name, decoder ?? identity<any>())
    ];
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

export function HEAD<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"HEAD"> & HasCaptures<T>> {
  return build<T, "HEAD">("HEAD", fragments, captures);
}

export function PATCH<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"PATCH"> & HasCaptures<T>> {
  return build<T, "PATCH">("PATCH", fragments, captures);
}

export function CONNECT<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"CONNECT"> & HasCaptures<T>> {
  return build<T, "CONNECT">("CONNECT", fragments, captures);
}

export function TRACE<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"TRACE"> & HasCaptures<T>> {
  return build<T, "TRACE">("TRACE", fragments, captures);
}

export function OPTIONS<T extends Capture<string, unknown>[]>(
  fragments: TemplateStringsArray,
  ...captures: NotRepeating<T, "identifier">
): BuildReqHeader<HasURLPath & HasHTTPMethod<"OPTIONS"> & HasCaptures<T>> {
  return build<T, "OPTIONS">("OPTIONS", fragments, captures);
}

export function queryParam<F extends string, O>(name: F): QueryParam<F, string>;
export function queryParam<F extends string, O>(
  name: F,
  decoder: Type<O, unknown, unknown>
): QueryParam<F, O>;
export function queryParam<F extends string, O>(
  name: F,
  decoder?: Type<O, unknown, unknown>
) {
  return { name, decoder: decoder?.decode ?? string.decode };
}

export function queryParams<F extends string, O>(
  name: F
): QueryParams<F, string>;
export function queryParams<F extends string, O>(
  name: F,
  decoder: Type<O, unknown, unknown>
): QueryParams<F, O>;
export function queryParams<F extends string, O>(
  name: F,
  decoder?: Type<O, unknown, unknown>
) {
  return { name, decoder: decoder?.decode ?? string.decode };
}

export function reqHeader<
  F extends string,
  I extends HeaderValue = string,
  O = I
>(name: F): ReqHeader<F, string, string>;
export function reqHeader<F extends string, I extends HeaderValue, O>(
  name: F,
  decoder: Type<O, I, unknown>
): ReqHeader<F, I, O>;
export function reqHeader<
  F extends string,
  I extends HeaderValue = string,
  O = I
>(name: F, decoder?: Type<O, unknown, I>) {
  return { name, decoder: decoder?.decode ?? identity().decode };
}

export function resHeader<
  F extends string,
  I = string,
  O extends HeaderValue = string
>(name: F): ResHeader<F, string, string>;
export function resHeader<F extends string, I, O extends HeaderValue>(
  name: F,
  decoder: Type<I, O, unknown>
): ResHeader<F, O, I>;
export function resHeader<
  F extends string,
  I = string,
  O extends HeaderValue = string
>(name: F, decoder?: Type<I, O, unknown>) {
  return { name, decoder: decoder?.decode ?? identity().decode };
}
