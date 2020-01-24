import { Newtype, iso } from "newtype-ts";
import { intersection, Type } from "io-ts/lib";
import { Min8String, Max512String } from "./strings";
import { map } from "fp-ts/lib/Either";

export interface Password
  extends Newtype<
    { readonly Username: unique symbol },
    Min8String & Max512String
  > {}

const codec = intersection([Min8String, Max512String]);
const isoPassword = iso<Password>();

export const Password = new Type(
  "Password",
  (u): u is Password => codec.is(u),
  (u, c) => {
    return map(isoPassword.wrap)(codec.validate(u, c));
  },
  u => codec.encode(isoPassword.unwrap(u))
);
