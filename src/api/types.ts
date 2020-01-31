import * as t from "io-ts";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";
import { DateFromISOString } from "io-ts-types/lib/DateFromISOString";
import {
  Username,
  Email,
  Password,
  EncryptedPassword,
  JWTToken,
  Slug
} from "../types";
import { JWTTokenFromString } from "./jwt";

export const optional = <C extends t.Mixed>(c: C) => t.union([c, t.null]);

export const UserReq = t.strict({
  user: t.strict({
    username: Username,
    email: Email,
    password: Password
  })
});
export type UserReq = t.TypeOf<typeof UserReq>;

export const LoginReq = t.strict({
  user: t.strict({
    email: Email,
    password: Password
  })
});
export type LoginReq = t.TypeOf<typeof LoginReq>;

export const UserUpdateReq = t.strict({
  user: t.partial({
    username: Username,
    email: Email,
    password: Password,
    bio: t.string,
    image: optional(t.string)
  })
});
export type UserUpdateReq = t.TypeOf<typeof UserUpdateReq>;

export const ArticleReq = t.strict({
  article: t.intersection([
    t.strict({
      title: NonEmptyString,
      description: NonEmptyString,
      body: NonEmptyString
    }),
    t.exact(
      t.partial({
        tagList: optional(t.array(NonEmptyString))
      })
    )
  ])
});
export type ArticleReq = t.TypeOf<typeof ArticleReq>;

export const ArticleUpdateReq = t.strict({
  article: t.exact(
    t.partial({
      title: NonEmptyString,
      description: NonEmptyString,
      body: NonEmptyString
    })
  )
});
export type ArticleUpdateReq = t.TypeOf<typeof ArticleUpdateReq>;

export const CommentReq = t.strict({
  comment: t.strict({
    body: NonEmptyString
  })
});
export type CommentReq = t.TypeOf<typeof CommentReq>;

export const UserRes = t.strict({
  user: t.strict({
    username: Username,
    email: Email,
    token: JWTTokenFromString,
    bio: t.string,
    image: optional(t.string)
  })
});
export type UserRes = t.TypeOf<typeof UserRes>;

export const ProfileRes = t.strict({
  profile: t.strict({
    username: Username,
    bio: t.string,
    image: optional(t.string),
    following: t.boolean
  })
});
export type ProfileRes = t.TypeOf<typeof ProfileRes>;

export const ArticleRes = t.strict({
  article: t.strict({
    slug: Slug,
    title: NonEmptyString,
    description: NonEmptyString,
    body: NonEmptyString,
    tagList: t.array(NonEmptyString),
    createdAt: DateFromISOString,
    updatedAt: DateFromISOString,
    favorited: t.boolean,
    favoritesCount: t.Int,
    author: t.strict({
      username: Username,
      bio: t.string,
      image: optional(t.string),
      following: t.boolean
    })
  })
});
export type ArticleRes = t.TypeOf<typeof ArticleRes>;

export const ArticlesRes = t.strict({
  articles: t.array(
    t.strict({
      slug: Slug,
      title: NonEmptyString,
      description: NonEmptyString,
      body: NonEmptyString,
      tagList: t.array(NonEmptyString),
      createdAt: DateFromISOString,
      updatedAt: DateFromISOString,
      favorited: t.boolean,
      favoritesCount: t.Int,
      author: t.strict({
        username: Username,
        bio: t.string,
        image: optional(t.string),
        following: t.boolean
      })
    })
  ),
  articlesCount: t.Int
});
export type ArticlesRes = t.TypeOf<typeof ArticlesRes>;

export const CommentRes = t.strict({
  comment: t.strict({
    id: t.Int,
    createdAt: DateFromISOString,
    updatedAt: DateFromISOString,
    body: NonEmptyString,
    author: t.strict({
      username: Username,
      bio: t.string,
      image: optional(t.string),
      following: t.boolean
    })
  })
});
export type CommentRes = t.TypeOf<typeof CommentRes>;

export const CommentsRes = t.strict({
  comments: t.array(
    t.strict({
      id: t.Int,
      createdAt: DateFromISOString,
      updatedAt: DateFromISOString,
      body: NonEmptyString,
      author: t.strict({
        username: Username,
        bio: t.string,
        image: optional(t.string),
        following: t.boolean
      })
    })
  )
});
export type CommentsRes = t.TypeOf<typeof CommentsRes>;

export const TagListRes = t.strict({
  tags: t.array(NonEmptyString)
});
export type TagListRes = t.TypeOf<typeof TagListRes>;

export const User = t.strict({
  id: t.number,
  username: Username,
  email: Email,
  bio: t.string,
  password: EncryptedPassword,
  image: optional(t.string)
});

export type User = t.TypeOf<typeof User>;

export function newJWTTokenFor(sub: Username): JWTToken {
  const token = {
    iss: "REALWORD-TS",
    sub,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 20
  };
  return token;
}

export const UserToJson = (u: User) => {
  return UserRes.encode({
    user: {
      ...u,
      token: newJWTTokenFor(u.username)
    }
  });
};

export const Profile = t.strict({
  username: Username,
  bio: t.string,
  image: optional(t.string),
  following: t.boolean
});

export type Profile = t.TypeOf<typeof Profile>;

export const ProfileToJson = (profile: Profile) => {
  return ProfileRes.encode({
    profile
  });
};

const JSDate = new t.Type(
  "Date",
  (u): u is Date => u instanceof Date,
  (u, c) => (u instanceof Date ? t.success(u) : t.failure(u, c)),
  t.identity
);

export const Article = t.strict({
  id: t.number,
  slug: Slug,
  title: NonEmptyString,
  description: NonEmptyString,
  body: NonEmptyString,
  tagList: t.array(NonEmptyString),
  createdAt: JSDate,
  updatedAt: JSDate,
  authorId: t.number
});

export type Article = t.TypeOf<typeof Article>;

export const Comment = t.strict({
  id: t.Int,
  body: NonEmptyString,
  createdAt: JSDate,
  updatedAt: JSDate,
  authorId: t.number,
  articleId: t.number
});

export type Comment = t.TypeOf<typeof Comment>;

export const CommentWithAuthor = t.strict({
  id: t.Int,
  body: NonEmptyString,
  createdAt: JSDate,
  updatedAt: JSDate,
  author: t.strict({
    username: Username,
    bio: t.string,
    image: optional(t.string),
    following: t.boolean
  }),
  articleId: t.number
});

export type CommentWithAuthor = t.TypeOf<typeof CommentWithAuthor>;

export const ArticleWithAuthor = t.strict({
  slug: Slug,
  title: NonEmptyString,
  description: NonEmptyString,
  body: NonEmptyString,
  tagList: t.array(NonEmptyString),
  createdAt: JSDate,
  updatedAt: JSDate,
  favorited: t.boolean,
  favoritesCount: t.Int,
  author: t.strict({
    username: Username,
    bio: t.string,
    image: optional(t.string),
    following: t.boolean
  })
});

export type ArticleWithAuthor = t.TypeOf<typeof ArticleWithAuthor>;
