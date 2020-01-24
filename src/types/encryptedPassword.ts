import { Newtype, iso } from "newtype-ts/lib";
import { Password } from "./password";
import { hash, compare } from "bcrypt";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { fromNewtype } from "io-ts-types/lib/fromNewtype";
import { Type, string } from "io-ts";
import { either } from "fp-ts/lib/Either";

export interface EncryptedPassword
  extends Newtype<{ readonly EncryptedPassword: unique symbol }, string> {}
const isoEncryptedPassword = iso<EncryptedPassword>();

export async function encryptAsync(
  password: Password,
  saltOrRounds: string | number
): Promise<EncryptedPassword> {
  return isoEncryptedPassword.wrap(await hash(password, saltOrRounds));
}
export async function compareWithAsync(
  encrypted: EncryptedPassword,
  password: Password
): Promise<boolean> {
  return compare(password, isoEncryptedPassword.unwrap(encrypted));
}

export function encrypt(
  password: Password,
  saltOrRounds: string | number
): TaskEither<Error, EncryptedPassword> {
  return tryCatch(
    () => encryptAsync(password, saltOrRounds),
    reason => new Error(String(reason))
  );
}

export function compareWith(
  encrypted: EncryptedPassword,
  password: Password
): TaskEither<Error, boolean> {
  return tryCatch(
    () => compareWithAsync(encrypted, password),
    reason => new Error(String(reason))
  );
}

const EncryptedPasswordFromString = new Type(
  "EncryptedPasswordFromString",
  string.is,
  string.validate,
  string.encode
);

export const EncryptedPassword = fromNewtype<EncryptedPassword>(
  EncryptedPasswordFromString
);

export const EncryptedPasswordToString = new Type(
  "EncryptedPasswordToString",
  EncryptedPassword.is,
  EncryptedPassword.validate,
  EncryptedPassword.encode
);
