import { MimeDecoder, MimeEncoder, Json as JsonMimeType, JsonC } from "./types";
import { Validation } from "io-ts";

export function fromJson<A>(decoder: (a: JsonC["_T"]) => Validation<A>) {
  return new MimeDecoder(JsonMimeType, decoder);
}

export function asJson<A>(encoder: (a: A) => JsonC["_T"]) {
  return new MimeEncoder(JsonMimeType, encoder);
}
