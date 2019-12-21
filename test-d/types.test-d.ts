import { expectType, expectError } from "tsd";
import {
  Capture,
  capture,
  QueryParam,
  queryParam,
  QueryParams,
  queryParams,
  ReqHeader,
  reqHeader,
  POST,
  HasCaptures,
  HasReqHeaders,
  HasQueryParams,
  HasResHeaders,
  ResHeader,
  MimeDecoder,
  MimeEncoder,
  HasBody,
  HasResponse
} from "../servant/types";
import { right } from "fp-ts/lib/Either";

const parseNumber = _ => right(parseInt(_, 10));
const decodeJSON = new MimeDecoder("application/json", (_: string) =>
  right(JSON.parse(_))
);
const encodeJSON = new MimeEncoder("application/json", _ =>
  right(JSON.stringify(_))
);

expectType<Capture<"nacho", string>>(capture("nacho"));
expectType<Capture<"nacho", number>>(capture("nacho", parseNumber));

expectType<QueryParam<"nacho", string>>(queryParam("nacho"));
expectType<QueryParam<"nacho", number>>(queryParam("nacho", parseNumber));

expectType<QueryParams<"nacho", string>>(queryParams("nacho"));
expectType<QueryParams<"nacho", number>>(queryParams("nacho", parseNumber));

expectType<ReqHeader<"nacho", string, string>>(reqHeader("nacho"));
expectType<ReqHeader<"nacho", string, number>>(reqHeader("nacho", parseNumber));
expectType<ReqHeader<"nacho", string[], number[]>>(
  reqHeader("nacho", _ => right(_.map(__ => parseInt(__, 10))))
);
expectType<ReqHeader<"nacho", number, number>>(
  reqHeader("nacho", _ => right(_))
);

expectError(POST`/api/users/${capture("id")}/articles/${capture("id")}`);
expectError(
  POST`/api/users`.reqHeader("Content-Type").reqHeader("Content-Type")
);
expectError(
  POST`/api/users`
    .reqHeader("Content-Type")
    .body(null)
    .reqHeader("Authorization")
);
expectError(
  POST`/api/users`
    .reqHeader("Content-Type")
    .query("q")
    .reqHeader("Authorization")
);
expectError(POST`/api/users`.query("q").query("q"));
expectError(
  POST`/api/users`
    .query("q")
    .body(null)
    .query("q")
);
expectError(
  POST`/api/users`
    .resHeader("Content-Type")
    .body(null)
    .body(null)
);
expectError(
  POST`/api/users`.resHeader("Content-Type").resHeader("Content-Type")
);
expectError(POST`/api/users`.response(null).body(null));
expectError(POST`/api/users`.response(null).response(null));
expectError(POST`/api/users`.response(null).resHeader("Content-Type"));

const createUserEndpoint = POST`/api/users/${capture("id")}/articles/${capture(
  "articleId"
)}`
  .reqHeader("Content-Type")
  .reqHeader("Authorization")
  .query("q")
  .query("s")
  .body(decodeJSON)
  .resHeader("Content-Type-2")
  .resHeader("Authorization-2")
  .response(encodeJSON);
expectType<HasCaptures<[Capture<"id", string>, Capture<"articleId", string>]>>(
  createUserEndpoint
);
expectType<
  HasReqHeaders<
    [
      ReqHeader<"Content-Type", string, string>,
      ReqHeader<"Authorization", string, string>
    ]
  >
>(createUserEndpoint);
expectType<HasQueryParams<[QueryParam<"q", string>, QueryParam<"s", string>]>>(
  createUserEndpoint
);
expectType<
  HasResHeaders<
    [
      ResHeader<"Content-Type-2", string, string>,
      ResHeader<"Authorization-2", string, string>
    ]
  >
>(createUserEndpoint);
expectType<HasBody<MimeDecoder<"application/json", string, any>>>(
  createUserEndpoint
);
expectType<HasResponse<MimeEncoder<"application/json", any, string>>>(
  createUserEndpoint
);
