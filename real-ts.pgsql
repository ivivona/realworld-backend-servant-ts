--
-- PostgreSQL database dump
--

-- Dumped from database version 11.6
-- Dumped by pg_dump version 12.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: set_slug_from_title(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.set_slug_from_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.slug := slugify(NEW.title) || '-' || NEW.id;
  RETURN NEW;
END
$$;




--
-- Name: slugify(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.slugify(value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
  -- removes accents (diacritic signs) from a given string --
  WITH "unaccented" AS (
    SELECT unaccent("value") AS "value"
  ),
  -- lowercases the string
  "lowercase" AS (
    SELECT lower("value") AS "value"
    FROM "unaccented"
  ),
  -- remove single and double quotes
  "removed_quotes" AS (
    SELECT regexp_replace("value", '[''"]+', '', 'gi') AS "value"
    FROM "lowercase"
  ),
  -- replaces anything that's not a letter, number, hyphen('-'), or underscore('_') with a hyphen('-')
  "hyphenated" AS (
    SELECT regexp_replace("value", '[^a-z0-9\\-_]+', '-', 'gi') AS "value"
    FROM "removed_quotes"
  ),
  -- trims hyphens('-') if they exist on the head or tail of the string
  "trimmed" AS (
    SELECT regexp_replace(regexp_replace("value", '\-+$', ''), '^\-', '') AS "value"
    FROM "hyphenated"
  )
  SELECT "value" FROM "trimmed";
$_$;




--
-- Name: updated_at(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;   
END;
$$;




SET default_tablespace = '';

--
-- Name: articles; Type: TABLE; Schema: public
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    body text NOT NULL,
    "authorId" integer NOT NULL,
    "tagList" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);




--
-- Name: articles_author_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.articles_author_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: articles_author_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.articles_author_id_seq OWNED BY public.articles."authorId";


--
-- Name: articles_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- Name: comments; Type: TABLE; Schema: public
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    "articleId" integer NOT NULL,
    "authorId" integer NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);




--
-- Name: comments_articleId_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public."comments_articleId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: comments_articleId_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public."comments_articleId_seq" OWNED BY public.comments."articleId";


--
-- Name: comments_authorId_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public."comments_authorId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: comments_authorId_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public."comments_authorId_seq" OWNED BY public.comments."authorId";


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: favorites; Type: TABLE; Schema: public
--

CREATE TABLE public.favorites (
    user_id integer NOT NULL,
    article_id integer NOT NULL
);




--
-- Name: favorites_article_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.favorites_article_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: favorites_article_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.favorites_article_id_seq OWNED BY public.favorites.article_id;


--
-- Name: favorites_user_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.favorites_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: favorites_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.favorites_user_id_seq OWNED BY public.favorites.user_id;


--
-- Name: follows; Type: TABLE; Schema: public
--

CREATE TABLE public.follows (
    follower_id integer NOT NULL,
    followed_id integer NOT NULL
);




--
-- Name: follows_followed_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.follows_followed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: follows_followed_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.follows_followed_id_seq OWNED BY public.follows.followed_id;


--
-- Name: follows_follower_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.follows_follower_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: follows_follower_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.follows_follower_id_seq OWNED BY public.follows.follower_id;


--
-- Name: tags; Type: VIEW; Schema: public
--

CREATE VIEW public.tags AS
 SELECT DISTINCT unnest(articles."tagList") AS tag
   FROM public.articles;




--
-- Name: users; Type: TABLE; Schema: public
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    bio text,
    image text
);




--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: articles id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- Name: articles authorId; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.articles ALTER COLUMN "authorId" SET DEFAULT nextval('public.articles_author_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: comments articleId; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.comments ALTER COLUMN "articleId" SET DEFAULT nextval('public."comments_articleId_seq"'::regclass);


--
-- Name: comments authorId; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.comments ALTER COLUMN "authorId" SET DEFAULT nextval('public."comments_authorId_seq"'::regclass);


--
-- Name: favorites user_id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.favorites ALTER COLUMN user_id SET DEFAULT nextval('public.favorites_user_id_seq'::regclass);


--
-- Name: favorites article_id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.favorites ALTER COLUMN article_id SET DEFAULT nextval('public.favorites_article_id_seq'::regclass);


--
-- Name: follows follower_id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.follows ALTER COLUMN follower_id SET DEFAULT nextval('public.follows_follower_id_seq'::regclass);


--
-- Name: follows followed_id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.follows ALTER COLUMN followed_id SET DEFAULT nextval('public.follows_followed_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: articles; Type: TABLE DATA; Schema: public
--

COPY public.articles (id, slug, title, description, body, "authorId", "tagList", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public
--

COPY public.comments (id, "articleId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public
--

COPY public.favorites (user_id, article_id) FROM stdin;
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public
--

COPY public.follows (follower_id, followed_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public
--

COPY public.users (id, username, email, password, bio, image) FROM stdin;
\.


--
-- Name: articles_author_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.articles_author_id_seq', 1, false);


--
-- Name: articles_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.articles_id_seq', 73, true);


--
-- Name: comments_articleId_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public."comments_articleId_seq"', 1, false);


--
-- Name: comments_authorId_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public."comments_authorId_seq"', 1, false);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.comments_id_seq', 34, true);


--
-- Name: favorites_article_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.favorites_article_id_seq', 1, false);


--
-- Name: favorites_user_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.favorites_user_id_seq', 1, false);


--
-- Name: follows_followed_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.follows_followed_id_seq', 1, false);


--
-- Name: follows_follower_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.follows_follower_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public
--

SELECT pg_catalog.setval('public.users_id_seq', 178, true);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: articles articles_slug_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_slug_key UNIQUE (slug);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: comments_articleId_idx; Type: INDEX; Schema: public
--

CREATE INDEX "comments_articleId_idx" ON public.comments USING btree ("articleId");


--
-- Name: created_at_idx; Type: INDEX; Schema: public
--

CREATE INDEX created_at_idx ON public.articles USING btree ("createdAt");


--
-- Name: favorites_user_id_article_id_idx; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX favorites_user_id_article_id_idx ON public.favorites USING btree (user_id, article_id);


--
-- Name: favorites_user_id_idx; Type: INDEX; Schema: public
--

CREATE INDEX favorites_user_id_idx ON public.favorites USING btree (user_id);


--
-- Name: follows_follower_id_followed_id_idx; Type: INDEX; Schema: public
--

CREATE INDEX follows_follower_id_followed_id_idx ON public.follows USING btree (follower_id, followed_id);


--
-- Name: articles article_insert_slug; Type: TRIGGER; Schema: public
--

CREATE TRIGGER article_insert_slug BEFORE INSERT ON public.articles FOR EACH ROW WHEN (((new.title IS NOT NULL) AND (new.slug IS NULL))) EXECUTE PROCEDURE public.set_slug_from_title();


--
-- Name: comments update_comment_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER update_comment_updated_at AFTER UPDATE ON public.comments FOR EACH ROW EXECUTE PROCEDURE public.updated_at();


--
-- Name: articles update_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER update_updated_at AFTER UPDATE ON public.articles FOR EACH ROW EXECUTE PROCEDURE public.updated_at();


--
-- Name: articles articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_author_id_fkey FOREIGN KEY ("authorId") REFERENCES public.users(id);


--
-- Name: comments comments_articleId_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public.articles(id);


--
-- Name: comments comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id);


--
-- Name: favorites favorites_article_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id);


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: follows follows_followed_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_followed_id_fkey FOREIGN KEY (followed_id) REFERENCES public.users(id);


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

