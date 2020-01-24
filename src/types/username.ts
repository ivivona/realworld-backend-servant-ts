import { Newtype, iso } from "newtype-ts";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";
import { Type, intersection } from "io-ts";
import { Max512String } from "./strings";
import { map } from "fp-ts/lib/Either";

export interface Username
  extends Newtype<
    { readonly Username: unique symbol },
    NonEmptyString & Max512String
  > {}

const codec = intersection([NonEmptyString, Max512String]);
const isoUsername = iso<Username>();

export const Username = new Type(
  "Username",
  (u): u is Username => codec.is(u),
  (u, c) => {
    return map(isoUsername.wrap)(codec.validate(u, c));
  },
  u => codec.encode(isoUsername.unwrap(u))
);
