import { NumberFromString } from "io-ts-types/lib/NumberFromString";
import { IntBrand, brand, Int, Branded } from "io-ts";

export interface PositiveBrand extends IntBrand {
  readonly Positive: unique symbol;
}

export const Positive = brand(
  Int,
  (n): n is Branded<Int, PositiveBrand> => n > 0,
  "Positive"
);

export type Positive = Branded<number, PositiveBrand>;

export const PositiveFromString = NumberFromString.pipe(
  Positive,
  "PositiveFromString"
);
