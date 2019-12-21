import * as express from "express";
import { json } from "body-parser";
import { MimeEncoder, Json, MimeDecoder, POST, GET } from "./ts-servant";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { createApi } from "./ts-servant-express";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";
import { optionFromNullable } from "io-ts-types/lib/optionFromNullable";
import { none } from "fp-ts/lib/Option";
import { right } from "fp-ts/lib/Either";

const UserReq = t.strict({
  user: t.strict({
    username: NonEmptyString,
    email: NonEmptyString,
    password: NonEmptyString
  })
});
type UserReq = t.TypeOf<typeof UserReq>;

const UserRes = t.strict({
  user: t.strict({
    username: NonEmptyString,
    email: NonEmptyString,
    token: t.string,
    bio: t.string,
    image: optionFromNullable(t.string)
  })
});
type UserRes = t.TypeOf<typeof UserRes>;

const JWTTokenParser = (str: string) => right({ token: str });

const api = {
  createUser: POST`/users`
    .body(new MimeDecoder(Json, UserReq.decode))
    .response(new MimeEncoder(Json, UserRes.encode), 201),

  getCurrentUser: GET`/user`
    .reqHeader("Authorization", JWTTokenParser)
    .response(new MimeEncoder(Json, UserRes.encode))
};

const app = express();
app.use(json());
app.use(
  "/api",
  createApi(api, {
    createUser: _ => {
      const {
        user: { password, ...nowPassword }
      } = _.body;
      return {
        user: { ...nowPassword, token: "<token>", bio: "<bio>", image: none }
      };
    },
    getCurrentUser: _ => {
      if (!_.headers.Authorization?.token) {
        throw new Error("Unauthenticated");
      }
      return (UserRes.decode({
        user: {
          username: "<username>",
          email: "<email>",
          token: "<token>",
          bio: "<bio>",
          image: null
        }
      }) as any).right as t.TypeOf<typeof UserRes>;
    }
  })
);

app.use(function(
  err: any,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (err instanceof Error) {
    next(err);
  } else {
    res.status(422).send({
      errors: PathReporter.report(err)
    });
    next();
  }
});

app.listen(3000, () => {
  console.log("Server is ready");
});
