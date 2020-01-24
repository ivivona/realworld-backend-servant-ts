import { Capture } from "../ts-servant";
import { Type, string /*, identity */ } from "io-ts";
import { JsonC } from "../ts-servant/types";
import * as codecs from "../ts-servant/codecs";
// import {
// FromQueryParam
// QueryParams,
// HeaderValue,
// ReqHeader,
// ResHeader
// } from "../ts-servant/types";

// type RawQueryParam = Parameters<FromQueryParam<any>>[0];

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

// export function queryParam<F extends string, O>(name: F): QueryParam<F, string>;
// export function queryParam<F extends string, O>(
//   name: F,
//   decoder: Type<O, unknown, RawQueryParam>
// ): QueryParam<F, O>;
// export function queryParam<F extends string, O>(
//   name: F,
//   decoder?: Type<O, unknown, RawQueryParam>
// ) {
//   return { name, decoder: decoder?.decode ?? string.decode };
// }

// export function queryParams<F extends string, O>(
//   name: F
// ): QueryParams<F, string>;
// export function queryParams<F extends string, O>(
//   name: F,
//   decoder: Type<O, unknown, RawQueryParam>
// ): QueryParams<F, O>;
// export function queryParams<F extends string, O>(
//   name: F,
//   decoder?: Type<O, unknown, RawQueryParam>
// ) {
//   return { name, decoder: decoder?.decode ?? string.decode };
// }

// export function reqHeader<
//   F extends string,
//   I extends HeaderValue = string,
//   O = I
// >(name: F): ReqHeader<F, string, string>;
// export function reqHeader<F extends string, I extends HeaderValue, O>(
//   name: F,
//   decoder: Type<O, unknown, I>
// ): ReqHeader<F, I, O>;
// export function reqHeader<
//   F extends string,
//   I extends HeaderValue = string,
//   O = I
// >(name: F, decoder?: Type<O, unknown, I>) {
//   return { name, decoder: decoder?.decode ?? identity };
// }

// export function resHeader<
//   F extends string,
//   I = string,
//   O extends HeaderValue = string
// >(name: F): ResHeader<F, string, string>;
// export function resHeader<F extends string, I, O extends HeaderValue>(
//   name: F,
//   decoder: Type<unknown, O, I>
// ): ResHeader<F, O, I>;
// export function resHeader<
//   F extends string,
//   I = string,
//   O extends HeaderValue = string
// >(name: F, decoder?: Type<unknown, O, I>) {
//   return { name, decoder: decoder?.decode ?? identity };
// }
