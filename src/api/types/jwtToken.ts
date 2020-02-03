import {
  Validation,
  strict,
  TypeOf,
  Type,
  string,
  number,
  failure
} from "io-ts/lib";
import { sign, verify, Secret, VerifyOptions, SignOptions } from "jsonwebtoken";
import { Username } from "./username";
import { chain } from "fp-ts/lib/Either";

export const JWTToken = strict({
  iss: string,
  sub: Username,
  iat: number,
  exp: number
});
export type JWTToken = TypeOf<typeof JWTToken>;

export const JWTTokenFromString = (
  secretOrPublicKey: Secret,
  options?: SignOptions & VerifyOptions
) => {
  function generateJWTToken(token: JWTToken): string {
    return sign(token, secretOrPublicKey, options);
  }
  function parseJWTToken(token: string) {
    return JWTToken.decode(verify(token, secretOrPublicKey, options));
  }
  return new Type<JWTToken, string, unknown>(
    "JWTTokenFromString",
    JWTToken.is,
    (u, c) => chain(parseJWTToken)(string.validate(u, c)),
    generateJWTToken
  );
};

export const JWTTokenFromHeader = (
  secretOrPublicKey: Secret,
  options?: SignOptions & VerifyOptions
) => {
  const codec = JWTTokenFromString(secretOrPublicKey, options);

  return new Type<JWTToken, string, unknown>(
    "JWTTokenFromHeader",
    codec.is,
    (u, c) => {
      function fromHeader(header: string): Validation<JWTToken> {
        if (header.startsWith("Token ")) {
          return codec.validate(header.substr("Token ".length), c);
        }
        return failure(header, c);
      }

      return chain(fromHeader)(string.validate(u, c));
    },
    codec.encode
  );
};
