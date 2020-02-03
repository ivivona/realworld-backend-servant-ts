import { Type, TypeOf, identity, success, Branded, Context } from "io-ts/lib";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";
import * as slug from "slug";

export interface SlugBrand {
  readonly Slug: unique symbol;
}

export type SlugC = Branded<NonEmptyString, SlugBrand>;

const SlugCodec = new Type<SlugC, NonEmptyString, NonEmptyString>(
  "SlugCodec",
  (s: unknown): s is SlugC =>
    slug(`${s}`, { lower: true }) === `${s}`.toLocaleLowerCase(),
  (s: NonEmptyString, _: Context) => success(slug(s, { lower: true }) as SlugC),
  identity
);

export const Slug = NonEmptyString.pipe(SlugCodec, "Slug");

export type Slug = TypeOf<typeof Slug>;
