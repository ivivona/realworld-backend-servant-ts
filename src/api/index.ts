import { POST, GET, PUT, DELETE, Empty } from "../../ts-servant";
import { asJson as asJsonF } from "../../ts-servant/codecs";
import { asJson, fromJson, capture } from "../../ts-servant-io-ts";
import * as t from "io-ts";
import {
  UserReq,
  LoginReq,
  UserUpdateReq,
  ProfileRes,
  ArticlesRes,
  TagListRes,
  ArticleReq,
  ArticleUpdateReq,
  ArticleRes,
  CommentReq,
  CommentsRes,
  CommentRes,
  UserToJson
} from "./types";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";
import { JWTTokenFromHeader } from "./jwt";
import { Username, PositiveFromString } from "../types";

function optional<A extends t.Mixed>(a: A): t.UnionC<[A, t.UndefinedC]> {
  return t.union([a, t.undefined]);
}

export const api = {
  createUser: POST`/users`
    .body(fromJson(UserReq))
    .response(asJsonF(UserToJson), 201),

  login: POST`/users/login`
    .body(fromJson(LoginReq))
    .response(asJsonF(UserToJson)),

  getCurrentUser: GET`/user`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJsonF(UserToJson)),

  updateCurrentUser: PUT`/user`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .body(fromJson(UserUpdateReq))
    .response(asJsonF(UserToJson)),

  getProfile: GET`/profiles/${capture("username", Username)}`
    .reqHeader("Authorization", optional(JWTTokenFromHeader).decode)
    .response(asJson(ProfileRes)),

  followUser: POST`/profiles/${capture("username", Username)}/follow`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJson(ProfileRes), 200),

  unfollowUser: DELETE`/profiles/${capture("username", Username)}/follow`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJson(ProfileRes), 200),

  getArticles: GET`/articles`
    .reqHeader("Authorization", optional(JWTTokenFromHeader).decode)
    .query("tag", optional(NonEmptyString).decode)
    .query("author", optional(NonEmptyString).decode)
    .query("favorited", optional(NonEmptyString).decode)
    .query("limit", optional(t.Int).decode)
    .query("offset", optional(t.Int).decode)
    .response(asJson(ArticlesRes)),

  feedArticles: GET`/articles/feed`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .query("limit", optional(t.Int).decode)
    .query("offset", optional(t.Int).decode)
    .response(asJson(ArticlesRes)),

  getArticle: GET`/articles/${capture("slug", NonEmptyString)}`
    .reqHeader("Authorization", optional(JWTTokenFromHeader).decode)
    .response(asJson(ArticleRes)),

  createArticle: POST`/articles`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .body(fromJson(ArticleReq))
    .response(asJson(ArticleRes), 201),

  updateArticle: PUT`/articles/${capture("slug", NonEmptyString)}`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .body(fromJson(ArticleUpdateReq))
    .response(asJson(ArticleRes), 202),

  deleteArticle: DELETE`/articles/${capture("slug", NonEmptyString)}`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJsonF(Empty), 201),

  addComment: POST`/articles/${capture("slug", NonEmptyString)}/comments`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .body(fromJson(CommentReq))
    .response(asJson(CommentRes), 201),

  getComments: GET`/articles/${capture("slug", NonEmptyString)}/comments`
    .reqHeader("Authorization", optional(JWTTokenFromHeader).decode)
    .response(asJson(CommentsRes)),

  deleteComment: DELETE`/articles/${capture(
    "slug",
    NonEmptyString
  )}/comments/${capture("id", PositiveFromString)}`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJsonF(Empty), 201),

  favoriteArticle: POST`/articles/${capture("slug", NonEmptyString)}/favorite`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJson(ArticleRes), 201),

  unfavoriteArticle: DELETE`/articles/${capture(
    "slug",
    NonEmptyString
  )}/favorite`
    .reqHeader("Authorization", JWTTokenFromHeader.decode)
    .response(asJson(ArticleRes), 201),

  getTags: GET`/tags`.response(asJson(TagListRes))
};
