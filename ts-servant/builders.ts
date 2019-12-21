import { right } from "fp-ts/lib/Either";
import {
  Capture,
  FromURLFragment,
  QueryParam
  // QueryParams,
  // HeaderValue,
  // ReqHeader,
  // FromHeaderValue,
  // ToHeaderValue,
  // ResHeader
} from "./types";

const noOp = <I>(t: I) => right(t);

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

// export function queryParams<F extends string, O>(
//   name: F
// ): QueryParams<F, string>;
// export function queryParams<F extends string, O>(
//   name: F,
//   decoder: FromURLFragment<O>
// ): QueryParams<F, O>;
// export function queryParams<F extends string, O>(
//   name: F,
//   decoder?: FromURLFragment<O>
// ) {
//   return { name, decoder: decoder ?? noOp };
// }

// export function reqHeader<
//   F extends string,
//   I extends HeaderValue = string,
//   O = I
// >(name: F): ReqHeader<F, string, string>;
// export function reqHeader<F extends string, I extends HeaderValue, O>(
//   name: F,
//   decoder: FromHeaderValue<I, O>
// ): ReqHeader<F, I, O>;
// export function reqHeader<
//   F extends string,
//   I extends HeaderValue = string,
//   O = I
// >(name: F, decoder?: FromHeaderValue<I, O>) {
//   return { name, decoder: decoder ?? noOp };
// }

// export function resHeader<
//   F extends string,
//   I = string,
//   O extends HeaderValue = string
// >(name: F): ResHeader<F, string, string>;
// export function resHeader<F extends string, I, O extends HeaderValue>(
//   name: F,
//   decoder: ToHeaderValue<O, I>
// ): ResHeader<F, O, I>;
// export function resHeader<
//   F extends string,
//   I = string,
//   O extends HeaderValue = string
// >(name: F, decoder?: ToHeaderValue<O, I>) {
//   return { name, decoder: decoder ?? noOp };
// }
