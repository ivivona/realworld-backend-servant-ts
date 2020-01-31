import * as express from "express";
import { json } from "body-parser";
import { PathReporter } from "io-ts/lib/PathReporter";
import { createApi } from "./ts-servant-express";
import { api } from "./src/api";
import { compareWithAsync, encryptAsync, Username } from "./src/types";
import {
  User,
  CommentWithAuthor,
  ArticleWithAuthor,
  Profile
} from "./src/api/types";
import { queries, isDuplicatedKeyError } from "./src/db";
import { SQL, SQLFragment } from "../pg-ts/dist";
import { TokenExpiredError } from "jsonwebtoken";
import { strict, Int } from "io-ts";
import { NonEmptyString } from "io-ts-types/lib/NonEmptyString";

class ApiError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

function userNamed(username: Username): ReturnType<typeof SQLFragment> {
  return SQLFragment`SELECT * FROM users WHERE username = ${username}`;
}
function idFrom(
  table: string | ReturnType<typeof SQLFragment>
): ReturnType<typeof SQLFragment> {
  return SQLFragment`SELECT id FROM (${table}) AS _ID_LOOKUP_`;
}
const nothing = SQLFragment``;

queries("postgresql://localhost/real-ts")
  .then(({ queryAny, queryOne, queryNone }) => {
    const app = express();
    app.use(json());
    app.use(
      "/api",
      createApi(api, {
        createUser: async ({
          body: {
            user: { email, username, password }
          }
        }) => {
          const saved = await queryOne(
            User,
            SQL`INSERT INTO users (username, email, password, bio, image) 
                VALUES (${username}, ${email}, ${await encryptAsync(
              password,
              10
            )}, ${""}, ${null}) 
                RETURNING *`
          );
          return saved;
        },
        login: async ({
          body: {
            user: { password, email }
          }
        }) => {
          const candidate = await queryOne(
            User,
            SQL`SELECT * FROM users WHERE email = ${email}`
          );
          if (!(await compareWithAsync(candidate.password, password))) {
            throw new ApiError("User not found", 401);
          }
          return candidate;
        },
        getCurrentUser: async ({
          headers: {
            Authorization: { sub }
          }
        }) => {
          const candidate = await queryOne(User, SQL`${userNamed(sub)}`);
          return candidate;
        },
        updateCurrentUser: async ({
          headers: {
            Authorization: { sub }
          },
          body: {
            user: { username, bio, image, email, password }
          }
        }) => {
          const saved = await queryOne(
            User,
            SQL`UPDATE users 
                SET 
                  ${[
                    username ? SQLFragment`username = ${username}` : null,
                    email ? SQLFragment`email = ${email}` : null,
                    bio ? SQLFragment`bio = ${bio}` : null,
                    image ? SQLFragment`email = ${image}` : null,
                    password
                      ? SQLFragment`password = ${await encryptAsync(
                          password,
                          10
                        )}`
                      : null
                  ]
                    .filter(_ => _ !== null)
                    .reduce((acc, frag) =>
                      frag ? SQLFragment`${acc}, ${frag}` : acc
                    ) || nothing}
                WHERE username = ${sub}
                RETURNING *`
          );
          return saved;
        },
        getProfile: async _ => {
          const {
            headers: { Authorization },
            captures: { username: lookup }
          } = _;
          const profile = await queryOne(
            Profile,
            SQL`
            SELECT 
              users.*,
              ${
                Authorization?.sub
                  ? SQLFragment`f.follower_id IS NOT NULL`
                  : SQLFragment`FALSE`
              } AS following
            FROM users
            ${
              Authorization?.sub
                ? SQLFragment`
                  LEFT JOIN follows f 
                    ON  f.followed_id = users.id AND 
                        f.follower_id = (${idFrom(
                          userNamed(Authorization.sub)
                        )})`
                : nothing
            }
            WHERE username = ${lookup}`
          );
          return { profile };
        },
        followUser: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { username }
        }) => {
          const profile = await queryOne(
            Profile,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                followed AS (${userNamed(username)}),
                follow AS (
                  INSERT INTO follows (follower_id, followed_id) 
                  VALUES ((SELECT id FROM me), (SELECT id FROM followed)) 
                  ON CONFLICT DO NOTHING
                  RETURNING *
                )
              SELECT followed.*, TRUE AS following
              FROM followed
              CROSS JOIN me`
          );
          return { profile };
        },
        unfollowUser: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { username }
        }) => {
          const profile = await queryOne(
            Profile,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                followed AS (${userNamed(username)}),
                follow AS (
                  DELETE FROM follows 
                  WHERE 
                    follower_id = (SELECT id FROM me) AND 
                    followed_id = (SELECT id FROM followed)
                  RETURNING *
                )
              SELECT followed.*, FALSE AS following
              FROM followed
              CROSS JOIN me`
          );
          return { profile };
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
                favorites as f ON f.user_id = (${idFrom(userNamed(favorited))})`
                : nothing
            }
            LEFT JOIN users ON "authorId" = users.id
            ${
              Authorization?.sub
                ? SQLFragment`
              LEFT JOIN 
                favorites ON favorites.user_id = (${idFrom(
                  userNamed(Authorization.sub)
                )}) AND
                favorites.article_id = articles.id`
                : nothing
            }
            ${
              Authorization?.sub
                ? SQLFragment`
              LEFT JOIN 
                follows ON follows.follower_id = (${idFrom(
                  userNamed(Authorization.sub)
                )}) AND
                follows.followed_id = users.id`
                : nothing
            }
            WHERE
            ${
              author
                ? SQLFragment`"authorId" = (${idFrom(userNamed(author))})`
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
              favorites ON favorites.user_id = (${idFrom(userNamed(sub))}) AND
              favorites.article_id = articles.id
            LEFT JOIN users ON "authorId" = users.id
            LEFT JOIN 
              follows ON follows.follower_id = (${idFrom(userNamed(sub))}) AND
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
        getArticle: async ({
          headers: { Authorization },
          captures: { slug }
        }) => {
          const article = await queryOne(
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
            WHERE slug = lower(${slug})
          `
          );
          return { article };
        },
        createArticle: async ({
          headers: {
            Authorization: { sub }
          },
          body: {
            article: { title, description, body, tagList }
          }
        }) => {
          const article = await queryOne(
            ArticleWithAuthor,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                article AS (INSERT INTO articles (title, description, body, "tagList", "authorId") VALUES (
                  ${title}, 
                  ${description}, 
                  ${body}, 
                  ${tagList ?? []}, 
                  (SELECT id FROM me)
                ) RETURNING *)
                SELECT
                  article.*, 
                  FALSE AS favorited,
                  0 AS "favoritesCount",
                  row_to_json((SELECT u FROM (SELECT me.*, follows.followed_id IS NOT NULL AS following) AS u)) AS author
                FROM me
                CROSS JOIN article
                LEFT JOIN 
                  follows ON follows.follower_id = me.id AND
                  follows.followed_id = me.id
                WHERE
                  me.id IS NOT NULL`
          );
          return { article };
        },
        updateArticle: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { slug },
          body: {
            article: { title, description, body }
          }
        }) => {
          const article = await queryOne(
            ArticleWithAuthor,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                article AS (UPDATE articles SET 
                  ${[
                    title ? SQLFragment`title = ${title}` : null,
                    description
                      ? SQLFragment`description = ${description}`
                      : null,
                    body ? SQLFragment`body = ${body}` : null
                  ]
                    .filter(_ => _ !== null)
                    .reduce((acc, frag) =>
                      frag ? SQLFragment`${acc}, ${frag}` : acc
                    ) || nothing}
                  WHERE slug = lower(${slug}) RETURNING *)
              SELECT
                article.*, 
                (SELECT article_id FROM favorites WHERE favorites.article_id = article.id AND favorites.user_id = me.id) IS NOT NULL AS favorited,
                (SELECT COUNT(*)::integer FROM favorites WHERE favorites.article_id = article.id) AS "favoritesCount",
                row_to_json(
                  (SELECT u FROM (SELECT 
                    me.*, 
                    (SELECT followed_id 
                      FROM follows 
                      WHERE follows.follower_id = me.id AND follows.followed_id = me.id
                    ) IS NOT NULL AS following
                  ) AS u)
                ) AS author
              FROM article
              CROSS JOIN me`
          );
          return { article };
        },
        deleteArticle: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { slug }
        }) => {
          await queryNone(SQL`BEGIN`);
          await queryNone(
            SQL`DELETE FROM favorites WHERE article_id = (SELECT id FROM articles WHERE slug = lower(${slug}) AND "authorId" = (SELECT id FROM users WHERE username = ${sub}))`
          );
          await queryNone(
            SQL`DELETE FROM comments WHERE "articleId" = (SELECT id FROM articles WHERE slug = lower(${slug}) AND "authorId" = (SELECT id FROM users WHERE username = ${sub}))`
          );
          await queryNone(
            SQL`DELETE FROM articles WHERE slug = lower(${slug}) AND "authorId" = (SELECT id FROM users WHERE username = ${sub})`
          );
          await queryNone(SQL`COMMIT`);
        },
        addComment: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { slug },
          body: {
            comment: { body }
          }
        }) => {
          const comment = await queryOne(
            CommentWithAuthor,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                article AS (SELECT * FROM articles WHERE slug = lower(${slug})),
                comment AS (
                  INSERT INTO comments ("authorId", "articleId", body) 
                  VALUES ((SELECT id FROM me), (SELECT id FROM article), ${body}) 
                  RETURNING *
                )
              SELECT 
                comment.*, 
                row_to_json(
                  (SELECT u FROM (SELECT 
                    me.*, 
                    (SELECT followed_id 
                      FROM follows 
                      WHERE follows.follower_id = me.id AND follows.followed_id = article."authorId"
                    ) IS NOT NULL AS following
                  ) AS u)
                ) AS author
              FROM comment
              CROSS JOIN me
              CROSS JOIN article`
          );
          return { comment };
        },
        getComments: async ({
          headers: { Authorization },
          captures: { slug }
        }) => {
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
                follows ON follows.follower_id = (${idFrom(
                  userNamed(Authorization.sub)
                )}) AND
                follows.followed_id = users.id`
                : nothing
            }
            WHERE "articleId" = (SELECT id FROM articles WHERE slug = lower(${slug}))`
          );
          return { comments };
        },
        deleteComment: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { slug, id }
        }) => {
          await queryNone(
            SQL`
            DELETE FROM comments 
            WHERE 
              "articleId" = (SELECT id FROM articles WHERE slug = lower(${slug})) AND 
              "authorId" = (${idFrom(userNamed(sub))}) AND 
              id = ${id}`
          );
        },
        favoriteArticle: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { slug }
        }) => {
          const article = await queryOne(
            ArticleWithAuthor,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                article AS (SELECT * FROM articles WHERE slug = lower(${slug})),
                favorite AS (
                  INSERT INTO favorites (user_id, article_id) 
                  VALUES ((SELECT id FROM me), (SELECT id FROM article)) 
                  ON CONFLICT DO NOTHING
                  RETURNING *
                )
              SELECT
                article.*, 
                TRUE AS favorited,
                (SELECT COUNT(*)::integer FROM favorites WHERE favorites.article_id = article.id) + 1 AS "favoritesCount",
                row_to_json(
                  (SELECT u FROM (SELECT 
                    me.*, 
                    (SELECT followed_id 
                      FROM follows 
                      WHERE follows.follower_id = me.id AND follows.followed_id = me.id
                    ) IS NOT NULL AS following
                  ) AS u)
                ) AS author
              FROM article
              CROSS JOIN me`
          );
          return { article };
        },
        unfavoriteArticle: async ({
          headers: {
            Authorization: { sub }
          },
          captures: { slug }
        }) => {
          const article = await queryOne(
            ArticleWithAuthor,
            SQL`
              WITH 
                me AS (${userNamed(sub)}),
                article AS (SELECT * FROM articles WHERE slug = lower(${slug})),
                favorite AS (
                  DELETE FROM favorites 
                  WHERE user_id = (SELECT id FROM me) AND article_id = (SELECT id FROM article)
                  RETURNING *
                )
              SELECT
                article.*, 
                FALSE AS favorited,
                (SELECT COUNT(*)::integer FROM favorites WHERE favorites.article_id = article.id) - 1 AS "favoritesCount",
                row_to_json(
                  (SELECT u FROM (SELECT 
                    me.*, 
                    (SELECT followed_id 
                      FROM follows 
                      WHERE follows.follower_id = me.id AND follows.followed_id = me.id
                    ) IS NOT NULL AS following
                  ) AS u)
                ) AS author
              FROM article
              CROSS JOIN me`
          );
          return { article };
        },
        getTags: async _ => {
          const tags = (
            await queryAny(
              strict({ tag: NonEmptyString }),
              SQL`SELECT tag FROM tags`
            )
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
