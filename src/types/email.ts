import { Newtype } from "newtype-ts/lib";
import { fromNewtype } from "io-ts-types/lib/fromNewtype";
import { Type, string, failure, success } from "io-ts";
import isEmail from "validator/lib/isEmail";
import { either } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";

export interface Email
  extends Newtype<{ readonly Email: unique symbol }, string> {}

const EmailFromString = new Type(
  "EmailFromString",
  string.is,
  (u, c) =>
    either.chain(string.validate(u, c), s => {
      return isEmail(s) ? success(s) : failure(u, c);
    }),
  identity
);

export const Email = fromNewtype<Email>(EmailFromString);

export const EmailToString = new Type(
  "EmailToString",
  Email.is,
  Email.validate,
  Email.encode
);
