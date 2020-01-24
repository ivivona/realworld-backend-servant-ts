import { Empty } from "../../ts-servant";
import { asJson as asJsonF } from "../../ts-servant/codecs";
import {
  POST,
  GET,
  PUT,
  DELETE,
  asJson,
  fromJson,
  capture
} from "../../ts-servant-io-ts";
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
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJsonF(UserToJson)),

  updateCurrentUser: PUT`/user`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .body(fromJson(UserUpdateReq))
    .response(asJsonF(UserToJson)),

  getProfile: GET`/profiles/${capture("username", Username)}`
    .reqHeader("Authorization", optional(JWTTokenFromHeader))
    .response(asJson(ProfileRes)),

  followUser: POST`/profiles/${capture("username", Username)}/follow`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJson(ProfileRes), 200),

  unfollowUser: DELETE`/profiles/${capture("username", Username)}/follow`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJson(ProfileRes), 200),

  getArticles: GET`/articles`
    .reqHeader("Authorization", optional(JWTTokenFromHeader))
    .query("tag", optional(NonEmptyString))
    .query("author", optional(NonEmptyString))
    .query("favorited", optional(NonEmptyString))
    .query("limit", optional(t.Int))
    .query("offset", optional(t.Int))
    .response(asJson(ArticlesRes)),

  feedArticles: GET`/articles/feed`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .query("limit", optional(t.Int))
    .query("offset", optional(t.Int))
    .response(asJson(ArticlesRes)),

  getArticle: GET`/articles/${capture("slug", NonEmptyString)}`
    .reqHeader("Authorization", optional(JWTTokenFromHeader))
    .response(asJson(ArticleRes)),

  createArticle: POST`/articles`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .body(fromJson(ArticleReq))
    .response(asJson(ArticleRes), 201),

  updateArticle: PUT`/articles/${capture("slug", NonEmptyString)}`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .body(fromJson(ArticleUpdateReq))
    .response(asJson(ArticleRes), 202),

  deleteArticle: DELETE`/articles/${capture("slug", NonEmptyString)}`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJsonF(Empty), 201),

  addComment: POST`/articles/${capture("slug", NonEmptyString)}/comments`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .body(fromJson(CommentReq))
    .response(asJson(CommentRes), 201),

  getComments: GET`/articles/${capture("slug", NonEmptyString)}/comments`
    .reqHeader("Authorization", optional(JWTTokenFromHeader))
    .response(asJson(CommentsRes)),

  deleteComment: DELETE`/articles/${capture(
    "slug",
    NonEmptyString
  )}/comments/${capture("id", PositiveFromString)}`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJsonF(Empty), 201),

  favoriteArticle: POST`/articles/${capture("slug", NonEmptyString)}/favorite`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJson(ArticleRes), 201),

  unfavoriteArticle: DELETE`/articles/${capture(
    "slug",
    NonEmptyString
  )}/favorite`
    .reqHeader("Authorization", JWTTokenFromHeader)
    .response(asJson(ArticleRes), 201),

  getTags: GET`/tags`.response(asJson(TagListRes))
};
