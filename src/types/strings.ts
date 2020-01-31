import { Branded, brand, string, TypeOf } from "io-ts/lib";
import { withMessage } from "io-ts-types/lib/withMessage";

export interface MaxStringBrand<M extends number> {
  readonly MaxString: unique symbol;
  readonly Max: M;
}
export const MaxString = <M extends number>(max: M) =>
  withMessage(
    brand(
      string,
      (s): s is Branded<string, MaxStringBrand<M>> => s.length <= max,
      "MaxString"
    ),
    u => `Maximum length is ${max} for value "${u}"`
  );

export interface MinStringBrand<M extends number> {
  readonly MinString: unique symbol;
  readonly Min: M;
}
export const MinString = <M extends number>(min: M) =>
  withMessage(
    brand(
      string,
      (s): s is Branded<string, MinStringBrand<M>> => s.length >= min,
      "MinString"
    ),
    u => `Minimum length is ${min} for value "${u}"`
  );

export const Max512String = MaxString(512);
export type Max512String = TypeOf<typeof Max512String>;

export const Min8String = MinString(8);
export type Min8String = TypeOf<typeof Min8String>;
