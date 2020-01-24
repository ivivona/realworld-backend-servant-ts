import {
  MimeEncoder,
  HasURLPath,
  HasHTTPMethod,
  HttpMethod,
  HasResponse,
  QueryParam,
  EndpointDefinition,
  ReqHeader,
  MimeDecoder,
  StatusCode
} from "../ts-servant";
import { Tail } from "type-ts";
import * as express from "express";
import { Capture } from "../ts-servant/types";

type QueryMap<Q extends QueryParam<string, any>[]> = {
  "0": {};
  n: { [k in Q[0]["name"]]: Q[0]["_O"] } & QueryMap<Tail<Q>>;
}[Q extends [] ? "0" : "n"];
type WithQueryParams<A> = A extends { queryParams: infer QP }
  ? QP extends QueryParam<string, any>[]
    ? { query: QueryMap<QP> }
    : {}
  : {};

type HeaderMap<Q extends ReqHeader<string, any, any>[]> = {
  "0": {};
  n: { [k in Q[0]["name"]]: Q[0]["_O"] } & HeaderMap<Tail<Q>>;
}[Q extends [] ? "0" : "n"];
type WithHeaders<A> = A extends { reqHeaders: infer HS }
  ? HS extends ReqHeader<string, any, any>[]
    ? { headers: HeaderMap<HS> }
    : {}
  : {};

type WithBody<A> = A extends { bodyDecoder: infer B }
  ? B extends MimeDecoder<any, infer O>
    ? { body: O }
    : {}
  : {};

type CaptureMap<Q extends Capture<any, any>[]> = {
  "0": {};
  n: { [k in Q[0]["identifier"]]: Q[0]["_O"] } & CaptureMap<Tail<Q>>;
}[Q extends [] ? "0" : "n"];
type WithCaptures<A> = A extends { captures: infer C }
  ? C extends Capture<any, any>[]
    ? { captures: CaptureMap<C> }
    : {}
  : {};

type ApiEndpoint = Partial<EndpointDefinition> &
  HasURLPath &
  HasHTTPMethod<HttpMethod> &
  HasResponse<MimeEncoder<any, any>, StatusCode>;

type Handler<A extends ApiEndpoint> = (
  ctx: WithCaptures<A> & WithQueryParams<A> & WithHeaders<A> & WithBody<A>
) => Promise<A["resEncoder"]["_I"]> | A["resEncoder"]["_I"];

export function addToRouter<A extends ApiEndpoint>(
  api: A,
  handler: Handler<A>,
  router: express.Router
): express.Router {
  function exhaustiveCheck(_: never) {}

  const middleware = async function(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const ctx = ({
        captures: api.captures?.reduce((cs, c) => {
          const value = c.decoder(req.param(c.identifier));
          switch (value._tag) {
            case "Left":
              throw value;
            case "Right":
              return {
                ...cs,
                [c.identifier]: value.right
              };
          }
        }, {}),
        headers: api.reqHeaders?.reduce((hs, h) => {
          const value = h.decoder(req.header(h.name));
          switch (value._tag) {
            case "Left":
              throw value;
            case "Right":
              return {
                ...hs,
                [h.name]: value.right
              };
          }
        }, {}),
        query: api.queryParams?.reduce((qps, qp) => {
          const value = qp.decoder(req.query[qp.name]);
          switch (value._tag) {
            case "Left":
              throw value;
            case "Right":
              return {
                ...qps,
                [qp.name]: value.right
              };
          }
        }, {}),
        body: (() => {
          const b = api.bodyDecoder?.decoder(req.body);
          if (b) {
            switch (b._tag) {
              case "Left":
                throw b;
              case "Right":
                return b.right;
            }
          }
          return undefined;
        })()
      } as any) as WithCaptures<A> &
        WithQueryParams<A> &
        WithHeaders<A> &
        WithBody<A>;
      const result = await handler(ctx);
      res.status(api.status);
      res.setHeader("Content-Type", api.resEncoder.contentType.mimeType);
      const response = api.resEncoder.encoder(result);
      res.send(response);
      next();
    } catch (e) {
      next(e);
    }
  };
  const end = function(_req: express.Request, res: express.Response) {
    res.end();
  };
  switch (api.method) {
    case "GET":
      router.get(api.path, middleware, end);
      return router;
    case "POST":
      router.post(api.path, middleware, end);
      return router;
    case "PUT":
      router.put(api.path, middleware, end);
      return router;
    case "PATCH":
      router.patch(api.path, middleware, end);
      return router;
    case "DELETE":
      router.delete(api.path, middleware, end);
      return router;
    case "HEAD":
      router.head(api.path, middleware, end);
      return router;
    case "TRACE":
      router.trace(api.path, middleware, end);
      return router;
    case "CONNECT":
      router.connect(api.path, middleware, end);
      return router;
    case "OPTIONS":
      router.options(api.path, middleware, end);
      return router;
  }
  exhaustiveCheck(api.method);
}

export function createRouter<A extends ApiEndpoint>(
  api: A,
  handler: Handler<A>
): express.Router {
  return addToRouter(api, handler, express.Router());
}

type Api = Record<string, ApiEndpoint>;
type Handlers<A extends Api> = { [K in keyof A]: Handler<A[K]> };

export function createApi<A extends Api>(
  api: A,
  handlers: Handlers<A>
): express.Router {
  return Object.entries(api).reduce(
    (router, [name, apiEndpoint]) =>
      addToRouter(apiEndpoint, handlers[name], router),
    express.Router()
  );
}
