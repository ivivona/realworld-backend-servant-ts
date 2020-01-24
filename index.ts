import * as express from "express";
import { json } from "body-parser";
import { PathReporter } from "io-ts/lib/PathReporter";
import { createApi } from "./ts-servant-express";
import { api } from "./src/api";
import {
  compareWithAsync,
  encryptAsync,
  Username,
  JWTToken
} from "./src/types";
import {
  User,
  Article,
  Comment,
  CommentWithAuthor,
  ArticleWithAuthor
} from "./src/api/types";
import { queries, isDuplicatedKeyError } from "./src/db";
import { SQL, SQLFragment } from "../pg-ts/dist";
import { TokenExpiredError } from "jsonwebtoken";
import { strict, literal, union, identity, Int } from "io-ts";
import { fold } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";

class ApiError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

const zero = 0 as Int;
const nothing = SQLFragment``;

queries("postgresql://localhost/real-ts")
  .then(({ queryAny, queryOne, queryOneOrNone, queryNone }) => {
    async function findUserByUsername(username: Username) {
      const candidate = await queryOneOrNone(
        User,
        SQL`SELECT * FROM users WHERE username = ${username}`
      );
      return pipe(
        candidate,
        fold(() => {
          throw new ApiError("User not found", 401);
        }, identity)
      );
    }

    type HasAuth = { headers: { Authorization: JWTToken } };

    async function currentUser(ctx: HasAuth) {
      const {
        headers: {
          Authorization: { sub: username }
        }
      } = ctx;
      return findUserByUsername(username);
    }

    async function isFollowing(follower: User, followed: User) {
      const { count } = await queryOne(
        strict({ count: union([literal(1), literal(0)]) }),
        SQL`SELECT COUNT(*)::integer FROM follows WHERE follower_id = ${follower.id} AND followed_id = ${followed.id}`
      );
      return count === 1;
    }

    async function hasFavorited(user: User, article: Article) {
      const { count } = await queryOne(
        strict({ count: union([literal(1), literal(0)]) }),
        SQL`SELECT COUNT(*)::integer FROM favorites WHERE user_id = ${user.id} AND article_id = ${article.id}`
      );
      return count === 1;
    }

    const app = express();
    app.use(json());
    app.use(
      "/api",
      createApi(api, {
        createUser: async _ => {
          const {
            user: { password, ...noPassword }
          } = _.body;
          const hashed = await encryptAsync(password, 10);
          const user = {
            ...noPassword,
            password: hashed,
            bio: "",
            image: null
          };
          const saved = await queryOne(
            User,
            SQL`INSERT INTO users (username, email, password, bio, image) VALUES (${user.username}, ${user.email}, ${user.password}, ${user.bio}, ${user.image}) RETURNING *`
          );
          return saved;
        },
        login: async _ => {
          const {
            user: { password, email }
          } = _.body;
          const candidate = await queryOne(
            User,
            SQL`SELECT * FROM users WHERE email = ${email}`
          );
          if (
            !candidate ||
            !(await compareWithAsync(candidate.password, password))
          ) {
            throw new ApiError("User nor found", 401);
          }
          return candidate;
        },
        getCurrentUser: currentUser,
        updateCurrentUser: async _ => {
          const {
            body: { user: updates }
          } = _;
          const candidate = await currentUser(_);
          const user = { ...candidate };
          if (updates.username) {
            user.username = updates.username;
          }
          if (updates.bio !== undefined && updates.bio !== null) {
            user.bio = updates.bio;
          }
          if (updates.image !== undefined) {
            user.image = updates.image;
          }
          if (updates.email) {
            user.email = updates.email;
          }
          if (updates.password) {
            user.password = await encryptAsync(updates.password, 10);
          }
          const saved = await queryOne(
            User,
            SQL`UPDATE users SET username = ${user.username}, email = ${user.email}, bio = ${user.bio}, image = ${user.image} WHERE id = ${user.id} RETURNING *`
          );
          return saved;
        },
        getProfile: async _ => {
          const {
            headers: { Authorization },
            captures: { username: lookup }
          } = _;
          let following = false;

          const candidate = await findUserByUsername(lookup);
          const { username, bio, email, image } = candidate;

          if (Authorization?.sub) {
            const me = await findUserByUsername(Authorization.sub);
            following = await isFollowing(me, candidate);
          }

          return {
            profile: { username, bio, email, image, following }
          };
        },
        followUser: async _ => {
          const {
            captures: { username }
          } = _;
          const me = await currentUser(_);
          const followed = await findUserByUsername(username);
          await queryNone(
            SQL`INSERT INTO follows (follower_id, followed_id) VALUES (${me.id}, ${followed.id}) ON CONFLICT DO NOTHING`
          );
          return {
            profile: { ...followed, following: true }
          };
        },
        unfollowUser: async _ => {
          const {
            captures: { username }
          } = _;
          const me = await currentUser(_);
          const followed = await findUserByUsername(username);
          await queryNone(
            SQL`DELETE FROM follows WHERE follower_id = ${me.id} AND followed_id = ${followed.id}`
          );
          return {
            profile: { ...followed, following: false }
          };
        },
        getArticles: async _ => {
          const {
            headers: { Authorization },
            query: { tag, author, favorited, limit, offset }
          } = _;
          const articles = await queryAny(
            ArticleWithAuthor,
            SQL`
            SELECT
              articles.*, 
              ${
                Authorization?.sub
                  ? SQLFragment`favorites.article_id IS NOT NULL`
                  : SQLFragment`FALSE`
              } AS favorited,
              (SELECT COUNT(*)::integer FROM favorites WHERE favorites.article_id = articles.id) AS "favoritesCount",
              row_to_json((SELECT u FROM (SELECT users.*, ${
                Authorization?.sub
                  ? SQLFragment`follows.followed_id IS NOT NULL`
                  : SQLFragment`FALSE`
              } AS following) AS u)) AS author
            FROM articles 
            ${
              favorited
                ? SQLFragment`
              LEFT JOIN 
                favorites as f ON f.user_id = (SELECT id FROM users WHERE username = ${favorited})`
                : nothing
            }
            LEFT JOIN users ON "authorId" = users.id
            ${
              Authorization?.sub
                ? SQLFragment`
              LEFT JOIN 
                favorites ON favorites.user_id = (SELECT id FROM users WHERE username = ${Authorization.sub}) AND
                favorites.article_id = articles.id`
                : nothing
            }
            ${
              Authorization?.sub
                ? SQLFragment`
              LEFT JOIN 
                follows ON follows.follower_id = (SELECT id FROM users WHERE username = ${Authorization.sub}) AND
                follows.followed_id = users.id`
                : nothing
            }
            WHERE
            ${
              author
                ? SQLFragment`"authorId" = (SELECT id FROM users WHERE username = ${author})`
                : SQLFragment`1 = 1`
            } AND
            ${
              tag ? SQLFragment`"tagList" @> ARRAY[${tag}]` : SQLFragment`1 = 1`
            }
            ORDER BY articles."createdAt" DESC
            LIMIT ${limit ?? 20} OFFSET ${offset ?? 0}
          `
          );
          return {
            articles,
            articlesCount: (
              await queryOne(
                strict({ count: Int }),
                SQL`SELECT COUNT(*)::integer FROM articles`
              )
            ).count
          };
        },
        feedArticles: async _ => {
          const {
            headers: {
              Authorization: { sub }
            },
            query: { limit, offset }
          } = _;
          const articles = await queryAny(
            ArticleWithAuthor,
            SQL`
            SELECT
              articles.*, 
              favorites.article_id IS NOT NULL AS favorited,
              (SELECT COUNT(*)::integer FROM favorites WHERE favorites.article_id = articles.id) AS "favoritesCount",
              row_to_json((SELECT u FROM (SELECT users.*, follows.followed_id IS NOT NULL AS following) AS u)) AS author
            FROM articles 
            INNER JOIN 
              favorites ON favorites.user_id = (SELECT id FROM users WHERE username = ${sub}) AND
              favorites.article_id = articles.id
            LEFT JOIN users ON "authorId" = users.id
            LEFT JOIN 
              follows ON follows.follower_id = (SELECT id FROM users WHERE username = ${sub}) AND
              follows.followed_id = users.id
            ORDER BY articles."createdAt" DESC
            LIMIT ${limit ?? 20} OFFSET ${offset ?? 0}
          `
          );
          return {
            articles,
            articlesCount: (
              await queryOne(
                strict({ count: Int }),
                SQL`
                SELECT COUNT(*)::integer 
                FROM articles 
                INNER JOIN favorites ON 
                  favorites.user_id = (SELECT id FROM users WHERE username = ${sub}) AND
                  favorites.article_id = articles.id`
              )
            ).count
          };
        },
        getArticle: async _ => {
          const {
            headers: { Authorization },
            captures: { slug }
          } = _;
          const article = await queryOne(
            Article,
            SQL`SELECT * FROM articles WHERE slug = ${slug}`
          );
          const author = await queryOne(
            User,
            SQL`SELECT * FROM users WHERE id = ${article.authorId}`
          );
          const favoritesCount = (
            await queryOne(
              strict({ count: Int }),
              SQL`SELECT COUNT(*)::integer FROM favorites WHERE article_id = ${article.id}`
            )
          ).count;
          let favorited = false;
          let following = false;
          if (Authorization?.sub) {
            const me = await findUserByUsername(Authorization.sub);
            favorited = await hasFavorited(me, article);
            following = await isFollowing(me, author);
          }
          return {
            article: {
              ...article,
              author: { ...author, following },
              favorited,
              favoritesCount
            }
          };
        },
        createArticle: async _ => {
          const {
            body: { article }
          } = _;
          const me = await currentUser(_);
          const saved = await queryOne(
            Article,
            SQL`INSERT INTO articles (title, description, body, "tagList", "authorId") VALUES (${
              article.title
            }, ${article.description}, ${article.body}, ${article.tagList ??
              []}, ${me.id}) RETURNING *`
          );
          const following = await isFollowing(me, me);
          return {
            article: {
              ...saved,
              author: { ...me, following },
              favorited: false,
              favoritesCount: zero
            }
          };
        },
        updateArticle: async _ => {
          const {
            captures: { slug },
            body: { article }
          } = _;
          const me = await currentUser(_);
          const old = await queryOne(
            Article,
            SQL`SELECT * FROM articles WHERE slug = lower(${slug})`
          );
          const saved = await queryOne(
            Article,
            SQL`UPDATE articles SET title = ${article.title ||
              old.title}, description = ${article.description ||
              old.description}, body = ${article.body || old.body} WHERE id = ${
              old.id
            } RETURNING *`
          );
          const following = await isFollowing(me, me);
          const favoritesCount = (
            await queryOne(
              strict({ count: Int }),
              SQL`SELECT COUNT(*)::integer FROM favorites WHERE article_id = ${saved.id}`
            )
          ).count;
          const favorited = await hasFavorited(me, saved);
          return {
            article: {
              ...saved,
              author: { ...me, following },
              favorited,
              favoritesCount
            }
          };
        },
        deleteArticle: async _ => {
          const {
            captures: { slug }
          } = _;
          const me = await currentUser(_);
          await queryNone(SQL`BEGIN`);
          await queryNone(
            SQL`DELETE FROM favorites WHERE article_id = (SELECT id FROM articles WHERE slug = lower(${slug}) AND "authorId" = ${me.id})`
          );
          await queryNone(
            SQL`DELETE FROM comments WHERE "articleId" = (SELECT id FROM articles WHERE slug = lower(${slug}) AND "authorId" = ${me.id})`
          );
          await queryNone(
            SQL`DELETE FROM articles WHERE slug = lower(${slug}) AND "authorId" = ${me.id}`
          );
          await queryNone(SQL`COMMIT`);
        },
        addComment: async _ => {
          const {
            captures: { slug },
            body: { comment }
          } = _;
          const me = await currentUser(_);
          const saved = await queryOne(
            Comment,
            SQL`INSERT INTO comments ("authorId", "articleId", body) VALUES (${me.id}, (SELECT id FROM articles WHERE slug = lower(${slug}) LIMIT 1), ${comment.body}) RETURNING *`
          );
          const following = await isFollowing(me, me);
          return {
            comment: { ...saved, author: { ...me, following } }
          };
        },
        getComments: async _ => {
          const {
            headers: { Authorization },
            captures: { slug }
          } = _;
          const comments = await queryAny(
            CommentWithAuthor,
            SQL`
            SELECT 
              comments.*, 
              row_to_json((SELECT u FROM (SELECT users.*, ${
                Authorization?.sub
                  ? SQLFragment`follows.followed_id IS NOT NULL`
                  : SQLFragment`FALSE`
              } AS following) AS u)) AS author
            FROM comments 
            LEFT JOIN users ON "authorId" = users.id
            ${
              Authorization?.sub
                ? SQLFragment`
              LEFT JOIN 
                follows ON follows.follower_id = (SELECT id FROM users WHERE username = ${Authorization.sub}) AND
                follows.followed_id = users.id`
                : nothing
            }
            WHERE "articleId" = (SELECT id FROM articles WHERE slug = lower(${slug}))`
          );
          return { comments };
        },
        deleteComment: async _ => {
          const {
            captures: { slug, id }
          } = _;
          const me = await currentUser(_);
          await queryNone(
            SQL`DELETE FROM comments WHERE "articleId" = (SELECT id FROM articles WHERE slug = lower(${slug})) AND "authorId" = ${me.id} AND id = ${id}`
          );
        },
        favoriteArticle: async _ => {
          const {
            captures: { slug }
          } = _;
          const me = await currentUser(_);
          await queryNone(
            SQL`INSERT INTO favorites (user_id, article_id) VALUES (${me.id}, (SELECT id FROM articles WHERE slug = lower(${slug}))) ON CONFLICT DO NOTHING`
          );
          const article = await queryOne(
            Article,
            SQL`SELECT * FROM articles WHERE slug = lower(${slug})`
          );
          const author = await queryOne(
            User,
            SQL`SELECT * FROM users WHERE id = ${article.authorId}`
          );
          const favoritesCount = (
            await queryOne(
              strict({ count: Int }),
              SQL`SELECT COUNT(*)::integer FROM favorites WHERE article_id = ${article.id}`
            )
          ).count;
          const favorited = await hasFavorited(me, article);
          const following = await isFollowing(me, author);
          return {
            article: {
              ...article,
              author: { ...author, following },
              favorited,
              favoritesCount
            }
          };
        },
        unfavoriteArticle: async _ => {
          const {
            captures: { slug }
          } = _;
          const me = await currentUser(_);
          const article = await queryOne(
            Article,
            SQL`SELECT * FROM articles WHERE slug = lower(${slug})`
          );
          const author = await queryOne(
            User,
            SQL`SELECT * FROM users WHERE id = ${article.authorId}`
          );
          const following = await isFollowing(me, author);
          await queryNone(
            SQL`DELETE FROM favorites WHERE user_id = ${me.id} AND article_id = (SELECT id FROM articles WHERE slug = lower(${slug}))`
          );
          const favoritesCount = (
            await queryOne(
              strict({ count: Int }),
              SQL`SELECT COUNT(*)::integer FROM favorites WHERE article_id = ${article.id}`
            )
          ).count;
          const favorited = await hasFavorited(me, article);
          return {
            article: {
              ...article,
              author: { ...author, following },
              favorited,
              favoritesCount
            }
          };
        },
        getTags: async _ => {
          const tags = (
            await queryAny(strict({ tag: NonEmptyString }), SQL``)
          ).map(_ => _.tag);
          return { tags };
        }
      })
    );

    app.use(function(_req, _res, next) {
      next({
        message: "Not found",
        status: 404
      });
    });
    app.use(function(
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) {
      console.error(err);
      if (!err._tag) {
        if (isDuplicatedKeyError(err) || err instanceof TokenExpiredError) {
          res.status(422).send({
            errors: [err.message]
          });
        } else if (err.status) {
          res.status(err.status).send({
            errors: [err.message]
          });
        } else {
          res.status(500).send({
            errors: ["Unknown error."]
          });
        }
      } else {
        // validation error
        res.status(422).send({
          errors: PathReporter.report(err)
        });
      }
      next();
    });

    app.listen(3000, () => {
      console.log("Server is ready");
    });
  })
  .catch(_ => console.error(_));
