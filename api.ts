import * as rt from "runtypes";
import { defineAPI, POST } from "rest-ts-core";

export const UserW = <C extends rt.Runtype>(codec: C) =>
  rt.Record({
    user: codec
  });
export type UserW<T> = { user: T };

export const NewUser = rt.Record({
  username: rt.String,
  email: rt.String,
  password: rt.String
});
export type NewUser = rt.Static<typeof NewUser>;

export const GenericError = rt.Record({
  errors: rt.Record({
    body: rt.Array(rt.String)
  })
});
export type GenericError = rt.Static<typeof GenericError>;

export const UserResponse = rt.Record({
  username: rt.String,
  token: rt.String,
  email: rt.String,
  bio: rt.String,
  image: rt.String.Or(rt.Null)
});
export type UserResponse = rt.Static<typeof UserResponse>;
const endpoint = POST`/api/users`
  .body(UserW(NewUser))
  .body("aaa")
  .response(UserW(UserResponse));
endpoint;
export const api = defineAPI({
  createUser: endpoint
});
