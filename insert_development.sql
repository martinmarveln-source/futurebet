-- Schema
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.10 (4f20678)
-- Dumped by pg_dump version 17.10 (4f20678)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_insight_usage; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_insight_usage (
    id integer NOT NULL,
    user_id integer NOT NULL,
    match_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    credits_used integer DEFAULT 2,
    insight_type character varying(20) DEFAULT 'positive'::character varying,
    cache_hit boolean DEFAULT false
);



--
-- Name: ai_insight_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ai_insight_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: ai_insight_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ai_insight_usage_id_seq OWNED BY public.ai_insight_usage.id;


--
-- Name: ai_insights_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_insights_cache (
    id integer NOT NULL,
    cache_key character varying(500) NOT NULL,
    match_name text NOT NULL,
    prediction text NOT NULL,
    insight_type character varying(20) NOT NULL,
    insight_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '30 days'::interval),
    CONSTRAINT ai_insights_cache_insight_type_check CHECK (((insight_type)::text = ANY ((ARRAY['positive'::character varying, 'reverse'::character varying])::text[])))
);



--
-- Name: ai_insights_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ai_insights_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: ai_insights_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ai_insights_cache_id_seq OWNED BY public.ai_insights_cache.id;


--
-- Name: auth_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_accounts (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type character varying(255) NOT NULL,
    provider character varying(255) NOT NULL,
    "providerAccountId" character varying(255) NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    id_token text,
    scope text,
    session_state text,
    token_type text,
    password text
);



--
-- Name: auth_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.auth_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: auth_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.auth_accounts_id_seq OWNED BY public.auth_accounts.id;


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_sessions (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    expires timestamp with time zone NOT NULL,
    "sessionToken" character varying(255) NOT NULL
);



--
-- Name: auth_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.auth_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: auth_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.auth_sessions_id_seq OWNED BY public.auth_sessions.id;


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_users (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255),
    "emailVerified" timestamp with time zone,
    image text,
    user_role character varying(20) DEFAULT 'free'::character varying,
    subscription_status character varying(20) DEFAULT 'free'::character varying,
    subscription_expires_at timestamp with time zone,
    first_name character varying(100),
    last_name character varying(100),
    username character varying(50),
    profile_picture text,
    CONSTRAINT auth_users_user_role_check CHECK (((user_role)::text = ANY ((ARRAY['free'::character varying, 'silver'::character varying, 'premium'::character varying, 'admin'::character varying])::text[])))
);



--
-- Name: auth_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.auth_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: auth_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.auth_users_id_seq OWNED BY public.auth_users.id;


--
-- Name: auth_verification_token; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_verification_token (
    identifier text NOT NULL,
    expires timestamp with time zone NOT NULL,
    token text NOT NULL
);



--
-- Name: export_usage; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.export_usage (
    id bigint NOT NULL,
    user_id text NOT NULL,
    export_type text NOT NULL,
    month_key text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: export_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.export_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: export_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.export_usage_id_seq OWNED BY public.export_usage.id;


--
-- Name: guest_comparisons; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.guest_comparisons (
    id integer NOT NULL,
    guest_identifier text NOT NULL,
    comparison_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: guest_comparisons_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.guest_comparisons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: guest_comparisons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.guest_comparisons_id_seq OWNED BY public.guest_comparisons.id;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_transactions (
    id integer NOT NULL,
    user_id integer,
    transaction_id character varying(255) NOT NULL,
    payment_provider character varying(50) DEFAULT 'selar'::character varying,
    customer_email character varying(255) NOT NULL,
    amount numeric(10,2),
    currency character varying(10) DEFAULT 'USD'::character varying,
    status character varying(50) NOT NULL,
    subscription_days integer DEFAULT 30,
    raw_webhook_data jsonb,
    processed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payment_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payment_transactions_id_seq OWNED BY public.payment_transactions.id;


--
-- Name: user_betslips; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_betslips (
    id integer NOT NULL,
    user_id integer NOT NULL,
    match_data jsonb NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: user_betslips_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_betslips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: user_betslips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_betslips_id_seq OWNED BY public.user_betslips.id;


--
-- Name: user_comparisons; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_comparisons (
    id integer NOT NULL,
    user_id integer NOT NULL,
    comparison_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: user_comparisons_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.user_comparisons ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_comparisons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_performance_tracking; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_performance_tracking (
    id integer NOT NULL,
    user_id integer NOT NULL,
    match_name text NOT NULL,
    league text NOT NULL,
    prediction text NOT NULL,
    actual_result text,
    bet_amount numeric(10,2),
    potential_payout numeric(10,2),
    actual_payout numeric(10,2) DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    match_date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: user_performance_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_performance_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: user_performance_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_performance_tracking_id_seq OWNED BY public.user_performance_tracking.id;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    favorite_leagues text[],
    default_chance_threshold numeric(3,2) DEFAULT 0.50,
    default_rating_threshold numeric(3,2) DEFAULT 0.50,
    favorite_markets text[],
    telegram_bot_token text,
    telegram_chat_id text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_data jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: ai_insight_usage id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insight_usage ALTER COLUMN id SET DEFAULT nextval('public.ai_insight_usage_id_seq'::regclass);


--
-- Name: ai_insights_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights_cache ALTER COLUMN id SET DEFAULT nextval('public.ai_insights_cache_id_seq'::regclass);


--
-- Name: auth_accounts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_accounts ALTER COLUMN id SET DEFAULT nextval('public.auth_accounts_id_seq'::regclass);


--
-- Name: auth_sessions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_sessions ALTER COLUMN id SET DEFAULT nextval('public.auth_sessions_id_seq'::regclass);


--
-- Name: auth_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_users ALTER COLUMN id SET DEFAULT nextval('public.auth_users_id_seq'::regclass);


--
-- Name: export_usage id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.export_usage ALTER COLUMN id SET DEFAULT nextval('public.export_usage_id_seq'::regclass);


--
-- Name: guest_comparisons id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guest_comparisons ALTER COLUMN id SET DEFAULT nextval('public.guest_comparisons_id_seq'::regclass);


--
-- Name: payment_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.payment_transactions_id_seq'::regclass);


--
-- Name: user_betslips id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_betslips ALTER COLUMN id SET DEFAULT nextval('public.user_betslips_id_seq'::regclass);


--
-- Name: user_performance_tracking id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_performance_tracking ALTER COLUMN id SET DEFAULT nextval('public.user_performance_tracking_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: ai_insight_usage ai_insight_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insight_usage
    ADD CONSTRAINT ai_insight_usage_pkey PRIMARY KEY (id);


--
-- Name: ai_insights_cache ai_insights_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights_cache
    ADD CONSTRAINT ai_insights_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: ai_insights_cache ai_insights_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights_cache
    ADD CONSTRAINT ai_insights_cache_pkey PRIMARY KEY (id);


--
-- Name: auth_accounts auth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_username_key UNIQUE (username);


--
-- Name: auth_verification_token auth_verification_token_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_verification_token
    ADD CONSTRAINT auth_verification_token_pkey PRIMARY KEY (identifier, token);


--
-- Name: export_usage export_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.export_usage
    ADD CONSTRAINT export_usage_pkey PRIMARY KEY (id);


--
-- Name: export_usage export_usage_user_id_export_type_month_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.export_usage
    ADD CONSTRAINT export_usage_user_id_export_type_month_key_key UNIQUE (user_id, export_type, month_key);


--
-- Name: guest_comparisons guest_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guest_comparisons
    ADD CONSTRAINT guest_comparisons_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: user_betslips user_betslips_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_betslips
    ADD CONSTRAINT user_betslips_pkey PRIMARY KEY (id);


--
-- Name: user_comparisons user_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_comparisons
    ADD CONSTRAINT user_comparisons_pkey PRIMARY KEY (id);


--
-- Name: user_performance_tracking user_performance_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_performance_tracking
    ADD CONSTRAINT user_performance_tracking_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_insight_usage_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ai_insight_usage_date ON public.ai_insight_usage USING btree (created_at);


--
-- Name: idx_ai_insight_usage_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ai_insight_usage_user_id ON public.ai_insight_usage USING btree (user_id);


--
-- Name: idx_ai_insights_cache_expires; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ai_insights_cache_expires ON public.ai_insights_cache USING btree (expires_at);


--
-- Name: idx_ai_insights_cache_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ai_insights_cache_key ON public.ai_insights_cache USING btree (cache_key);


--
-- Name: idx_guest_comparisons_cleanup; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guest_comparisons_cleanup ON public.guest_comparisons USING btree (created_at);


--
-- Name: idx_guest_comparisons_identifier_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guest_comparisons_identifier_date ON public.guest_comparisons USING btree (guest_identifier, created_at);


--
-- Name: idx_payment_transactions_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_transactions_email ON public.payment_transactions USING btree (customer_email);


--
-- Name: idx_payment_transactions_processed_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_transactions_processed_at ON public.payment_transactions USING btree (processed_at);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_transaction_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_transactions_transaction_id ON public.payment_transactions USING btree (transaction_id);


--
-- Name: idx_payment_transactions_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions USING btree (user_id);


--
-- Name: idx_user_betslips_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_betslips_user_id ON public.user_betslips USING btree (user_id);


--
-- Name: idx_user_comparisons_user_id_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_comparisons_user_id_date ON public.user_comparisons USING btree (user_id, created_at);


--
-- Name: idx_user_performance_match_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_performance_match_date ON public.user_performance_tracking USING btree (match_date);


--
-- Name: idx_user_performance_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_performance_status ON public.user_performance_tracking USING btree (status);


--
-- Name: idx_user_performance_user_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_performance_user_date ON public.user_performance_tracking USING btree (user_id, match_date);


--
-- Name: idx_user_performance_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_performance_user_id ON public.user_performance_tracking USING btree (user_id);


--
-- Name: ai_insight_usage ai_insight_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insight_usage
    ADD CONSTRAINT ai_insight_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_accounts auth_accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_sessions auth_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: user_betslips user_betslips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_betslips
    ADD CONSTRAINT user_betslips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: user_comparisons user_comparisons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_comparisons
    ADD CONSTRAINT user_comparisons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: user_performance_tracking user_performance_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_performance_tracking
    ADD CONSTRAINT user_performance_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--



--
-- PostgreSQL database dump complete
--



-- Data









INSERT INTO public."auth_users" OVERRIDING SYSTEM VALUE VALUES ('1', NULL, 'shackurah@gmail.com', NULL, NULL, 'admin', 'premium', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public."auth_accounts" OVERRIDING SYSTEM VALUE VALUES ('1', '1', 'credentials', 'credentials', '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$g/KLW/2Y+9BCVB2tgE0zVQ$ssHKqXs9Vk0j91X/m2mZpHaEMct/14KbME+xfkk2wU0');
INSERT INTO public."user_preferences" OVERRIDING SYSTEM VALUE VALUES ('1', '1', '{}', '0.50', '0.50', '{homeWin,draw,awayWin,gg,ov25}', '7641916515:AAF2QmJjz_A32FBrlRKEeXt2P-2Kyj_9nIU', '-1002779574609', '2026-04-27 15:26:50.887287', '2026-04-27 15:26:50.887287');
INSERT INTO public."user_sessions" OVERRIDING SYSTEM VALUE VALUES ('1', '1', '{"date": "2025-08-09", "type": "vip_pick", "error": "ChatGPT API failed", "analysis": "🎯 **VIP PICK Analysis - 2025-08-09**\n\n⚠️ **AI Analysis Temporarily Unavailable**\n\nOur AI analysis system is currently experiencing technical difficulties. We found 213 qualified matches for today but cannot generate detailed VIP picks at this moment.\n\n📊 **Top Matches Available:**\n\n1. **Central Cordoba - Lugano** - ARGENTINA - PRIMERA-C\n   • Model Pick: Home Win (8100% confidence)\n   • Rating: 6100%\n2. **Def. de Cambaceres - Deportivo Espanol** - ARGENTINA - PRIMERA-C\n   • Model Pick: NG (7200% confidence)\n   • Rating: 6700%\n3. **CSR Espanol - Atlas** - ARGENTINA - PRIMERA-C\n   • Model Pick: GG (6800% confidence)\n   • Rating: 6500%\n\n🔄 **Try Again:** Use the refresh button or check back shortly for AI-generated VIP analysis.\n⏰ **Next Update:** Tomorrow at 6:00 AM WAT\n\n*Technical support has been notified and the issue will be resolved shortly.*", "generated_at": "2025-08-09T12:10:47.571Z", "matches_analyzed": 213}', '2025-08-09 12:10:47.607612');
INSERT INTO public."user_sessions" OVERRIDING SYSTEM VALUE VALUES ('2', '1', '{"date": "2025-08-10", "type": "vip_pick", "analysis": "**VIP PICK Analysis – 2025-08-10**\n\nToday''s top football picks based on high-confidence model predictions.\n\n1. Estrella Del Sur vs Victoriano A. – Argentina, Primera-C\n   Model Pick: UN2.5 (82% confidence)\n   Rating: 75%\n\n2. El Porvenir vs Claypole – Argentina, Primera-C\n   Model Pick: UN2.5 (85% confidence)\n   Rating: 61%\n\n3. Dynamo Brest vs Naftan – Belarus, Vysshaya-Liga\n   Model Pick: NG (75% confidence)\n   Rating: 77%\n\n4. Ituano vs Confianca – Brazil, Serie-C\n   Model Pick: UN2.5 (82% confidence)\n   Rating: 75%\n\nNext Update: Tomorrow at 06:00 AM WAT", "generated_at": "2025-08-10T15:50:44.199Z", "matches_analyzed": 173}', '2025-08-10 15:50:44.373301');
INSERT INTO public."user_sessions" OVERRIDING SYSTEM VALUE VALUES ('3', '1', '{"date": "2025-08-11", "type": "vip_pick", "error": "ChatGPT API failed", "analysis": "VIP PICK Analysis – 2025-08-11\n\nAI Analysis Temporarily Unavailable\n\nOur system found 32 qualified matches for today but cannot generate detailed VIP picks at the moment.\n\nTop Matches Available:\n\n1. General Lamadrid - Canuelas – ARGENTINA - PRIMERA-C\n   Kickoff: 20:30\n   Model Pick: NG (86% confidence)\n   Rating: 60%\n\n2. Sportivo Barracas - Central Ballester – ARGENTINA - PRIMERA-C\n   Kickoff: 20:30\n   Model Pick: NG (77% confidence)\n   Rating: 60%\n\n3. Aurora - Guabira – BOLIVIA - DIVISION-PROFESIONAL\n   Kickoff: 01:30\n   Model Pick: Home Win (75% confidence)\n   Rating: 56%\n\n4. Gremio - Sport Recife – BRAZIL - SERIE-A-BETANO\n   Kickoff: 01:30\n   Model Pick: NG (67% confidence)\n   Rating: 44%\n\n5. Retro - Sao Bernardo – BRAZIL - SERIE-C\n   Kickoff: 00:00\n   Model Pick: NG (88% confidence)\n   Rating: 79%\n\n6. Vancouver FC - Pacific FC – CANADA - CANADIAN-PREMIER-LEAGUE\n   Kickoff: 00:00\n   Model Pick: UN2.5 (81% confidence)\n   Rating: 60%\n\n7. EL Nacional - Barcelona SC – ECUADOR - LIGA-PRO\n   Kickoff: 01:00\n   Model Pick: Away Win (62% confidence)\n   Rating: 50%\n\n8. Emelec - Dep. Cuenca – ECUADOR - LIGA-PRO\n   Kickoff: 23:00\n   Model Pick: UN2.5 (83% confidence)\n   Rating: 68%\n\n9. Viimsi JK - Nomme Utd – ESTONIA - ESILIIGA\n   Kickoff: 18:00\n   Model Pick: UN2.5 (77% confidence)\n   Rating: 41%\n\n10. HJK - Ilves – FINLAND - VEIKKAUSLIIGA\n   Kickoff: 18:00\n   Model Pick: GG (62% confidence)\n   Rating: 56%\n\nNext Update: Tomorrow at 06:00 AM WAT\nTechnical support has been notified and the issue will be resolved shortly.", "generated_at": "2025-08-11T08:40:36.819Z", "matches_analyzed": 32}', '2025-08-11 08:40:36.856913');
INSERT INTO public."user_sessions" OVERRIDING SYSTEM VALUE VALUES ('4', '1', '{"date": "2025-08-12", "type": "vip_pick", "analysis": "**VIP PICK Analysis – 2025-08-12**\n\nToday''s picks focus on matches with strong statistical backing and high-confidence outcomes.\n\n1. Monaro Panthers vs Tigers FC – Australia, NPL-ACT\n   Kickoff: 11:00 \n   Model Pick: OV.2.5 (85% confidence)\n   Rating: 94%\n\n2. Perth SC vs Perth Glory U23 – Australia, NPL-Western-Australia\n   Kickoff: 13:15 \n   Model Pick: OV.2.5 (81% confidence)\n   Rating: 94%\n\n3. Vasteras SK vs Orebro – Sweden, Superettan\n   Kickoff: 19:00 \n   Model Pick: Home Win (73% confidence)\n   Rating: 58%\n\nNext Update: Tomorrow at 06:00 AM WAT", "generated_at": "2025-08-12T09:01:59.230Z", "matches_analyzed": 4}', '2025-08-12 09:01:59.405375');
INSERT INTO public."user_sessions" OVERRIDING SYSTEM VALUE VALUES ('5', '1', '{"date": "2025-08-19", "type": "vip_pick", "analysis": "**VIP PICK Analysis – 2025-08-19**\n\nToday''s top football betting picks based on clear statistical advantages:\n\n1. Sunshine Coast Wanderers vs Eastern Suburbs – Australia, NPL-Queensland  \n   Kickoff: 11:30  \n   Model Pick: Away Win (83% confidence)  \n   Rating: 63%\n\n2. Bayswater vs Stirling Macedonia – Australia, NPL-Western-Australia  \n   Kickoff: 13:15  \n   Model Pick: Home Win (78% confidence)  \n   Rating: 61%\n\n3. Landsberg vs Turkspor Augsburg – Germany, Oberliga-Bayern-Sud  \n   Kickoff: 18:30  \n   Model Pick: OV.2.5 (82% confidence)  \n   Rating: 63%\n\n4. Kongsvinger 2 vs Skjetten – Norway, Division-3-Group-3  \n   Kickoff: 20:00  \n   Model Pick: GG (77% confidence)  \n   Rating: 71%\n\n5. Real Madrid vs Osasuna – Spain, LaLiga  \n   Kickoff: 21:00  \n   Model Pick: Home Win (77% confidence)  \n   Rating: 61%\n\n**Next Update: Tomorrow at 06:00 AM WAT**", "generated_at": "2025-08-19T12:46:05.676Z", "matches_analyzed": 24}', '2025-08-19 12:46:05.850291');
INSERT INTO public."ai_insights_cache" OVERRIDING SYSTEM VALUE VALUES ('1', 'Viking 2 - Stord|GG|reverse', 'Viking 2 - Stord', 'GG', 'reverse', '{"reverseInsight": ["Analysis temporarily unavailable", "Please try again later", "Technical issue with AI service"]}', '2025-08-10 15:44:57.907793+00', '2025-09-09 15:44:57.907793+00');
INSERT INTO public."ai_insights_cache" OVERRIDING SYSTEM VALUE VALUES ('2', 'Hearts - St. Mirren|Home Win|reverse', 'Hearts - St. Mirren', 'Home Win', 'reverse', '{"reverseInsight": ["ChatGPT service temporarily unavailable", "Please try again in a moment", "AI analysis will return shortly"]}', '2026-01-14 12:19:26.231065+00', '2026-02-13 12:19:26.231065+00');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('1', '1', '{"gg": 52, "ng": 48, "sn": "54", "acs": 0, "agc": 3, "ags": 1.36, "avg": 3.73, "cs2": "2:0", "hcs": 55, "hgc": 0.91, "hgs": 2.18, "aGrp": "E", "aOv2": 73, "aPts": 2, "aWin": 0, "afts": 27, "appg": 0.45, "date": "2025-08-10", "draw": 10, "flag": "⚠️", "hGrp": "D", "hOv2": 45, "hPts": 5, "hWin": 45, "hfts": 27, "hppg": 1.64, "ov25": 76, "pick": "Home Win", "time": "14:00", "tips": "HOME", "un25": 24, "aBtts": 73, "aDraw": 45, "aForm": "LDLDL", "aLost": 55, "hBtts": 27, "hDraw": 27, "hForm": "LWDDL", "hLost": 27, "match": "Flora U21 - Tallinna Kalev U21", "table": "7|9", "cScore": "3:0", "chance": 84, "league": "ESILIIGA", "rating": 50, "awayWin": 6, "country": "ESTONIA", "homeWin": 84, "score00": 4.55, "score01": 9.09, "score02": 4.55, "score10": 0, "score11": 0, "score12": 13.64, "score20": 13.64, "score21": 0, "likelyCS": "2:0", "agcOver15": 72.73, "agsOver15": 36.36, "hgcOver15": 36.36, "hgsOver15": 63.64, "oneX2Rate": 50, "cs2Percent": 9.51, "fullLeague": "ESTONIA - ESILIIGA", "modelCSPercent": 10, "scorelineCSPercent": 13.64, "predictionValidation": "74.93%"}', '2025-08-10 15:34:14.446402+00', '2', 'positive', 'f');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('2', '1', '{"gg": 91, "ng": 9, "sn": "104", "acs": 0, "agc": 2.57, "ags": 2.86, "avg": 5.21, "cs2": "3:3", "hcs": 17, "hgc": 2.17, "hgs": 2.83, "aGrp": "C", "aOv2": 86, "aPts": 10, "aWin": 43, "afts": 0, "appg": 1.57, "date": "2025-08-10", "draw": 17, "flag": "⚠️", "hGrp": "C", "hOv2": 100, "hPts": 9, "hWin": 67, "hfts": 0, "hppg": 2, "ov25": 95, "pick": "GG", "time": "14:00", "tips": "AWAY", "un25": 5, "aBtts": 100, "aDraw": 29, "aForm": "WLDWW", "aLost": 29, "hBtts": 83, "hDraw": 0, "hForm": "LLWWW", "hLost": 33, "match": "Viking 2 - Stord", "table": "8|7", "cScore": "2:3", "chance": 91, "league": "DIVISION-3-GROUP-5", "rating": 92, "addedAt": "2025-08-10T15:28:45.002Z", "awayWin": 45, "country": "NORWAY", "homeWin": 39, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 14.29, "score12": 0, "score20": 21.43, "score21": 16.67, "cacheKey": "Viking 2 - Stord|GG|reverse", "likelyCS": "2:0", "agcOver15": 57.14, "agsOver15": 71.43, "hgcOver15": 50, "hgsOver15": 83.33, "oneX2Rate": 38, "cs2Percent": 4.99, "fullLeague": "NORWAY - DIVISION-3-GROUP-5", "prediction": "GG", "modelCSPercent": 5, "scorelineCSPercent": 21.43, "predictionValidation": "48.39%"}', '2025-08-10 15:44:58.001672+00', '2', 'reverse', 'f');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('3', '1', '{}', '2025-08-10 15:49:44.4205+00', '0', 'reverse', 't');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('4', '1', '{}', '2025-08-10 15:54:33.349309+00', '0', 'reverse', 't');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('5', '1', '{"gg": 76, "ng": 24, "sn": "92", "acs": 0, "agc": 2.86, "ags": 1.57, "avg": 4.21, "cs2": "2:1", "hcs": 14, "hgc": 1.43, "hgs": 2.57, "aGrp": "D", "aOv2": 100, "aPts": 3, "aWin": 29, "afts": 14, "appg": 0.86, "date": "2025-08-10", "draw": 11, "flag": "⚠️", "hGrp": "A", "hOv2": 100, "hPts": 10, "hWin": 57, "hfts": 0, "hppg": 1.86, "ov25": 89, "pick": "OV.2.5", "time": "13:00", "tips": "HOME", "un25": 11, "aBtts": 86, "aDraw": 0, "aForm": "WLLLL", "aLost": 71, "hBtts": 86, "hDraw": 14, "hForm": "LWWDW", "hLost": 29, "match": "Sotra - Brann 2", "table": "2|9", "cScore": "3:1", "chance": 89, "league": "DIVISION-2-GROUP-1", "rating": 100, "awayWin": 11, "country": "NORWAY", "homeWin": 78, "score00": 0, "score01": 0, "score02": 14.29, "score10": 0, "score11": 0, "score12": 7.14, "score20": 0, "score21": 21.43, "likelyCS": "2:1", "agcOver15": 85.71, "agsOver15": 42.86, "hgcOver15": 42.86, "hgsOver15": 71.43, "oneX2Rate": 64, "cs2Percent": 5.57, "fullLeague": "NORWAY - DIVISION-2-GROUP-1", "modelCSPercent": 7, "scorelineCSPercent": 21.43, "predictionValidation": "72.09%"}', '2025-08-10 15:56:07.503774+00', '2', 'positive', 'f');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('6', '1', '{}', '2025-08-10 16:01:10.065215+00', '0', 'reverse', 't');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('7', '1', '{}', '2025-08-10 16:25:50.293015+00', '0', 'reverse', 't');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('8', '1', '{}', '2025-08-10 16:48:06.147463+00', '0', 'reverse', 't');
INSERT INTO public."ai_insight_usage" OVERRIDING SYSTEM VALUE VALUES ('9', '1', '{"gg": 44, "ng": 56, "sn": "15", "acs": 0, "agc": 2, "ags": 1, "avg": 2.9, "cs2": "3:0", "hcs": 50, "hgc": 0.7, "hgs": 2.1, "aGrp": "E", "aOv2": 56, "aPts": 1, "aWin": 11, "afts": 33, "appg": 0.56, "date": "2026-01-14", "draw": 11, "flag": "✅", "hGrp": "A", "hOv2": 50, "hPts": 11, "hWin": 70, "hfts": 0, "hppg": 2.4, "ov25": 70, "pick": "Home Win", "time": "20:45", "tips": "HOME", "un25": 30, "H2H_A": 0, "H2H_D": 100, "H2H_H": 0, "aBtts": 67, "aDraw": 22, "aForm": "LLDLL", "aLost": 67, "hBtts": 50, "hDraw": 30, "hForm": "WWDDW", "hLost": 0, "match": "Hearts - St. Mirren", "table": "1|10", "H2H_GG": 100, "H2H_GP": 2, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:0", "chance": 84, "league": "Premiership", "rating": 68, "addedAt": "2026-01-14T12:19:21.397Z", "awayWin": 5, "country": "Scotland", "homeWin": 84, "score00": 9.09, "score01": 9.09, "score02": 4.55, "score10": 19.09, "score11": 14.55, "score12": 0, "score20": 9.55, "score21": 5, "A_Recent": "2025-01-10 St. Mirren - Falkirk 0 : 2,2025-01-03 Motherwell - St. Mirren 2 : 0,2025-12-30 Rangers - St. Mirren 2 : 1,2025-12-27 St. Mirren - Kilmarnock 0 : 0", "H_Recent": "2025-01-11 Dundee FC - Hearts 0 : 1,2025-01-03 Hearts - Livingston 1 : 0,2025-12-27 Hibernian - Hearts 3 : 2,2025-12-21 Hearts - Rangers 2 : 1", "cacheKey": "Hearts - St. Mirren|Home Win|reverse", "likelyCS": "1:0", "agcOver15": 66.67, "agsOver15": 22.22, "hgcOver15": 10, "hgsOver15": 60, "oneX2Rate": 68, "H2H_Recent": "2025-10-29 St. Mirren - Hearts 2 : 2,2024-05-15 St. Mirren - Hearts 2 : 2,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 12, "fullLeague": "Scotland - Premiership", "prediction": "Home Win", "modelCSPercent": 12, "scorelineCSPercent": 19.09, "predictionValidation": "78.34%"}', '2026-01-14 12:19:26.316951+00', '2', 'reverse', 'f');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('1', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 67, "ng": 33, "sn": "26", "acs": 29, "agc": 2.24, "ags": 1.06, "avg": 3.67, "cs2": "2:1", "hcs": 11, "hgc": 1.56, "hgs": 2.5, "aGrp": "E", "aOv2": 53, "aPts": 1, "aWin": 29, "afts": 35, "appg": 1, "date": "2025-08-19", "draw": 13, "flag": "⚠️", "hGrp": "A", "hOv2": 72, "hPts": 7, "hWin": 44, "hfts": 28, "hppg": 1.44, "ov25": 82, "pick": "OV.2.5", "time": "18:30", "tips": "HOME", "un25": 18, "H2H_A": 50, "H2H_D": 50, "H2H_H": 0, "aBtts": 35, "aDraw": 12, "aForm": "LLLLD", "aLost": 59, "hBtts": 56, "hDraw": 11, "hForm": "WDWLL", "hLost": 44, "match": "Landsberg - Turkspor Augsburg", "table": "2|21", "H2H_GG": 0, "H2H_GP": 2, "H2H_NG": 100, "H2H_OV": 50, "H2H_UN": 50, "cScore": "3:1", "chance": 82, "league": "OBERLIGA-BAYERN-SUD", "rating": 63, "awayWin": 10, "country": "GERMANY", "homeWin": 77, "score00": 7.89, "score01": 13.45, "score02": 5.41, "score10": 2.63, "score11": 2.78, "score12": 2.78, "score20": 5.41, "score21": 0, "likelyCS": "0:1", "agcOver15": 52.94, "agsOver15": 29.41, "hgcOver15": 50, "hgsOver15": 61.11, "oneX2Rate": 52, "cs2Percent": 7, "fullLeague": "GERMANY - OBERLIGA-BAYERN-SUD", "modelCSPercent": 8, "scorelineCSPercent": 13.45, "predictionValidation": "72.49%"}', '2025-08-19 14:50:48.111862+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('2', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 53, "ng": 47, "sn": "1", "acs": 0, "agc": 1.75, "ags": 0.75, "avg": 2.88, "cs2": "2:0", "hcs": 25, "hgc": 1, "hgs": 2.25, "aGrp": "E", "aOv2": 50, "aPts": 1, "aWin": 0, "afts": 50, "appg": 0.25, "date": "2025-08-22", "draw": 9, "flag": "⚠️", "hGrp": "B", "hOv2": 75, "hPts": 9, "hWin": 75, "hfts": 25, "hppg": 2.25, "ov25": 79, "pick": "Home Win", "time": "22:35", "tips": "HOME", "un25": 21, "H2H_A": 0, "H2H_D": 0, "H2H_H": 0, "aBtts": 50, "aDraw": 25, "aForm": "LLDL", "aLost": 75, "hBtts": 50, "hDraw": 0, "hForm": "WWWL", "hLost": 25, "match": "Sportivo Italiano - UAI Urquiza", "table": "8|18", "H2H_GG": 0, "H2H_GP": 0, "H2H_NG": 0, "H2H_OV": 0, "H2H_UN": 0, "cScore": "3:0", "chance": 86, "league": "PRIMERA-B", "rating": 75, "awayWin": 5, "country": "ARGENTINA", "homeWin": 86, "score00": 20, "score01": 0, "score02": 22.5, "score10": 10, "score11": 10, "score12": 0, "score20": 0, "score21": 12.5, "A_Recent": "45886 UAI Urquiza - Midland ,45878 Excursionistas - UAI Urquiza ,45871 UAI Urquiza - Acassuso ,45864 Brown Adrogue - UAI Urquiza", "H_Recent": "45878 Midland - Sportivo Italiano ,45871 Sportivo Italiano - Excursionistas ,45864 Acassuso - Sportivo Italiano ,45857 Sportivo Italiano - Brown Adrogue", "likelyCS": "0:2", "agcOver15": 50, "agsOver15": 25, "hgcOver15": 25, "hgsOver15": 75, "oneX2Rate": 75, "cs2Percent": 9, "fullLeague": "ARGENTINA - PRIMERA-B", "modelCSPercent": 10, "scorelineCSPercent": 22.5, "predictionValidation": "78.81%"}', '2025-08-22 17:07:08.518564+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('3', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 49, "ng": 51, "sn": "52", "acs": 47, "agc": 1.47, "ags": 1.18, "avg": 3.35, "cs2": "3:0", "hcs": 53, "hgc": 0.94, "hgs": 3.12, "aGrp": "D", "aOv2": 47, "aPts": 5, "aWin": 29, "afts": 41, "appg": 1.24, "date": "2025-08-22", "draw": 13, "flag": "✅", "hGrp": "A", "hOv2": 82, "hPts": 10, "hWin": 82, "hfts": 0, "hppg": 2.59, "ov25": 69, "pick": "Home Win", "time": "20:30", "tips": "HOME", "un25": 31, "H2H_A": 0, "H2H_D": 50, "H2H_H": 50, "aBtts": 41, "aDraw": 35, "aForm": "DLWLD", "aLost": 35, "hBtts": 47, "hDraw": 12, "hForm": "WWDWL", "hLost": 6, "match": "Bayern Munich - RB Leipzig", "table": "1|12", "H2H_GG": 100, "H2H_GP": 4, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:0", "chance": 80, "league": "BUNDESLIGA", "rating": 59, "awayWin": 7, "country": "GERMANY", "homeWin": 80, "score00": 5.88, "score01": 0, "score02": 0, "score10": 2.94, "score11": 5.88, "score12": 2.94, "score20": 11.76, "score21": 2.94, "A_Recent": "45794 RB Leipzig - Stuttgart 2 : 3,46010 Werder Bremen - RB Leipzig 0 : 0,45930 RB Leipzig - Bayern Munich 3 : 3,45773 Eintracht Frankfurt - RB Leipzig 4 : 0", "H_Recent": "45794 Hoffenheim - Bayern Munich 0 : 4,45787 Bayern Munich - B. Monchengladbach 2 : 0,45930 RB Leipzig - Bayern Munich 3 : 3,45773 Bayern Munich - Mainz 3 : 0", "likelyCS": "2:0", "agcOver15": 47.06, "agsOver15": 35.29, "hgcOver15": 35.29, "hgsOver15": 94.12, "oneX2Rate": 59, "cs2Percent": 11, "fullLeague": "GERMANY - BUNDESLIGA", "modelCSPercent": 11, "scorelineCSPercent": 11.76, "predictionValidation": "66.11%"}', '2025-08-22 17:07:19.094583+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('4', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 53, "ng": 47, "sn": "1", "acs": 0, "agc": 1.75, "ags": 0.75, "avg": 2.88, "cs2": "2:0", "hcs": 25, "hgc": 1, "hgs": 2.25, "aGrp": "E", "aOv2": 50, "aPts": 1, "aWin": 0, "afts": 50, "appg": 0.25, "date": "2025-08-22", "draw": 9, "flag": "⚠️", "hGrp": "B", "hOv2": 75, "hPts": 9, "hWin": 75, "hfts": 25, "hppg": 2.25, "ov25": 79, "pick": "Home Win", "time": "22:35", "tips": "HOME", "un25": 21, "H2H_A": 0, "H2H_D": 0, "H2H_H": 0, "aBtts": 50, "aDraw": 25, "aForm": "LLDL", "aLost": 75, "hBtts": 50, "hDraw": 0, "hForm": "WWWL", "hLost": 25, "match": "Sportivo Italiano - UAI Urquiza", "table": "8|18", "H2H_GG": 0, "H2H_GP": 0, "H2H_NG": 0, "H2H_OV": 0, "H2H_UN": 0, "cScore": "3:0", "chance": 86, "league": "PRIMERA-B", "rating": 75, "awayWin": 5, "country": "ARGENTINA", "homeWin": 86, "score00": 20, "score01": 0, "score02": 22.5, "score10": 10, "score11": 10, "score12": 0, "score20": 0, "score21": 12.5, "A_Recent": "45886 UAI Urquiza - Midland ,45878 Excursionistas - UAI Urquiza ,45871 UAI Urquiza - Acassuso ,45864 Brown Adrogue - UAI Urquiza", "H_Recent": "45878 Midland - Sportivo Italiano ,45871 Sportivo Italiano - Excursionistas ,45864 Acassuso - Sportivo Italiano ,45857 Sportivo Italiano - Brown Adrogue", "likelyCS": "0:2", "agcOver15": 50, "agsOver15": 25, "hgcOver15": 25, "hgsOver15": 75, "oneX2Rate": 75, "cs2Percent": 9, "fullLeague": "ARGENTINA - PRIMERA-B", "modelCSPercent": 10, "scorelineCSPercent": 22.5, "predictionValidation": "78.81%"}', '2025-08-22 17:08:00.107902+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('5', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 49, "ng": 51, "sn": "52", "acs": 47, "agc": 1.47, "ags": 1.18, "avg": 3.35, "cs2": "3:0", "hcs": 53, "hgc": 0.94, "hgs": 3.12, "aGrp": "D", "aOv2": 47, "aPts": 5, "aWin": 29, "afts": 41, "appg": 1.24, "date": "2025-08-22", "draw": 13, "flag": "✅", "hGrp": "A", "hOv2": 82, "hPts": 10, "hWin": 82, "hfts": 0, "hppg": 2.59, "ov25": 69, "pick": "Home Win", "time": "20:30", "tips": "HOME", "un25": 31, "H2H_A": 0, "H2H_D": 50, "H2H_H": 50, "aBtts": 41, "aDraw": 35, "aForm": "DLWLD", "aLost": 35, "hBtts": 47, "hDraw": 12, "hForm": "WWDWL", "hLost": 6, "match": "Bayern Munich - RB Leipzig", "table": "1|12", "H2H_GG": 100, "H2H_GP": 4, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:0", "chance": 80, "league": "BUNDESLIGA", "rating": 59, "awayWin": 7, "country": "GERMANY", "homeWin": 80, "score00": 5.88, "score01": 0, "score02": 0, "score10": 2.94, "score11": 5.88, "score12": 2.94, "score20": 11.76, "score21": 2.94, "A_Recent": "45794 RB Leipzig - Stuttgart 2 : 3,46010 Werder Bremen - RB Leipzig 0 : 0,45930 RB Leipzig - Bayern Munich 3 : 3,45773 Eintracht Frankfurt - RB Leipzig 4 : 0", "H_Recent": "45794 Hoffenheim - Bayern Munich 0 : 4,45787 Bayern Munich - B. Monchengladbach 2 : 0,45930 RB Leipzig - Bayern Munich 3 : 3,45773 Bayern Munich - Mainz 3 : 0", "likelyCS": "2:0", "agcOver15": 47.06, "agsOver15": 35.29, "hgcOver15": 35.29, "hgsOver15": 94.12, "oneX2Rate": 59, "cs2Percent": 11, "fullLeague": "GERMANY - BUNDESLIGA", "modelCSPercent": 11, "scorelineCSPercent": 11.76, "predictionValidation": "66.11%"}', '2025-08-22 17:08:14.525252+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('6', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 53, "ng": 47, "sn": "1", "acs": 0, "agc": 1.75, "ags": 0.75, "avg": 2.88, "cs2": "2:0", "hcs": 25, "hgc": 1, "hgs": 2.25, "aGrp": "E", "aOv2": 50, "aPts": 1, "aWin": 0, "afts": 50, "appg": 0.25, "date": "2025-08-22", "draw": 9, "flag": "⚠️", "hGrp": "B", "hOv2": 75, "hPts": 9, "hWin": 75, "hfts": 25, "hppg": 2.25, "ov25": 79, "pick": "Home Win", "time": "22:35", "tips": "HOME", "un25": 21, "H2H_A": 0, "H2H_D": 0, "H2H_H": 0, "aBtts": 50, "aDraw": 25, "aForm": "LLDL", "aLost": 75, "hBtts": 50, "hDraw": 0, "hForm": "WWWL", "hLost": 25, "match": "Sportivo Italiano - UAI Urquiza", "table": "8|18", "H2H_GG": 0, "H2H_GP": 0, "H2H_NG": 0, "H2H_OV": 0, "H2H_UN": 0, "cScore": "3:0", "chance": 86, "league": "PRIMERA-B", "rating": 75, "awayWin": 5, "country": "ARGENTINA", "homeWin": 86, "score00": 20, "score01": 0, "score02": 22.5, "score10": 10, "score11": 10, "score12": 0, "score20": 0, "score21": 12.5, "A_Recent": "45886 UAI Urquiza - Midland ,45878 Excursionistas - UAI Urquiza ,45871 UAI Urquiza - Acassuso ,45864 Brown Adrogue - UAI Urquiza", "H_Recent": "45878 Midland - Sportivo Italiano ,45871 Sportivo Italiano - Excursionistas ,45864 Acassuso - Sportivo Italiano ,45857 Sportivo Italiano - Brown Adrogue", "likelyCS": "0:2", "agcOver15": 50, "agsOver15": 25, "hgcOver15": 25, "hgsOver15": 75, "oneX2Rate": 75, "cs2Percent": 9, "fullLeague": "ARGENTINA - PRIMERA-B", "modelCSPercent": 10, "scorelineCSPercent": 22.5, "predictionValidation": "78.81%"}', '2025-08-22 17:57:45.140977+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('7', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 51, "ng": 49, "sn": "65", "acs": 13, "agc": 1.75, "ags": 1.88, "avg": 4.15, "cs2": "2:0", "hcs": 56, "hgc": 0.67, "hgs": 4, "aGrp": "B", "aOv2": 88, "aPts": 9, "aWin": 50, "afts": 0, "appg": 1.5, "date": "2025-09-06", "draw": 10, "flag": "✅", "hGrp": "A", "hOv2": 89, "hPts": 15, "hWin": 100, "hfts": 0, "hppg": 3, "ov25": 76, "pick": "Home Win", "time": "14:00", "tips": "HOME", "un25": 24, "H2H_A": 0, "H2H_D": 100, "H2H_H": 0, "aBtts": 88, "aDraw": 0, "aForm": "WLWLW", "aLost": 50, "hBtts": 44, "hDraw": 0, "hForm": "WWWWW", "hLost": 0, "match": "Kvik Halden - Orn", "table": "1|3", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 0, "H2H_UN": 100, "cScore": "3:0", "chance": 85, "league": "Division 3 Group 6", "rating": 75, "awayWin": 5, "country": "Norway", "homeWin": 85, "score00": 0, "score01": 0, "score02": 0, "score10": 5.56, "score11": 15, "score12": 0, "score20": 10, "score21": 0, "A_Recent": "2025-08-30 Orn - Drobak-Frogn 3 : 4,2025-08-24 Stabaek 2 - Orn 1 : 2,2025-08-16 Orn - Grei 2 : 0,2025-08-09 Fredrikstad 2 - Orn 4 : 2", "H_Recent": "2025-08-30 Grei - Kvik Halden 0 : 7,2025-08-24 Kvik Halden - Oppsal 6 : 0,2025-08-17 Lokomotiv Oslo - Kvik Halden 0 : 4,2025-08-09 Kvik Halden - Pors 2 6 : 0", "likelyCS": "1:1", "agcOver15": 50, "agsOver15": 50, "hgcOver15": 22.22, "hgsOver15": 88.89, "oneX2Rate": 75, "H2H_Recent": "2025-07-19 Orn - Kvik Halden 1 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 10, "fullLeague": "Norway - Division 3 Group 6", "modelCSPercent": 10, "scorelineCSPercent": 15, "predictionValidation": "64.50%"}', '2025-09-06 09:32:43.012381+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('8', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 65, "ng": 35, "sn": "4", "acs": 0, "agc": 2.67, "ags": 1.67, "avg": 3.25, "cs2": "1:1", "hcs": 41, "hgc": 0.94, "hgs": 1.24, "aGrp": "C", "aOv2": 83, "aPts": 2, "aWin": 17, "afts": 17, "appg": 0.83, "date": "2026-02-04", "draw": 19, "flag": "✅", "hGrp": "B", "hOv2": 35, "hPts": 5, "hWin": 41, "hfts": 24, "hppg": 1.53, "ov25": 71, "pick": "OV.2.5", "time": "15:00", "tips": "HOME", "un25": 29, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 83, "aDraw": 33, "aForm": "DLDLL", "aLost": 50, "hBtts": 47, "hDraw": 29, "hForm": "LDLWD", "hLost": 29, "match": "Al Salt - Al Buqaa", "table": "5|7", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:1", "chance": 71, "league": "Premier League", "rating": 59, "awayWin": 19, "country": "Jordan", "ftScore": "", "homeWin": 63, "score00": 22.55, "score01": 0, "score02": 5.88, "score10": 5.88, "score11": 8.82, "score12": 8.82, "score20": 14.22, "score21": 2.94, "A_Recent": "2026-01-30 Al Jazeera Amman - Al Buqaa 2 : 2,2026-01-25 Al Buqaa - Al Ahli 0 : 0,2026-01-20 Al Wehdat - Al Buqaa 4 : 2,2025-10-31 Sama Al Sarhan - Al Buqaa 1 : 1", "H_Recent": "2026-01-28 Al Hussein - Al Salt 1 : 0,2026-01-23 Al Salt - Al-Faisaly Amman 1 : 2,2025-10-30 Shabab Al Ordon - Al Salt 0 : 2,2025-10-24 Al Salt - Al Ramtha 1 : 1", "likelyCS": "0:0", "agcOver15": 83.33, "agsOver15": 66.67, "hgcOver15": 35.29, "hgsOver15": 29.41, "oneX2Rate": 46, "H2H_Recent": "2025-08-18 Al Buqaa - Al Salt 1 : 5,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Jordan - Premier League", "modelCSPercent": 9, "scorelineCSPercent": 22.55, "predictionValidation": "64.12%"}', '2026-02-04 08:20:03.346199+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('9', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 27, "ng": 73, "sn": "32", "acs": 25, "agc": 1.13, "ags": 1.13, "avg": 2.3, "cs2": "2:0", "hcs": 71, "hgc": 0.43, "hgs": 1.93, "aGrp": "D", "aOv2": 50, "aPts": 7, "aWin": 38, "afts": 38, "appg": 1.38, "date": "2026-02-17", "draw": 22, "flag": "✅", "hGrp": "A", "hOv2": 29, "hPts": 15, "hWin": 86, "hfts": 7, "hppg": 2.57, "ov25": 35, "pick": "NG", "time": "13:15", "tips": "HOME", "un25": 65, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 50, "aDraw": 25, "aForm": "DWWLL", "aLost": 38, "hBtts": 21, "hDraw": 0, "hForm": "WWWWW", "hLost": 14, "match": "Al Ansar - Al Riyadi Abbasiyah", "table": "1|9", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 0, "H2H_UN": 100, "cScore": "1:0", "chance": 73, "league": "Premier League", "rating": 64, "awayWin": 8, "country": "Lebanon", "ftScore": "", "homeWin": 69, "score00": 14.29, "score01": 14.29, "score02": 10.71, "score10": 10.71, "score11": 7.14, "score12": 3.57, "score20": 21.43, "score21": 0, "A_Recent": "2026-02-13 Al Riyadi Abbasiyah - Tadamon 1 : 1,2026-02-07 Al Riyadi Abbasiyah - Al-Mabarrah 0 : 0,2026-02-01 Jwayya - Al Riyadi Abbasiyah 0 : 0,2026-01-24 Al Ahed - Al Riyadi Abbasiyah 0 : 1,2025-12-28 Racing - Al Riyadi Abbasiyah 1 : 3", "H_Recent": "2026-02-13 Safa - Al Ansar 0 : 1,2026-02-08 Racing - Al Ansar 0 : 6,2026-01-30 Al Ansar - Al Hikma 2 : 0,2026-01-25 Nejmeh SC - Al Ansar 0 : 0,2025-12-30 Al Ansar - Bourj FC 4 : 1", "likelyCS": "2:0", "agcOver15": 25, "agsOver15": 25, "hgcOver15": 14.29, "hgsOver15": 64.29, "oneX2Rate": 62, "H2H_Recent": "2025-11-07 Al Riyadi Abbasiyah - Al Ansar 0 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 18, "fullLeague": "Lebanon - Premier League", "modelCSPercent": 21, "scorelineCSPercent": 21.43, "predictionValidation": "63.83%"}', '2026-02-17 11:09:21.827213+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('10', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 67, "ng": 33, "sn": "15", "acs": 27, "agc": 1.55, "ags": 1.91, "avg": 3.32, "cs2": "1:1", "hcs": 26, "hgc": 1.59, "hgs": 1.59, "aGrp": "B", "aOv2": 64, "aPts": 8, "aWin": 36, "afts": 18, "appg": 1.55, "date": "2026-03-18", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 70, "hPts": 3, "hWin": 52, "hfts": 15, "hppg": 1.63, "ov25": 70, "pick": "OV.2.5", "time": "13:00", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 64, "aDraw": 45, "aForm": "DWDLW", "aLost": 18, "hBtts": 59, "hDraw": 7, "hForm": "LLWLL", "hLost": 41, "match": "Pawlowice - Zaglebie II", "table": "16|4", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "1:2", "chance": 70, "league": "Iii Liga Group Iii", "rating": 67, "awayWin": 54, "country": "Poland", "ftScore": "", "homeWin": 25, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 1.85, "score02": 6.85, "score10": 7.41, "score11": 1.85, "score12": 5.56, "score20": 6.85, "score21": 17.41, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-14 Zielona Gora - Zaglebie II 0 : 0,2026-03-08 Zaglebie II - Polkowice 0 : 2,2025-11-30 Stal Jasien - Zaglebie II 0 : 3,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-14 Zaglebie II - Goczalkowice Zdroj 5 : 0", "H_Recent": "2026-03-14 Goczalkowice Zdroj - Pawlowice 3 : 0,2026-03-07 Stal Jasien - Pawlowice 0 : 3,2025-11-29 Woliborz - Pawlowice 1 : 2,2025-11-21 Pawlowice - Gornik Zabrze II 1 : 3,2025-11-15 Pawlowice - Warta Gorzow 0 : 1", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "2:1", "agcOver15": 36.36, "agsOver15": 54.55, "hgcOver15": 44.44, "hgsOver15": 44.44, "oneX2Rate": 39, "H2H_Recent": "2025-08-16 Zaglebie II - Pawlowice 2 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "Moderate", "edgeTier": "THIN", "stability": 0.6572012045832926, "confidence": "High", "modelTrust": 65, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nPawlowice average 1.59 goals scored and 1.59 conceded per home match, while Zaglebie II average 1.91 scored and 1.55 conceded away from home.\n\nPoints-per-game stands at 1.63 for Pawlowice versus 1.55 for Zaglebie II, with recent form returning 3 points from the last five for the home side against 8 for the away side.\n\nThe model prices the primary outcome at 70%, supported by a structural differential of -0.10 and a stability index of 0.66. Momentum is currently classified as balanced momentum, while overall model trust registers at 65%.\n", "tactical": "\nPawlowice''s attacking output of 1.59 goals per match is set against an away concession rate of 1.55, creating an attacking separation of 0.04.\n\nAt the same time, Zaglebie II''s away scoring average of 1.91 is measured against Pawlowice''s home concession rate of 1.59, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 59% for Pawlowice and 64% for Zaglebie II, while Over 2.5 lands 70% and 64% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 26% and 27%, alongside failed-to-score rates of 15% and 18%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nZaglebie II''s away win rate of 36% and Pawlowice''s home draw rate of 7% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 18% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.32, with Over 2.5 at 70% and Under 2.5 at 30%.\n\nOver 1.5 goal occurrence registers 44.44% for Pawlowice and 54.55% for Zaglebie II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 70% probability with a structural rating strength of 67%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:2 (9%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 0.07999999999999985, "formEdge": -0.5, "composite": -0.0956, "attackEdge": 0.040000000000000036, "defensiveEdge": 0.31999999999999984, "cleanSheetEdge": -0.01, "reliabilityEdge": 0.03}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 70, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 70, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 9, "scorelineCSPercent": 17.41, "predictionValidation": "57.72%"}', '2026-03-18 08:44:19.287753+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('11', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 67, "ng": 33, "sn": "15", "acs": 27, "agc": 1.55, "ags": 1.91, "avg": 3.32, "cs2": "1:1", "hcs": 26, "hgc": 1.59, "hgs": 1.59, "aGrp": "B", "aOv2": 64, "aPts": 8, "aWin": 36, "afts": 18, "appg": 1.55, "date": "2026-03-18", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 70, "hPts": 3, "hWin": 52, "hfts": 15, "hppg": 1.63, "ov25": 70, "pick": "OV.2.5", "time": "13:00", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 64, "aDraw": 45, "aForm": "DWDLW", "aLost": 18, "hBtts": 59, "hDraw": 7, "hForm": "LLWLL", "hLost": 41, "match": "Pawlowice - Zaglebie II", "table": "16|4", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "1:2", "chance": 70, "league": "Iii Liga Group Iii", "rating": 67, "awayWin": 54, "country": "Poland", "ftScore": "", "homeWin": 25, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 1.85, "score02": 6.85, "score10": 7.41, "score11": 1.85, "score12": 5.56, "score20": 6.85, "score21": 17.41, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-14 Zielona Gora - Zaglebie II 0 : 0,2026-03-08 Zaglebie II - Polkowice 0 : 2,2025-11-30 Stal Jasien - Zaglebie II 0 : 3,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-14 Zaglebie II - Goczalkowice Zdroj 5 : 0", "H_Recent": "2026-03-14 Goczalkowice Zdroj - Pawlowice 3 : 0,2026-03-07 Stal Jasien - Pawlowice 0 : 3,2025-11-29 Woliborz - Pawlowice 1 : 2,2025-11-21 Pawlowice - Gornik Zabrze II 1 : 3,2025-11-15 Pawlowice - Warta Gorzow 0 : 1", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "2:1", "agcOver15": 36.36, "agsOver15": 54.55, "hgcOver15": 44.44, "hgsOver15": 44.44, "oneX2Rate": 39, "H2H_Recent": "2025-08-16 Zaglebie II - Pawlowice 2 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "Moderate", "edgeTier": "THIN", "stability": 0.6572012045832926, "confidence": "High", "modelTrust": 65, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nPawlowice average 1.59 goals scored and 1.59 conceded per home match, while Zaglebie II average 1.91 scored and 1.55 conceded away from home.\n\nPoints-per-game stands at 1.63 for Pawlowice versus 1.55 for Zaglebie II, with recent form returning 3 points from the last five for the home side against 8 for the away side.\n\nThe model prices the primary outcome at 70%, supported by a structural differential of -0.10 and a stability index of 0.66. Momentum is currently classified as balanced momentum, while overall model trust registers at 65%.\n", "tactical": "\nPawlowice''s attacking output of 1.59 goals per match is set against an away concession rate of 1.55, creating an attacking separation of 0.04.\n\nAt the same time, Zaglebie II''s away scoring average of 1.91 is measured against Pawlowice''s home concession rate of 1.59, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 59% for Pawlowice and 64% for Zaglebie II, while Over 2.5 lands 70% and 64% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 26% and 27%, alongside failed-to-score rates of 15% and 18%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nZaglebie II''s away win rate of 36% and Pawlowice''s home draw rate of 7% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 18% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.32, with Over 2.5 at 70% and Under 2.5 at 30%.\n\nOver 1.5 goal occurrence registers 44.44% for Pawlowice and 54.55% for Zaglebie II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 70% probability with a structural rating strength of 67%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:2 (9%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 0.07999999999999985, "formEdge": -0.5, "composite": -0.0956, "attackEdge": 0.040000000000000036, "defensiveEdge": 0.31999999999999984, "cleanSheetEdge": -0.01, "reliabilityEdge": 0.03}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 70, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 70, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 9, "scorelineCSPercent": 17.41, "predictionValidation": "57.72%"}', '2026-03-18 08:46:54.102816+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('12', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 67, "ng": 33, "sn": "15", "acs": 27, "agc": 1.55, "ags": 1.91, "avg": 3.32, "cs2": "1:1", "hcs": 26, "hgc": 1.59, "hgs": 1.59, "aGrp": "B", "aOv2": 64, "aPts": 8, "aWin": 36, "afts": 18, "appg": 1.55, "date": "2026-03-18", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 70, "hPts": 3, "hWin": 52, "hfts": 15, "hppg": 1.63, "ov25": 70, "pick": "OV.2.5", "time": "13:00", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 64, "aDraw": 45, "aForm": "DWDLW", "aLost": 18, "hBtts": 59, "hDraw": 7, "hForm": "LLWLL", "hLost": 41, "match": "Pawlowice - Zaglebie II", "table": "16|4", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "1:2", "chance": 70, "league": "Iii Liga Group Iii", "rating": 67, "awayWin": 54, "country": "Poland", "ftScore": "", "homeWin": 25, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 1.85, "score02": 6.85, "score10": 7.41, "score11": 1.85, "score12": 5.56, "score20": 6.85, "score21": 17.41, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-14 Zielona Gora - Zaglebie II 0 : 0,2026-03-08 Zaglebie II - Polkowice 0 : 2,2025-11-30 Stal Jasien - Zaglebie II 0 : 3,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-14 Zaglebie II - Goczalkowice Zdroj 5 : 0", "H_Recent": "2026-03-14 Goczalkowice Zdroj - Pawlowice 3 : 0,2026-03-07 Stal Jasien - Pawlowice 0 : 3,2025-11-29 Woliborz - Pawlowice 1 : 2,2025-11-21 Pawlowice - Gornik Zabrze II 1 : 3,2025-11-15 Pawlowice - Warta Gorzow 0 : 1", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "2:1", "agcOver15": 36.36, "agsOver15": 54.55, "hgcOver15": 44.44, "hgsOver15": 44.44, "oneX2Rate": 39, "H2H_Recent": "2025-08-16 Zaglebie II - Pawlowice 2 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "Moderate", "edgeTier": "THIN", "stability": 0.6572012045832926, "confidence": "High", "modelTrust": 65, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nPawlowice average 1.59 goals scored and 1.59 conceded per home match, while Zaglebie II average 1.91 scored and 1.55 conceded away from home.\n\nPoints-per-game stands at 1.63 for Pawlowice versus 1.55 for Zaglebie II, with recent form returning 3 points from the last five for the home side against 8 for the away side.\n\nThe model prices the primary outcome at 70%, supported by a structural differential of -0.10 and a stability index of 0.66. Momentum is currently classified as balanced momentum, while overall model trust registers at 65%.\n", "tactical": "\nPawlowice''s attacking output of 1.59 goals per match is set against an away concession rate of 1.55, creating an attacking separation of 0.04.\n\nAt the same time, Zaglebie II''s away scoring average of 1.91 is measured against Pawlowice''s home concession rate of 1.59, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 59% for Pawlowice and 64% for Zaglebie II, while Over 2.5 lands 70% and 64% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 26% and 27%, alongside failed-to-score rates of 15% and 18%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nZaglebie II''s away win rate of 36% and Pawlowice''s home draw rate of 7% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 18% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.32, with Over 2.5 at 70% and Under 2.5 at 30%.\n\nOver 1.5 goal occurrence registers 44.44% for Pawlowice and 54.55% for Zaglebie II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 70% probability with a structural rating strength of 67%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:2 (9%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 0.07999999999999985, "formEdge": -0.5, "composite": -0.0956, "attackEdge": 0.040000000000000036, "defensiveEdge": 0.31999999999999984, "cleanSheetEdge": -0.01, "reliabilityEdge": 0.03}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 70, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 70, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 9, "scorelineCSPercent": 17.41, "predictionValidation": "57.72%"}', '2026-03-18 09:24:15.733293+00');
INSERT INTO public."guest_comparisons" OVERRIDING SYSTEM VALUE VALUES ('13', 'unknown_Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWeb', '{"gg": 40, "ng": 60, "sn": "16", "acs": 50, "agc": 0.7, "ags": 1.9, "avg": 2.74, "cs2": "0:2", "hcs": 30, "hgc": 1.26, "hgs": 1.63, "aGrp": "A", "aOv2": 40, "aPts": 12, "aWin": 80, "afts": 20, "appg": 2.4, "date": "2026-03-18", "draw": 23, "flag": "✅", "hGrp": "D", "hOv2": 67, "hPts": 6, "hWin": 48, "hfts": 15, "hppg": 1.59, "ov25": 43, "pick": "Away Win", "time": "14:00", "tips": "AWAY", "un25": 57, "H2H_A": 0, "H2H_D": 100, "H2H_H": 0, "aBtts": 30, "aDraw": 0, "aForm": "WLWWW", "aLost": 20, "hBtts": 63, "hDraw": 15, "hForm": "LWLWL", "hLost": 37, "match": "Carina Gubin - BKS Sparta Katowice", "table": "11|3", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 0, "H2H_UN": 100, "cScore": "0:1", "chance": 62, "league": "Iii Liga Group Iii", "rating": 59, "awayWin": 62, "country": "Poland", "ftScore": "", "homeWin": 14, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 12.79, "score01": 3.7, "score02": 0, "score10": 10.1, "score11": 10.94, "score12": 7.41, "score20": 6.4, "score21": 10.1, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-13 Polkowice - BKS Sparta Katowice 0 : 4,2026-03-07 BKS Sparta Katowice - Legnica II 2 : 2,2025-11-29 BKS Sparta Katowice - Warta Gorzow 3 : 4,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-16 Stal Jasien - BKS Sparta Katowice 1 : 4", "H_Recent": "2026-03-14 Carina Gubin - Warta Gorzow 1 : 3,2025-11-29 Gornik Zabrze II - Carina Gubin 6 : 0,2025-11-22 Carina Gubin - Skra 1 : 0,2025-11-14 Nysa - Carina Gubin 2 : 2,2025-11-08 Carina Gubin - Starowice Dolne 1 : 3", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "0:0", "agcOver15": 20, "agsOver15": 60, "hgcOver15": 37.04, "hgsOver15": 44.44, "oneX2Rate": 59, "H2H_Recent": "2025-08-16 BKS Sparta Katowice - Carina Gubin 1 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 14, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "High", "edgeTier": "THIN", "stability": 0.5072612239381638, "confidence": "Medium", "modelTrust": 50, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nCarina Gubin average 1.63 goals scored and 1.26 conceded per home match, while BKS Sparta Katowice average 1.90 scored and 0.70 conceded away from home.\n\nPoints-per-game stands at 1.59 for Carina Gubin versus 2.40 for BKS Sparta Katowice, with recent form returning 6 points from the last five for the home side against 12 for the away side.\n\nThe model prices the primary outcome at 62%, supported by a structural differential of -0.17 and a stability index of 0.51. Momentum is currently classified as away momentum, while overall model trust registers at 50%.\n", "tactical": "\nCarina Gubin''s attacking output of 1.63 goals per match is set against an away concession rate of 0.70, creating an attacking separation of 0.93.\n\nAt the same time, BKS Sparta Katowice''s away scoring average of 1.90 is measured against Carina Gubin''s home concession rate of 1.26, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 63% for Carina Gubin and 30% for BKS Sparta Katowice, while Over 2.5 lands 67% and 40% respectively. That combination points toward a balanced tempo game state rather than a random scoring script.\n\nClean-sheet rates of 30% and 50%, alongside failed-to-score rates of 15% and 20%, help explain why the match is currently tagged as defensive stability.\n", "riskReport": "\nRisk is currently classified as high, while volatility is labeled controlled volatility.\n\nDraw pressure sits in the high draw pressure range, with head-to-head draws occurring 100% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nBKS Sparta Katowice''s away win rate of 80% and Carina Gubin''s home draw rate of 15% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 20% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 2.74, with Over 2.5 at 43% and Under 2.5 at 57%.\n\nOver 1.5 goal occurrence registers 44.44% for Carina Gubin and 60% for BKS Sparta Katowice, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 0% and Under 2.5 landing 100% across 1 meetings.\n\nThe broader scoring backdrop is classified as neutral scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Away side to win, currently projecting at 62% probability with a structural rating strength of 59%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 0%, which adds context to the current market angle.\n\nScoreline weighting highlights 0:1 (16%) as the primary script, with 0:2 (14%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": -0.8099999999999998, "formEdge": -0.6, "composite": -0.172, "attackEdge": 0.9299999999999999, "defensiveEdge": 0.6399999999999999, "cleanSheetEdge": -0.2, "reliabilityEdge": 0.05}, "volatility": "Controlled Volatility", "primaryEdge": "Balanced", "probability": 62, "recommendation": {"market": "1X2", "selection": "Away Win", "stakeTier": "Low Exposure", "confidence": 62, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 16, "scorelineCSPercent": 12.79, "predictionValidation": "59.97%"}', '2026-03-18 09:24:42.692232+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('1', '1', '{"gg": 55, "ng": 45, "sn": "3", "acs": 0, "agc": 2.63, "ags": 1, "avg": 3.48, "cs2": "3:0", "hcs": 17, "hgc": 1.17, "hgs": 2.17, "aGrp": "D", "aOv2": 63, "aPts": 3, "aWin": 0, "afts": 13, "appg": 0.38, "date": "2025-08-11", "draw": 15, "flag": "⚠️", "hGrp": "C", "hOv2": 50, "hPts": 8, "hWin": 50, "hfts": 17, "hppg": 1.83, "ov25": 70, "pick": "Home Win", "time": "01:30", "tips": "HOME", "un25": 30, "aBtts": 88, "aDraw": 38, "aForm": "LDLDD", "aLost": 63, "hBtts": 67, "hDraw": 33, "hForm": "DWLDW", "hLost": 17, "match": "Aurora - Guabira", "table": "9|10", "cScore": "2:0", "chance": 75, "league": "DIVISION-PROFESIONAL", "rating": 56, "awayWin": 10, "country": "BOLIVIA", "homeWin": 75, "score00": 0, "score01": 0, "score02": 8.33, "score10": 6.25, "score11": 14.58, "score12": 0, "score20": 8.33, "score21": 0, "likelyCS": "1:1", "agcOver15": 62.5, "agsOver15": 12.5, "hgcOver15": 33.33, "hgsOver15": 66.67, "oneX2Rate": 56, "cs2Percent": 8.99, "fullLeague": "BOLIVIA - DIVISION-PROFESIONAL", "modelCSPercent": 10, "scorelineCSPercent": 14.58, "predictionValidation": "73.96%"}', '2025-08-11 11:16:10.970411+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('2', '1', '{"gg": 47, "ng": 53, "sn": "2", "acs": 0, "agc": 1.67, "ags": 2.22, "avg": 3.56, "cs2": "3:0", "hcs": 67, "hgc": 0.56, "hgs": 2.67, "aGrp": "C", "aOv2": 89, "aPts": 13, "aWin": 56, "afts": 11, "appg": 1.78, "date": "2025-08-19", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 12, "hWin": 89, "hfts": 0, "hppg": 2.67, "ov25": 64, "pick": "Home Win", "time": "13:15", "tips": "HOME", "un25": 36, "aBtts": 89, "aDraw": 11, "aForm": "WWDWW", "aLost": 33, "hBtts": 33, "hDraw": 0, "hForm": "WLWWW", "hLost": 11, "match": "Bayswater - Stirling Macedonia", "table": "1|5", "cScore": "2:0", "chance": 78, "league": "NPL-WESTERN-AUSTRALIA", "rating": 61, "awayWin": 8, "country": "AUSTRALIA", "homeWin": 78, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 0, "score12": 0, "score20": 21.21, "score21": 10.1, "likelyCS": "2:0", "agcOver15": 55.56, "agsOver15": 66.67, "hgcOver15": 11.11, "hgsOver15": 100, "oneX2Rate": 61, "cs2Percent": 11, "fullLeague": "AUSTRALIA - NPL-WESTERN-AUSTRALIA", "modelCSPercent": 12, "scorelineCSPercent": 21.21, "predictionValidation": "53.39%"}', '2025-08-19 10:27:09.104714+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('3', '1', '{"gg": 47, "ng": 53, "sn": "2", "acs": 0, "agc": 1.67, "ags": 2.22, "avg": 3.56, "cs2": "3:0", "hcs": 67, "hgc": 0.56, "hgs": 2.67, "aGrp": "C", "aOv2": 89, "aPts": 13, "aWin": 56, "afts": 11, "appg": 1.78, "date": "2025-08-19", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 12, "hWin": 89, "hfts": 0, "hppg": 2.67, "ov25": 64, "pick": "Home Win", "time": "13:15", "tips": "HOME", "un25": 36, "aBtts": 89, "aDraw": 11, "aForm": "WWDWW", "aLost": 33, "h2h_A": 0, "h2h_D": 0, "h2h_H": 100, "hBtts": 33, "hDraw": 0, "hForm": "WLWWW", "hLost": 11, "match": "Bayswater - Stirling Macedonia", "table": "1|5", "cScore": "2:0", "chance": 78, "h2h_GG": 0, "h2h_GP": 1, "h2h_NG": 100, "h2h_OV": 100, "h2h_UN": 0, "league": "NPL-WESTERN-AUSTRALIA", "rating": 61, "awayWin": 8, "country": "AUSTRALIA", "homeWin": 78, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 0, "score12": 0, "score20": 21.21, "score21": 10.1, "likelyCS": "2:0", "agcOver15": 55.56, "agsOver15": 66.67, "hgcOver15": 11.11, "hgsOver15": 100, "oneX2Rate": 61, "cs2Percent": 11, "fullLeague": "AUSTRALIA - NPL-WESTERN-AUSTRALIA", "modelCSPercent": 12, "scorelineCSPercent": 21.21, "predictionValidation": "53.39%"}', '2025-08-19 12:44:19.190963+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('4', '1', '{"gg": 38, "ng": 62, "sn": "13", "acs": 27, "agc": 1.55, "ags": 1, "avg": 2.18, "cs2": "0:0", "hcs": 18, "hgc": 0.91, "hgs": 0.91, "aGrp": "D", "aOv2": 36, "aPts": 6, "aWin": 18, "afts": 55, "appg": 0.91, "date": "2025-08-19", "draw": 32, "flag": "⚠️", "hGrp": "E", "hOv2": 18, "hPts": 5, "hWin": 27, "hfts": 45, "hppg": 1.18, "ov25": 30, "pick": "NG", "time": "15:00", "tips": "HOME", "un25": 70, "aBtts": 36, "aDraw": 36, "aForm": "LWDDD", "aLost": 45, "h2h_A": 100, "h2h_D": 0, "h2h_H": 0, "hBtts": 45, "hDraw": 36, "hForm": "DDWLL", "hLost": 36, "match": "Deportivo Santani - Sol de America", "table": "14|12", "cScore": "1:0", "chance": 62, "h2h_GG": 100, "h2h_GP": 1, "h2h_NG": 0, "h2h_OV": 100, "h2h_UN": 0, "league": "DIVISION-INTERMEDIA", "rating": 59, "awayWin": 32, "country": "PARAGUAY", "homeWin": 37, "score00": 18.18, "score01": 18.18, "score02": 9.09, "score10": 0, "score11": 22.73, "score12": 0, "score20": 4.55, "score21": 18.18, "likelyCS": "1:1", "agcOver15": 54.55, "agsOver15": 27.27, "hgcOver15": 9.09, "hgsOver15": 27.27, "oneX2Rate": 36, "cs2Percent": 14, "fullLeague": "PARAGUAY - DIVISION-INTERMEDIA", "modelCSPercent": 15, "scorelineCSPercent": 22.73, "predictionValidation": "49.29%"}', '2025-08-19 12:44:26.696417+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('12', '1', '{"gg": 53, "ng": 47, "sn": "4", "acs": 38, "agc": 2.13, "ags": 1.38, "avg": 3.54, "cs2": "2:0", "hcs": 43, "hgc": 0.86, "hgs": 2.71, "aGrp": "C", "aOv2": 63, "aPts": 4, "aWin": 25, "afts": 100, "appg": 1, "date": "2026-01-14", "draw": 10, "flag": "✅", "hGrp": "B", "hOv2": 71, "hPts": 12, "hWin": 86, "hfts": 0, "hppg": 2.57, "ov25": 77, "pick": "Home Win", "time": "20:30", "tips": "HOME", "un25": 23, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 50, "aDraw": 25, "aForm": "WLLDL", "aLost": 50, "hBtts": 57, "hDraw": 0, "hForm": "LWWWW", "hLost": 14, "match": "RB Leipzig - Freiburg", "table": "4|8", "H2H_GG": 100, "H2H_GP": 2, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "3:0", "chance": 84, "league": "Bundesliga", "rating": 68, "awayWin": 6, "country": "Germany", "homeWin": 84, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 12.5, "score12": 0, "score20": 14.29, "score21": 19.64, "A_Recent": "2025-01-10 Freiburg - Hamburger SV 2 : 1,2025-12-20 Wolfsburg - Freiburg 3 : 4,2025-12-14 Freiburg - Dortmund 1 : 1,2025-12-06 Heidenheim - Freiburg 2 : 1", "H_Recent": "2025-12-20 RB Leipzig - Bayer Leverkusen 1 : 3,2025-12-12 Union Berlin - RB Leipzig 3 : 1,2025-12-06 RB Leipzig - Eintracht Frankfurt 6 : 0,2025-11-28 B. Monchengladbach - RB Leipzig 0 : 0", "likelyCS": "2:1", "agcOver15": 62.5, "agsOver15": 37.5, "hgcOver15": 14.29, "hgsOver15": 85.71, "oneX2Rate": 68, "H2H_Recent": "2024-04-06 Freiburg - RB Leipzig 1 : 4,2023-11-12 RB Leipzig - Freiburg 3 : 1,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 9, "fullLeague": "Germany - Bundesliga", "modelCSPercent": 10, "scorelineCSPercent": 19.64, "predictionValidation": "71.42%"}', '2026-01-14 12:19:14.091191+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('5', '1', '{"gg": 63, "ng": 37, "sn": "5", "acs": 13, "agc": 1.5, "ags": 1.38, "avg": 2.58, "cs2": "1:2", "hcs": 29, "hgc": 1.14, "hgs": 1.14, "aGrp": "A", "aOv2": 63, "aPts": 9, "aWin": 50, "afts": 25, "appg": 1.5, "date": "2025-08-19", "draw": 24, "flag": "⚠️", "hGrp": "E", "hOv2": 29, "hPts": 3, "hWin": 29, "hfts": 29, "hppg": 1.29, "ov25": 62, "pick": "GG", "time": "00:30", "tips": "DRAW", "un25": 38, "aBtts": 63, "aDraw": 0, "aForm": "WLWWL", "aLost": 50, "h2h_A": 0, "h2h_D": 0, "h2h_H": 0, "hBtts": 57, "hDraw": 43, "hForm": "DLLDD", "hLost": 29, "match": "Tombense - SER Caxias", "table": "20|1", "cScore": "1:1", "chance": 63, "h2h_GG": 0, "h2h_GP": 0, "h2h_NG": 0, "h2h_OV": 0, "h2h_UN": 0, "league": "SERIE-C", "rating": 60, "awayWin": 42, "country": "BRAZIL", "homeWin": 34, "score00": 7.14, "score01": 0, "score02": 7.14, "score10": 18.75, "score11": 14.29, "score12": 7.14, "score20": 13.39, "score21": 18.75, "likelyCS": "1:0", "agcOver15": 62.5, "agsOver15": 37.5, "hgcOver15": 42.86, "hgsOver15": 28.57, "oneX2Rate": 21, "cs2Percent": 9, "fullLeague": "BRAZIL - SERIE-C", "modelCSPercent": 10, "scorelineCSPercent": 18.75, "predictionValidation": "2.62%"}', '2025-08-19 12:44:36.824664+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('6', '1', '{"gg": 47, "ng": 53, "sn": "2", "acs": 0, "agc": 1.67, "ags": 2.22, "avg": 3.56, "cs2": "3:0", "hcs": 67, "hgc": 0.56, "hgs": 2.67, "aGrp": "C", "aOv2": 89, "aPts": 13, "aWin": 56, "afts": 11, "appg": 1.78, "date": "2025-08-19", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 12, "hWin": 89, "hfts": 0, "hppg": 2.67, "ov25": 64, "pick": "Home Win", "time": "13:15", "tips": "HOME", "un25": 36, "aBtts": 89, "aDraw": 11, "aForm": "WWDWW", "aLost": 33, "h2h_A": 0, "h2h_D": 0, "h2h_H": 100, "hBtts": 33, "hDraw": 0, "hForm": "WLWWW", "hLost": 11, "match": "Bayswater - Stirling Macedonia", "table": "1|5", "cScore": "2:0", "chance": 78, "h2h_GG": 0, "h2h_GP": 1, "h2h_NG": 100, "h2h_OV": 100, "h2h_UN": 0, "league": "NPL-WESTERN-AUSTRALIA", "rating": 61, "awayWin": 8, "country": "AUSTRALIA", "homeWin": 78, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 0, "score12": 0, "score20": 21.21, "score21": 10.1, "likelyCS": "2:0", "agcOver15": 55.56, "agsOver15": 66.67, "hgcOver15": 11.11, "hgsOver15": 100, "oneX2Rate": 61, "cs2Percent": 11, "fullLeague": "AUSTRALIA - NPL-WESTERN-AUSTRALIA", "modelCSPercent": 12, "scorelineCSPercent": 21.21, "predictionValidation": "53.39%"}', '2025-08-19 12:45:08.831888+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('7', '1', '{"gg": 45, "ng": 55, "sn": "16", "acs": 25, "agc": 1.42, "ags": 1.13, "avg": 2.42, "cs2": "1:1", "hcs": 29, "hgc": 1.29, "hgs": 1, "aGrp": "B", "aOv2": 42, "aPts": 4, "aWin": 25, "afts": 33, "appg": 1.04, "date": "2025-08-19", "draw": 29, "flag": "⚠️", "hGrp": "D", "hOv2": 42, "hPts": 6, "hWin": 29, "hfts": 46, "hppg": 1.21, "ov25": 39, "pick": "UN2.5", "time": "20:45", "tips": "AWAY", "un25": 61, "aBtts": 46, "aDraw": 29, "aForm": "LLWDL", "aLost": 46, "h2h_A": 100, "h2h_D": 0, "h2h_H": 0, "hBtts": 46, "hDraw": 33, "hForm": "DDWDL", "hLost": 38, "match": "Northampton - Lincoln", "table": "21|11", "cScore": "0:1", "chance": 61, "h2h_GG": 50, "h2h_GP": 2, "h2h_NG": 50, "h2h_OV": 50, "h2h_UN": 50, "league": "LEAGUE-ONE", "rating": 58, "awayWin": 42, "country": "ENGLAND", "homeWin": 30, "score00": 18.42, "score01": 6.08, "score02": 12.33, "score10": 4.08, "score11": 10.25, "score12": 6.17, "score20": 4, "score21": 12.25, "likelyCS": "0:0", "agcOver15": 41.67, "agsOver15": 33.33, "hgcOver15": 37.5, "hgsOver15": 29.17, "oneX2Rate": 31, "cs2Percent": 13, "fullLeague": "ENGLAND - LEAGUE-ONE", "modelCSPercent": 13, "scorelineCSPercent": 18.42, "predictionValidation": "44.13%"}', '2025-08-19 12:45:39.993424+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('8', '1', '{"gg": 47, "ng": 53, "sn": "2", "acs": 0, "agc": 1.67, "ags": 2.22, "avg": 3.56, "cs2": "3:0", "hcs": 67, "hgc": 0.56, "hgs": 2.67, "aGrp": "C", "aOv2": 89, "aPts": 13, "aWin": 56, "afts": 11, "appg": 1.78, "date": "2025-08-19", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 12, "hWin": 89, "hfts": 0, "hppg": 2.67, "ov25": 64, "pick": "Home Win", "time": "13:15", "tips": "HOME", "un25": 36, "aBtts": 89, "aDraw": 11, "aForm": "WWDWW", "aLost": 33, "hBtts": 33, "hDraw": 0, "hForm": "WLWWW", "hLost": 11, "match": "Bayswater - Stirling Macedonia", "table": "1|5", "cScore": "2:0", "chance": 78, "league": "NPL-WESTERN-AUSTRALIA", "rating": 61, "awayWin": 8, "country": "AUSTRALIA", "homeWin": 78, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 0, "score12": 0, "score20": 21.21, "score21": 10.1, "likelyCS": "2:0", "agcOver15": 55.56, "agsOver15": 66.67, "hgcOver15": 11.11, "hgsOver15": 100, "oneX2Rate": 61, "cs2Percent": 11, "fullLeague": "AUSTRALIA - NPL-WESTERN-AUSTRALIA", "modelCSPercent": 12, "scorelineCSPercent": 21.21, "predictionValidation": "53.39%"}', '2025-08-19 14:31:54.193961+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('9', '1', '{"gg": 53, "ng": 47, "sn": "21", "acs": 32, "agc": 1.14, "ags": 1.45, "avg": 2.77, "cs2": "0:1", "hcs": 18, "hgc": 1.5, "hgs": 1.45, "aGrp": "C", "aOv2": 32, "aPts": 8, "aWin": 45, "afts": 18, "appg": 1.68, "date": "2025-08-19", "draw": 24, "flag": "✅", "hGrp": "C", "hOv2": 45, "hPts": 6, "hWin": 36, "hfts": 14, "hppg": 1.45, "ov25": 51, "pick": "GG", "time": "20:45", "tips": "DRAW", "un25": 49, "aBtts": 55, "aDraw": 32, "aForm": "LDWDW", "aLost": 23, "hBtts": 73, "hDraw": 36, "hForm": "WLLWL", "hLost": 27, "match": "Hyde - Guiseley", "table": "11|12", "cScore": "1:1", "chance": 53, "league": "NPL-PREMIER-DIVISION", "rating": 64, "awayWin": 51, "country": "ENGLAND", "homeWin": 24, "score00": 4.45, "score01": 2.17, "score02": 4.45, "score10": 8.89, "score11": 24.6, "score12": 6.62, "score20": 8.79, "score21": 2.27, "likelyCS": "1:1", "agcOver15": 36.36, "agsOver15": 40.91, "hgcOver15": 36.36, "hgsOver15": 36.36, "oneX2Rate": 34, "cs2Percent": 11, "fullLeague": "ENGLAND - NPL-PREMIER-DIVISION", "modelCSPercent": 12, "scorelineCSPercent": 24.6, "predictionValidation": "2.45%"}', '2025-08-19 14:32:09.314157+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('10', '1', '{"gg": 47, "ng": 53, "sn": "2", "acs": 0, "agc": 1.67, "ags": 2.22, "avg": 3.56, "cs2": "3:0", "hcs": 67, "hgc": 0.56, "hgs": 2.67, "aGrp": "C", "aOv2": 89, "aPts": 13, "aWin": 56, "afts": 11, "appg": 1.78, "date": "2025-08-19", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 12, "hWin": 89, "hfts": 0, "hppg": 2.67, "ov25": 64, "pick": "Home Win", "time": "13:15", "tips": "HOME", "un25": 36, "aBtts": 89, "aDraw": 11, "aForm": "WWDWW", "aLost": 33, "hBtts": 33, "hDraw": 0, "hForm": "WLWWW", "hLost": 11, "match": "Bayswater - Stirling Macedonia", "table": "1|5", "cScore": "2:0", "chance": 78, "league": "NPL-WESTERN-AUSTRALIA", "rating": 61, "awayWin": 8, "country": "AUSTRALIA", "homeWin": 78, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 0, "score12": 0, "score20": 21.21, "score21": 10.1, "likelyCS": "2:0", "agcOver15": 55.56, "agsOver15": 66.67, "hgcOver15": 11.11, "hgsOver15": 100, "oneX2Rate": 61, "cs2Percent": 11, "fullLeague": "AUSTRALIA - NPL-WESTERN-AUSTRALIA", "modelCSPercent": 12, "scorelineCSPercent": 21.21, "predictionValidation": "53.39%"}', '2025-08-19 14:34:03.42555+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('11', '1', '{"gg": 47, "ng": 53, "sn": "2", "acs": 0, "agc": 1.67, "ags": 2.22, "avg": 3.56, "cs2": "3:0", "hcs": 67, "hgc": 0.56, "hgs": 2.67, "aGrp": "C", "aOv2": 89, "aPts": 13, "aWin": 56, "afts": 11, "appg": 1.78, "date": "2025-08-19", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 12, "hWin": 89, "hfts": 0, "hppg": 2.67, "ov25": 64, "pick": "Home Win", "time": "13:15", "tips": "HOME", "un25": 36, "aBtts": 89, "aDraw": 11, "aForm": "WWDWW", "aLost": 33, "hBtts": 33, "hDraw": 0, "hForm": "WLWWW", "hLost": 11, "match": "Bayswater - Stirling Macedonia", "table": "1|5", "cScore": "2:0", "chance": 78, "league": "NPL-WESTERN-AUSTRALIA", "rating": 61, "awayWin": 8, "country": "AUSTRALIA", "homeWin": 78, "score00": 0, "score01": 0, "score02": 0, "score10": 0, "score11": 0, "score12": 0, "score20": 21.21, "score21": 10.1, "likelyCS": "2:0", "agcOver15": 55.56, "agsOver15": 66.67, "hgcOver15": 11.11, "hgsOver15": 100, "oneX2Rate": 61, "cs2Percent": 11, "fullLeague": "AUSTRALIA - NPL-WESTERN-AUSTRALIA", "modelCSPercent": 12, "scorelineCSPercent": 21.21, "predictionValidation": "53.39%"}', '2025-08-19 14:36:32.709546+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('13', '1', '{"gg": 52, "ng": 48, "sn": "14", "acs": 44, "agc": 1.33, "ags": 1.56, "avg": 3.57, "cs2": "0:3", "hcs": 0, "hgc": 3.38, "hgs": 0.88, "aGrp": "D", "aOv2": 33, "aPts": 7, "aWin": 33, "afts": 11, "appg": 1.44, "date": "2026-02-15", "draw": 12, "flag": "✅", "hGrp": "E", "hOv2": 75, "hPts": 1, "hWin": 0, "hfts": 38, "hppg": 0.13, "ov25": 72, "pick": "Away Win", "time": "12:00", "tips": "AWAY", "un25": 28, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 56, "aDraw": 44, "aForm": "LWLDW", "aLost": 22, "hBtts": 63, "hDraw": 13, "hForm": "LDLLL", "hLost": 88, "match": "Dangkor - Tiffy Army", "table": "11|8", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "0:2", "chance": 77, "league": "Cpl", "rating": 60, "awayWin": 77, "country": "Cambodia", "ftScore": "", "homeWin": 7, "score00": 0, "score01": 12.5, "score02": 5.56, "score10": 0, "score11": 5.56, "score12": 6.25, "score20": 0, "score21": 5.56, "A_Recent": "2026-02-07 Tiffy Army - Kirivong Sok Sen Chey 0 : 4,2026-02-01 Svay Rieng - Tiffy Army 6 : 3,2026-01-24 Tiffy Army - Moi Kompong Dewa 0 : 3,2026-01-18 Life FC - Tiffy Army 0 : 3,2026-01-04 Tiffy Army - Boeung Ket 0 : 6", "H_Recent": "2026-02-08 Svay Rieng - Dangkor 1 : 0,2026-02-01 Phnom Penh Crown - Dangkor 1 : 0,2026-01-24 Life FC - Dangkor 2 : 1,2026-01-17 Dangkor - Visakha 1 : 8,2026-01-11 Boeung Ket - Dangkor 3 : 1", "likelyCS": "0:1", "agcOver15": 22.22, "agsOver15": 44.44, "hgcOver15": 75, "hgsOver15": 25, "oneX2Rate": 60, "H2H_Recent": "2025-11-02 Tiffy Army - Dangkor 1 : 3,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 10, "fullLeague": "Cambodia - Cpl", "modelCSPercent": 10, "scorelineCSPercent": 12.5, "predictionValidation": "85.92%"}', '2026-02-15 11:21:16.982982+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('14', '1', '{"gg": 13, "ng": 87, "sn": "50", "acs": 67, "agc": 0.5, "ags": 1.17, "avg": 2.77, "cs2": "0:2", "hcs": 0, "hgc": 3.5, "hgs": 0.38, "aGrp": "B", "aOv2": 17, "aPts": 9, "aWin": 67, "afts": 33, "appg": 2, "date": "2026-02-15", "draw": 4, "flag": "✅", "hGrp": "E", "hOv2": 63, "hPts": 0, "hWin": 0, "hfts": 63, "hppg": 0, "ov25": 70, "pick": "Away Win", "time": "13:15", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 0, "aDraw": 0, "aForm": "LWWLW", "aLost": 33, "hBtts": 38, "hDraw": 0, "hForm": "LLLLL", "hLost": 100, "match": "Racing - Jwayya", "table": "12|4", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 100, "H2H_UN": 0, "cScore": "0:3", "chance": 84, "league": "Premier League", "rating": 83, "awayWin": 84, "country": "Lebanon", "ftScore": "", "homeWin": 1, "score00": 14.29, "score01": 20.54, "score02": 12.5, "score10": 0, "score11": 0, "score12": 0, "score20": 7.14, "score21": 7.14, "A_Recent": "2026-02-06 Jwayya - Al Ahed 0 : 1,2026-02-01 Jwayya - Al Riyadi Abbasiyah 0 : 0,2025-12-26 Al Sahel - Jwayya 2 : 0,2025-12-21 Safa - Jwayya 0 : 1,2025-12-14 Jwayya - Al Ansar 0 : 1", "H_Recent": "2026-02-08 Racing - Al Ansar 0 : 6,2026-02-01 Racing - Al Ahed 0 : 2,2026-01-23 Racing - Al Hikma 0 : 2,2025-12-28 Racing - Al Riyadi Abbasiyah 1 : 3,2025-12-20 Racing - Nejmeh SC 1 : 4", "likelyCS": "0:1", "agcOver15": 16.67, "agsOver15": 33.33, "hgcOver15": 87.5, "hgsOver15": 0, "oneX2Rate": 83, "H2H_Recent": "2025-10-18 Jwayya - Racing 7 : 0,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 16, "fullLeague": "Lebanon - Premier League", "modelCSPercent": 19, "scorelineCSPercent": 20.54, "predictionValidation": "100.86%"}', '2026-02-15 11:46:27.594007+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('15', '1', '{"gg": 13, "ng": 87, "sn": "50", "acs": 67, "agc": 0.5, "ags": 1.17, "avg": 2.77, "cs2": "0:2", "hcs": 0, "hgc": 3.5, "hgs": 0.38, "aGrp": "B", "aOv2": 17, "aPts": 9, "aWin": 67, "afts": 33, "appg": 2, "date": "2026-02-15", "draw": 4, "flag": "✅", "hGrp": "E", "hOv2": 63, "hPts": 0, "hWin": 0, "hfts": 63, "hppg": 0, "ov25": 70, "pick": "Away Win", "time": "13:15", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 0, "aDraw": 0, "aForm": "LWWLW", "aLost": 33, "hBtts": 38, "hDraw": 0, "hForm": "LLLLL", "hLost": 100, "match": "Racing - Jwayya", "table": "12|4", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 100, "H2H_UN": 0, "cScore": "0:3", "chance": 84, "league": "Premier League", "rating": 83, "awayWin": 84, "country": "Lebanon", "ftScore": "", "homeWin": 1, "score00": 14.29, "score01": 20.54, "score02": 12.5, "score10": 0, "score11": 0, "score12": 0, "score20": 7.14, "score21": 7.14, "A_Recent": "2026-02-06 Jwayya - Al Ahed 0 : 1,2026-02-01 Jwayya - Al Riyadi Abbasiyah 0 : 0,2025-12-26 Al Sahel - Jwayya 2 : 0,2025-12-21 Safa - Jwayya 0 : 1,2025-12-14 Jwayya - Al Ansar 0 : 1", "H_Recent": "2026-02-08 Racing - Al Ansar 0 : 6,2026-02-01 Racing - Al Ahed 0 : 2,2026-01-23 Racing - Al Hikma 0 : 2,2025-12-28 Racing - Al Riyadi Abbasiyah 1 : 3,2025-12-20 Racing - Nejmeh SC 1 : 4", "likelyCS": "0:1", "agcOver15": 16.67, "agsOver15": 33.33, "hgcOver15": 87.5, "hgsOver15": 0, "oneX2Rate": 83, "H2H_Recent": "2025-10-18 Jwayya - Racing 7 : 0,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 16, "fullLeague": "Lebanon - Premier League", "modelCSPercent": 19, "scorelineCSPercent": 20.54, "predictionValidation": "100.86%"}', '2026-02-15 11:46:40.01071+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('16', '1', '{"gg": 52, "ng": 48, "sn": "14", "acs": 44, "agc": 1.33, "ags": 1.56, "avg": 3.57, "cs2": "0:3", "hcs": 0, "hgc": 3.38, "hgs": 0.88, "aGrp": "D", "aOv2": 33, "aPts": 7, "aWin": 33, "afts": 11, "appg": 1.44, "date": "2026-02-15", "draw": 12, "flag": "✅", "hGrp": "E", "hOv2": 75, "hPts": 1, "hWin": 0, "hfts": 38, "hppg": 0.13, "ov25": 72, "pick": "Away Win", "time": "12:00", "tips": "AWAY", "un25": 28, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 56, "aDraw": 44, "aForm": "LWLDW", "aLost": 22, "hBtts": 63, "hDraw": 13, "hForm": "LDLLL", "hLost": 88, "match": "Dangkor - Tiffy Army", "table": "11|8", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "0:2", "chance": 77, "league": "Cpl", "rating": 60, "awayWin": 77, "country": "Cambodia", "ftScore": "", "homeWin": 7, "score00": 0, "score01": 12.5, "score02": 5.56, "score10": 0, "score11": 5.56, "score12": 6.25, "score20": 0, "score21": 5.56, "A_Recent": "2026-02-07 Tiffy Army - Kirivong Sok Sen Chey 0 : 4,2026-02-01 Svay Rieng - Tiffy Army 6 : 3,2026-01-24 Tiffy Army - Moi Kompong Dewa 0 : 3,2026-01-18 Life FC - Tiffy Army 0 : 3,2026-01-04 Tiffy Army - Boeung Ket 0 : 6", "H_Recent": "2026-02-08 Svay Rieng - Dangkor 1 : 0,2026-02-01 Phnom Penh Crown - Dangkor 1 : 0,2026-01-24 Life FC - Dangkor 2 : 1,2026-01-17 Dangkor - Visakha 1 : 8,2026-01-11 Boeung Ket - Dangkor 3 : 1", "likelyCS": "0:1", "agcOver15": 22.22, "agsOver15": 44.44, "hgcOver15": 75, "hgsOver15": 25, "oneX2Rate": 60, "H2H_Recent": "2025-11-02 Tiffy Army - Dangkor 1 : 3,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 10, "fullLeague": "Cambodia - Cpl", "modelCSPercent": 10, "scorelineCSPercent": 12.5, "predictionValidation": "85.92%"}', '2026-02-15 15:29:14.490857+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('17', '1', '{"gg": 52, "ng": 48, "sn": "14", "acs": 44, "agc": 1.33, "ags": 1.56, "avg": 3.57, "cs2": "0:3", "hcs": 0, "hgc": 3.38, "hgs": 0.88, "aGrp": "D", "aOv2": 33, "aPts": 7, "aWin": 33, "afts": 11, "appg": 1.44, "date": "2026-02-15", "draw": 12, "flag": "✅", "hGrp": "E", "hOv2": 75, "hPts": 1, "hWin": 0, "hfts": 38, "hppg": 0.13, "ov25": 72, "pick": "Away Win", "time": "12:00", "tips": "AWAY", "un25": 28, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 56, "aDraw": 44, "aForm": "LWLDW", "aLost": 22, "hBtts": 63, "hDraw": 13, "hForm": "LDLLL", "hLost": 88, "match": "Dangkor - Tiffy Army", "table": "11|8", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "0:2", "chance": 77, "league": "Cpl", "rating": 60, "awayWin": 77, "country": "Cambodia", "ftScore": "", "homeWin": 7, "score00": 0, "score01": 12.5, "score02": 5.56, "score10": 0, "score11": 5.56, "score12": 6.25, "score20": 0, "score21": 5.56, "A_Recent": "2026-02-07 Tiffy Army - Kirivong Sok Sen Chey 0 : 4,2026-02-01 Svay Rieng - Tiffy Army 6 : 3,2026-01-24 Tiffy Army - Moi Kompong Dewa 0 : 3,2026-01-18 Life FC - Tiffy Army 0 : 3,2026-01-04 Tiffy Army - Boeung Ket 0 : 6", "H_Recent": "2026-02-08 Svay Rieng - Dangkor 1 : 0,2026-02-01 Phnom Penh Crown - Dangkor 1 : 0,2026-01-24 Life FC - Dangkor 2 : 1,2026-01-17 Dangkor - Visakha 1 : 8,2026-01-11 Boeung Ket - Dangkor 3 : 1", "likelyCS": "0:1", "agcOver15": 22.22, "agsOver15": 44.44, "hgcOver15": 75, "hgsOver15": 25, "oneX2Rate": 60, "H2H_Recent": "2025-11-02 Tiffy Army - Dangkor 1 : 3,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 10, "fullLeague": "Cambodia - Cpl", "modelCSPercent": 10, "scorelineCSPercent": 12.5, "predictionValidation": "85.92%"}', '2026-02-15 15:59:01.73842+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('18', '1', '{"gg": 43, "ng": 57, "sn": "73", "acs": 30, "agc": 1.41, "ags": 1.19, "avg": 2.94, "cs2": "3:0", "hcs": 48, "hgc": 0.63, "hgs": 2.67, "aGrp": "B", "aOv2": 52, "aPts": 4, "aWin": 33, "afts": 19, "appg": 1.26, "date": "2026-02-15", "draw": 14, "flag": "✅", "hGrp": "A", "hOv2": 67, "hPts": 15, "hWin": 81, "hfts": 4, "hppg": 2.56, "ov25": 62, "pick": "Home Win", "time": "21:30", "tips": "HOME", "un25": 38, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 56, "aDraw": 26, "aForm": "LWLLD", "aLost": 41, "hBtts": 48, "hDraw": 11, "hForm": "WWWWW", "hLost": 7, "match": "Sporting CP - Famalicao", "table": "2|6", "H2H_GG": 33, "H2H_GP": 3, "H2H_NG": 67, "H2H_OV": 33, "H2H_UN": 67, "cScore": "2:0", "chance": 80, "league": "Liga Portugal", "rating": 61, "awayWin": 7, "country": "Portugal", "ftScore": "", "homeWin": 80, "score00": 10.71, "score01": 3.64, "score02": 0, "score10": 5.42, "score11": 9.06, "score12": 8.99, "score20": 14.62, "score21": 5.49, "A_Recent": "2026-02-09 Famalicao - AFS 3 : 1,2026-02-01 Gil Vicente - Famalicao 5 : 0,2026-01-25 Famalicao - Tondela 3 : 0,2026-01-18 Santa Clara - Famalicao 0 : 1,2026-01-04 Alverca - Famalicao 1 : 0", "H_Recent": "2026-02-09 FC Porto - Sporting CP 1 : 1,2026-02-01 Sporting CP - Nacional 2 : 1,2026-01-24 Arouca - Sporting CP 1 : 2,2026-01-16 Sporting CP - Casa Pia 3 : 0,2026-01-02 Gil Vicente - Sporting CP 1 : 1", "likelyCS": "2:0", "agcOver15": 44.44, "agsOver15": 25.93, "hgcOver15": 11.11, "hgsOver15": 81.48, "oneX2Rate": 61, "H2H_Recent": "2025-09-13 Famalicao - Sporting CP 1 : 2,2024-04-16 Famalicao - Sporting CP 0 : 1,2023-08-27 Sporting CP - Famalicao 1 : 0,1899-12-30  -", "cs2Percent": 12, "fullLeague": "Portugal - Liga Portugal", "modelCSPercent": 14, "scorelineCSPercent": 14.62, "predictionValidation": "70.78%"}', '2026-02-15 16:45:26.093397+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('19', '1', '{"gg": 21, "ng": 79, "sn": "20", "acs": 15, "agc": 1.23, "ags": 0.62, "avg": 2.02, "cs2": "0:0", "hcs": 50, "hgc": 0.7, "hgs": 1.5, "aGrp": "E", "aOv2": 23, "aPts": 2, "aWin": 15, "afts": 54, "appg": 0.85, "date": "2026-02-15", "draw": 29, "flag": "✅", "hGrp": "B", "hOv2": 20, "hPts": 10, "hWin": 50, "hfts": 30, "hppg": 1.8, "ov25": 22, "pick": "NG", "time": "15:30", "tips": "HOME", "un25": 78, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 38, "aDraw": 38, "aForm": "DDLLL", "aLost": 46, "hBtts": 30, "hDraw": 30, "hForm": "WWWLD", "hLost": 20, "match": "Liberec - Ostrava", "table": "5|13", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 0, "H2H_UN": 100, "cScore": "1:0", "chance": 79, "league": "Chance Liga", "rating": 66, "awayWin": 10, "country": "Czech-Republic", "ftScore": "", "homeWin": 61, "score00": 8.85, "score01": 7.69, "score02": 13.85, "score10": 5, "score11": 13.85, "score12": 7.69, "score20": 17.69, "score21": 5, "A_Recent": "2026-02-07 Ostrava - Sigma Olomouc 2 : 0,2026-02-01 Slovacko - Ostrava 2 : 2,2025-12-13 Ostrava - FK Pardubice 1 : 4,2025-12-07 Karvina - Ostrava 0 : 0,2025-11-29 Ostrava - Dukla Prague 3 : 1", "H_Recent": "2026-02-08 Plzen - Liberec 3 : 1,2026-02-01 Liberec - Zlin 2 : 0,2025-12-14 Sparta Prague - Liberec 2 : 2,2025-12-06 Dukla Prague - Liberec 1 : 1,2025-11-30 Liberec - Sigma Olomouc 1 : 0", "likelyCS": "2:0", "agcOver15": 30.77, "agsOver15": 15.38, "hgcOver15": 20, "hgsOver15": 40, "oneX2Rate": 48, "H2H_Recent": "2025-09-13 Ostrava - Liberec 0 : 2,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 20, "fullLeague": "Czech-Republic - Chance Liga", "modelCSPercent": 25, "scorelineCSPercent": 17.69, "predictionValidation": "69.15%"}', '2026-02-15 17:03:18.316475+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('20', '1', '{"gg": 67, "ng": 33, "sn": "15", "acs": 27, "agc": 1.55, "ags": 1.91, "avg": 3.32, "cs2": "1:1", "hcs": 26, "hgc": 1.59, "hgs": 1.59, "aGrp": "B", "aOv2": 64, "aPts": 8, "aWin": 36, "afts": 18, "appg": 1.55, "date": "2026-03-18", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 70, "hPts": 3, "hWin": 52, "hfts": 15, "hppg": 1.63, "ov25": 70, "pick": "OV.2.5", "time": "13:00", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 64, "aDraw": 45, "aForm": "DWDLW", "aLost": 18, "hBtts": 59, "hDraw": 7, "hForm": "LLWLL", "hLost": 41, "match": "Pawlowice - Zaglebie II", "table": "16|4", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "1:2", "chance": 70, "league": "Iii Liga Group Iii", "rating": 67, "awayWin": 54, "country": "Poland", "ftScore": "", "homeWin": 25, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 1.85, "score02": 6.85, "score10": 7.41, "score11": 1.85, "score12": 5.56, "score20": 6.85, "score21": 17.41, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-14 Zielona Gora - Zaglebie II 0 : 0,2026-03-08 Zaglebie II - Polkowice 0 : 2,2025-11-30 Stal Jasien - Zaglebie II 0 : 3,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-14 Zaglebie II - Goczalkowice Zdroj 5 : 0", "H_Recent": "2026-03-14 Goczalkowice Zdroj - Pawlowice 3 : 0,2026-03-07 Stal Jasien - Pawlowice 0 : 3,2025-11-29 Woliborz - Pawlowice 1 : 2,2025-11-21 Pawlowice - Gornik Zabrze II 1 : 3,2025-11-15 Pawlowice - Warta Gorzow 0 : 1", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "2:1", "agcOver15": 36.36, "agsOver15": 54.55, "hgcOver15": 44.44, "hgsOver15": 44.44, "oneX2Rate": 39, "H2H_Recent": "2025-08-16 Zaglebie II - Pawlowice 2 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "Moderate", "edgeTier": "THIN", "stability": 0.6572012045832926, "confidence": "High", "modelTrust": 65, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nPawlowice average 1.59 goals scored and 1.59 conceded per home match, while Zaglebie II average 1.91 scored and 1.55 conceded away from home.\n\nPoints-per-game stands at 1.63 for Pawlowice versus 1.55 for Zaglebie II, with recent form returning 3 points from the last five for the home side against 8 for the away side.\n\nThe model prices the primary outcome at 70%, supported by a structural differential of -0.10 and a stability index of 0.66. Momentum is currently classified as balanced momentum, while overall model trust registers at 65%.\n", "tactical": "\nPawlowice''s attacking output of 1.59 goals per match is set against an away concession rate of 1.55, creating an attacking separation of 0.04.\n\nAt the same time, Zaglebie II''s away scoring average of 1.91 is measured against Pawlowice''s home concession rate of 1.59, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 59% for Pawlowice and 64% for Zaglebie II, while Over 2.5 lands 70% and 64% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 26% and 27%, alongside failed-to-score rates of 15% and 18%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nZaglebie II''s away win rate of 36% and Pawlowice''s home draw rate of 7% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 18% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.32, with Over 2.5 at 70% and Under 2.5 at 30%.\n\nOver 1.5 goal occurrence registers 44.44% for Pawlowice and 54.55% for Zaglebie II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 70% probability with a structural rating strength of 67%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:2 (9%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 0.07999999999999985, "formEdge": -0.5, "composite": -0.0956, "attackEdge": 0.040000000000000036, "defensiveEdge": 0.31999999999999984, "cleanSheetEdge": -0.01, "reliabilityEdge": 0.03}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 70, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 70, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 9, "scorelineCSPercent": 17.41, "predictionValidation": "57.72%"}', '2026-03-18 08:28:35.819322+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('21', '1', '{"gg": 40, "ng": 60, "sn": "16", "acs": 50, "agc": 0.7, "ags": 1.9, "avg": 2.74, "cs2": "0:2", "hcs": 30, "hgc": 1.26, "hgs": 1.63, "aGrp": "A", "aOv2": 40, "aPts": 12, "aWin": 80, "afts": 20, "appg": 2.4, "date": "2026-03-18", "draw": 23, "flag": "✅", "hGrp": "D", "hOv2": 67, "hPts": 6, "hWin": 48, "hfts": 15, "hppg": 1.59, "ov25": 43, "pick": "Away Win", "time": "14:00", "tips": "AWAY", "un25": 57, "H2H_A": 0, "H2H_D": 100, "H2H_H": 0, "aBtts": 30, "aDraw": 0, "aForm": "WLWWW", "aLost": 20, "hBtts": 63, "hDraw": 15, "hForm": "LWLWL", "hLost": 37, "match": "Carina Gubin - BKS Sparta Katowice", "table": "11|3", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 0, "H2H_UN": 100, "cScore": "0:1", "chance": 62, "league": "Iii Liga Group Iii", "rating": 59, "awayWin": 62, "country": "Poland", "ftScore": "", "homeWin": 14, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 12.79, "score01": 3.7, "score02": 0, "score10": 10.1, "score11": 10.94, "score12": 7.41, "score20": 6.4, "score21": 10.1, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-13 Polkowice - BKS Sparta Katowice 0 : 4,2026-03-07 BKS Sparta Katowice - Legnica II 2 : 2,2025-11-29 BKS Sparta Katowice - Warta Gorzow 3 : 4,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-16 Stal Jasien - BKS Sparta Katowice 1 : 4", "H_Recent": "2026-03-14 Carina Gubin - Warta Gorzow 1 : 3,2025-11-29 Gornik Zabrze II - Carina Gubin 6 : 0,2025-11-22 Carina Gubin - Skra 1 : 0,2025-11-14 Nysa - Carina Gubin 2 : 2,2025-11-08 Carina Gubin - Starowice Dolne 1 : 3", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "0:0", "agcOver15": 20, "agsOver15": 60, "hgcOver15": 37.04, "hgsOver15": 44.44, "oneX2Rate": 59, "H2H_Recent": "2025-08-16 BKS Sparta Katowice - Carina Gubin 1 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 14, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "High", "edgeTier": "THIN", "stability": 0.5072612239381638, "confidence": "Medium", "modelTrust": 50, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nCarina Gubin average 1.63 goals scored and 1.26 conceded per home match, while BKS Sparta Katowice average 1.90 scored and 0.70 conceded away from home.\n\nPoints-per-game stands at 1.59 for Carina Gubin versus 2.40 for BKS Sparta Katowice, with recent form returning 6 points from the last five for the home side against 12 for the away side.\n\nThe model prices the primary outcome at 62%, supported by a structural differential of -0.17 and a stability index of 0.51. Momentum is currently classified as away momentum, while overall model trust registers at 50%.\n", "tactical": "\nCarina Gubin''s attacking output of 1.63 goals per match is set against an away concession rate of 0.70, creating an attacking separation of 0.93.\n\nAt the same time, BKS Sparta Katowice''s away scoring average of 1.90 is measured against Carina Gubin''s home concession rate of 1.26, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 63% for Carina Gubin and 30% for BKS Sparta Katowice, while Over 2.5 lands 67% and 40% respectively. That combination points toward a balanced tempo game state rather than a random scoring script.\n\nClean-sheet rates of 30% and 50%, alongside failed-to-score rates of 15% and 20%, help explain why the match is currently tagged as defensive stability.\n", "riskReport": "\nRisk is currently classified as high, while volatility is labeled controlled volatility.\n\nDraw pressure sits in the high draw pressure range, with head-to-head draws occurring 100% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nBKS Sparta Katowice''s away win rate of 80% and Carina Gubin''s home draw rate of 15% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 20% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 2.74, with Over 2.5 at 43% and Under 2.5 at 57%.\n\nOver 1.5 goal occurrence registers 44.44% for Carina Gubin and 60% for BKS Sparta Katowice, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 0% and Under 2.5 landing 100% across 1 meetings.\n\nThe broader scoring backdrop is classified as neutral scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Away side to win, currently projecting at 62% probability with a structural rating strength of 59%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 0%, which adds context to the current market angle.\n\nScoreline weighting highlights 0:1 (16%) as the primary script, with 0:2 (14%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": -0.8099999999999998, "formEdge": -0.6, "composite": -0.172, "attackEdge": 0.9299999999999999, "defensiveEdge": 0.6399999999999999, "cleanSheetEdge": -0.2, "reliabilityEdge": 0.05}, "volatility": "Controlled Volatility", "primaryEdge": "Balanced", "probability": 62, "recommendation": {"market": "1X2", "selection": "Away Win", "stakeTier": "Low Exposure", "confidence": 62, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 16, "scorelineCSPercent": 12.79, "predictionValidation": "59.97%"}', '2026-03-18 08:40:16.557825+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('22', '1', '{"gg": 67, "ng": 33, "sn": "15", "acs": 27, "agc": 1.55, "ags": 1.91, "avg": 3.32, "cs2": "1:1", "hcs": 26, "hgc": 1.59, "hgs": 1.59, "aGrp": "B", "aOv2": 64, "aPts": 8, "aWin": 36, "afts": 18, "appg": 1.55, "date": "2026-03-18", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 70, "hPts": 3, "hWin": 52, "hfts": 15, "hppg": 1.63, "ov25": 70, "pick": "OV.2.5", "time": "13:00", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 64, "aDraw": 45, "aForm": "DWDLW", "aLost": 18, "hBtts": 59, "hDraw": 7, "hForm": "LLWLL", "hLost": 41, "match": "Pawlowice - Zaglebie II", "table": "16|4", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "1:2", "chance": 70, "league": "Iii Liga Group Iii", "rating": 67, "awayWin": 54, "country": "Poland", "ftScore": "", "homeWin": 25, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 1.85, "score02": 6.85, "score10": 7.41, "score11": 1.85, "score12": 5.56, "score20": 6.85, "score21": 17.41, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-14 Zielona Gora - Zaglebie II 0 : 0,2026-03-08 Zaglebie II - Polkowice 0 : 2,2025-11-30 Stal Jasien - Zaglebie II 0 : 3,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-14 Zaglebie II - Goczalkowice Zdroj 5 : 0", "H_Recent": "2026-03-14 Goczalkowice Zdroj - Pawlowice 3 : 0,2026-03-07 Stal Jasien - Pawlowice 0 : 3,2025-11-29 Woliborz - Pawlowice 1 : 2,2025-11-21 Pawlowice - Gornik Zabrze II 1 : 3,2025-11-15 Pawlowice - Warta Gorzow 0 : 1", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "2:1", "agcOver15": 36.36, "agsOver15": 54.55, "hgcOver15": 44.44, "hgsOver15": 44.44, "oneX2Rate": 39, "H2H_Recent": "2025-08-16 Zaglebie II - Pawlowice 2 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "Moderate", "edgeTier": "THIN", "stability": 0.6572012045832926, "confidence": "High", "modelTrust": 65, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nPawlowice average 1.59 goals scored and 1.59 conceded per home match, while Zaglebie II average 1.91 scored and 1.55 conceded away from home.\n\nPoints-per-game stands at 1.63 for Pawlowice versus 1.55 for Zaglebie II, with recent form returning 3 points from the last five for the home side against 8 for the away side.\n\nThe model prices the primary outcome at 70%, supported by a structural differential of -0.10 and a stability index of 0.66. Momentum is currently classified as balanced momentum, while overall model trust registers at 65%.\n", "tactical": "\nPawlowice''s attacking output of 1.59 goals per match is set against an away concession rate of 1.55, creating an attacking separation of 0.04.\n\nAt the same time, Zaglebie II''s away scoring average of 1.91 is measured against Pawlowice''s home concession rate of 1.59, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 59% for Pawlowice and 64% for Zaglebie II, while Over 2.5 lands 70% and 64% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 26% and 27%, alongside failed-to-score rates of 15% and 18%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nZaglebie II''s away win rate of 36% and Pawlowice''s home draw rate of 7% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 18% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.32, with Over 2.5 at 70% and Under 2.5 at 30%.\n\nOver 1.5 goal occurrence registers 44.44% for Pawlowice and 54.55% for Zaglebie II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 70% probability with a structural rating strength of 67%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:2 (9%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 0.07999999999999985, "formEdge": -0.5, "composite": -0.0956, "attackEdge": 0.040000000000000036, "defensiveEdge": 0.31999999999999984, "cleanSheetEdge": -0.01, "reliabilityEdge": 0.03}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 70, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 70, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 9, "scorelineCSPercent": 17.41, "predictionValidation": "57.72%"}', '2026-03-18 08:41:51.90788+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('23', '1', '{"gg": 67, "ng": 33, "sn": "15", "acs": 27, "agc": 1.55, "ags": 1.91, "avg": 3.32, "cs2": "1:1", "hcs": 26, "hgc": 1.59, "hgs": 1.59, "aGrp": "B", "aOv2": 64, "aPts": 8, "aWin": 36, "afts": 18, "appg": 1.55, "date": "2026-03-18", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 70, "hPts": 3, "hWin": 52, "hfts": 15, "hppg": 1.63, "ov25": 70, "pick": "OV.2.5", "time": "13:00", "tips": "AWAY", "un25": 30, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 64, "aDraw": 45, "aForm": "DWDLW", "aLost": 18, "hBtts": 59, "hDraw": 7, "hForm": "LLWLL", "hLost": 41, "match": "Pawlowice - Zaglebie II", "table": "16|4", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "1:2", "chance": 70, "league": "Iii Liga Group Iii", "rating": 67, "awayWin": 54, "country": "Poland", "ftScore": "", "homeWin": 25, "o05Odds": 0, "o15Odds": 0, "o25Odds": null, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 1.85, "score02": 6.85, "score10": 7.41, "score11": 1.85, "score12": 5.56, "score20": 6.85, "score21": 17.41, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-03-14 Zielona Gora - Zaglebie II 0 : 0,2026-03-08 Zaglebie II - Polkowice 0 : 2,2025-11-30 Stal Jasien - Zaglebie II 0 : 3,2025-11-21 Zaglebie II - BKS Sparta Katowice 2 : 0,2025-11-14 Zaglebie II - Goczalkowice Zdroj 5 : 0", "H_Recent": "2026-03-14 Goczalkowice Zdroj - Pawlowice 3 : 0,2026-03-07 Stal Jasien - Pawlowice 0 : 3,2025-11-29 Woliborz - Pawlowice 1 : 2,2025-11-21 Pawlowice - Gornik Zabrze II 1 : 3,2025-11-15 Pawlowice - Warta Gorzow 0 : 1", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "2:1", "agcOver15": 36.36, "agsOver15": 54.55, "hgcOver15": 44.44, "hgsOver15": 44.44, "oneX2Rate": 39, "H2H_Recent": "2025-08-16 Zaglebie II - Pawlowice 2 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Iii", "intelligence": {"risk": "Moderate", "edgeTier": "THIN", "stability": 0.6572012045832926, "confidence": "High", "modelTrust": 65, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nPawlowice average 1.59 goals scored and 1.59 conceded per home match, while Zaglebie II average 1.91 scored and 1.55 conceded away from home.\n\nPoints-per-game stands at 1.63 for Pawlowice versus 1.55 for Zaglebie II, with recent form returning 3 points from the last five for the home side against 8 for the away side.\n\nThe model prices the primary outcome at 70%, supported by a structural differential of -0.10 and a stability index of 0.66. Momentum is currently classified as balanced momentum, while overall model trust registers at 65%.\n", "tactical": "\nPawlowice''s attacking output of 1.59 goals per match is set against an away concession rate of 1.55, creating an attacking separation of 0.04.\n\nAt the same time, Zaglebie II''s away scoring average of 1.91 is measured against Pawlowice''s home concession rate of 1.59, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 59% for Pawlowice and 64% for Zaglebie II, while Over 2.5 lands 70% and 64% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 26% and 27%, alongside failed-to-score rates of 15% and 18%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nZaglebie II''s away win rate of 36% and Pawlowice''s home draw rate of 7% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 15% and 18% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.32, with Over 2.5 at 70% and Under 2.5 at 30%.\n\nOver 1.5 goal occurrence registers 44.44% for Pawlowice and 54.55% for Zaglebie II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 70% probability with a structural rating strength of 67%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:2 (9%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 0.07999999999999985, "formEdge": -0.5, "composite": -0.0956, "attackEdge": 0.040000000000000036, "defensiveEdge": 0.31999999999999984, "cleanSheetEdge": -0.01, "reliabilityEdge": 0.03}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 70, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 70, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 9, "scorelineCSPercent": 17.41, "predictionValidation": "57.72%"}', '2026-03-18 08:42:01.760972+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('24', '1', '{"gg": 30, "ng": 70, "sn": "40", "acs": 24, "agc": 1.41, "ags": 0.76, "avg": 2.37, "cs2": "1:0", "hcs": 31, "hgc": 0.94, "hgs": 1.63, "aGrp": "E", "aOv2": 41, "aPts": 3, "aWin": 24, "afts": 53, "appg": 0.88, "date": "2026-04-24", "draw": 18, "flag": "✅", "hGrp": "A", "hOv2": 63, "hPts": 10, "hWin": 69, "hfts": 19, "hppg": 2.31, "ov25": 44, "pick": "Home Win", "time": "20:45", "tips": "HOME", "un25": 56, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 35, "aDraw": 18, "aForm": "LWLLL", "aLost": 59, "hBtts": 63, "hDraw": 25, "hForm": "LWWWD", "hLost": 6, "match": "Napoli - Cremonese", "table": "3|17", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 0, "H2H_UN": 100, "cScore": "2:0", "chance": 76, "league": "Serie A", "rating": 64, "awayWin": 6, "country": "Italy", "ftScore": "", "homeWin": 76, "o05Odds": 0, "o15Odds": 0, "o25Odds": 1.98, "o35Odds": 0, "o45Odds": 0, "score00": 18.75, "score01": 0, "score02": 12.5, "score10": 9.38, "score11": 6.25, "score12": 6.25, "score20": 3.13, "score21": 15.63, "u05Odds": 0, "u15Odds": 0, "u25Odds": 2, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-19 Cremonese - Torino 0 : 0,2026-04-11 Cagliari - Cremonese 1 : 0,2026-04-05 Cremonese - Bologna 1 : 2,2026-03-21 Parma - Cremonese 0 : 2,2026-03-16 Cremonese - Fiorentina 1 : 4", "H_Recent": "2026-04-18 Napoli - Lazio 0 : 2,2026-04-12 Parma - Napoli 1 : 1,2026-04-06 Napoli - AC Milan 1 : 0,2026-03-20 Cagliari - Napoli 0 : 1,2026-03-14 Napoli - Lecce 2 : 1", "awayOdds": 11.5, "drawOdds": 5.4, "homeOdds": 1.37, "likelyCS": "0:0", "agcOver15": 29.41, "agsOver15": 23.53, "hgcOver15": 25, "hgsOver15": 62.5, "oneX2Rate": 64, "H2H_Recent": "2025-12-28 Cremonese - Napoli 0 : 2,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 18, "fullLeague": "Italy - Serie A", "intelligence": {"risk": "High", "guide": "HOME WIN", "edgeTier": "THIN", "stability": 0.4981200446988766, "confidence": "High", "modelTrust": 80, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nNapoli average 1.63 goals scored and 0.94 conceded per home match, while Cremonese average 0.76 scored and 1.41 conceded away from home.\n\nPoints-per-game stands at 2.31 for Napoli versus 0.88 for Cremonese, with recent form returning 10 points from the last five for the home side against 3 for the away side.\n\nThe model prices the primary outcome at 76%, supported by a structural differential of 0.63 and a stability index of 0.50. Momentum is currently classified as home momentum, while overall model trust registers at 80%.\n", "tactical": "\nNapoli''s attacking output of 1.63 goals per match is set against an away concession rate of 1.41, creating an attacking separation of 0.22.\n\nAt the same time, Cremonese''s away scoring average of 0.76 is measured against Napoli''s home concession rate of 0.94, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 63% for Napoli and 35% for Cremonese, while Over 2.5 lands 63% and 41% respectively. That combination points toward a balanced tempo game state rather than a random scoring script.\n\nClean-sheet rates of 31% and 24%, alongside failed-to-score rates of 19% and 53%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as high, while volatility is labeled controlled volatility.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nCremonese''s away win rate of 24% and Napoli''s home draw rate of 25% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 19% and 53% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 2.37, with Over 2.5 at 44% and Under 2.5 at 56%.\n\nOver 1.5 goal occurrence registers 62.5% for Napoli and 23.53% for Cremonese, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 0% and Under 2.5 landing 100% across 1 meetings.\n\nThe broader scoring backdrop is classified as neutral scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Home side to win, currently projecting at 76% probability with a structural rating strength of 64%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 0% while Over 2.5 has occurred 0%, which adds context to the current market angle.\n\nScoreline weighting highlights 2:0 (18%) as the primary script, with 1:0 (18%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 73% and a projected surplus of 3 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 1.4300000000000002, "formEdge": 0.7, "composite": 0.6344000000000001, "attackEdge": 0.21999999999999997, "defensiveEdge": -0.17999999999999994, "cleanSheetEdge": 0.07, "reliabilityEdge": 0.34}, "volatility": "Controlled Volatility", "primaryEdge": "Home Edge", "probability": 76, "recommendation": {"market": "1X2", "selection": "Home Win", "stakeTier": "Low Exposure", "confidence": 76, "expectedValue": 3, "marketProbability": 73}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 18, "scorelineCSPercent": 18.75, "predictionValidation": "67.72%"}', '2026-04-24 15:00:48.17625+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('25', '1', '{"gg": 64, "ng": 36, "sn": "13", "acs": 17, "agc": 1.63, "ags": 1.13, "avg": 2.68, "cs2": "1:2", "hcs": 30, "hgc": 1.26, "hgs": 1.35, "aGrp": "B", "aOv2": 63, "aPts": 6, "aWin": 21, "afts": 25, "appg": 0.83, "date": "2026-04-25", "draw": 23, "flag": "✅", "hGrp": "C", "hOv2": 52, "hPts": 9, "hWin": 39, "hfts": 17, "hppg": 1.48, "ov25": 62, "pick": "GG", "time": "07:00", "tips": "DRAW", "un25": 38, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 63, "aDraw": 21, "aForm": "LLWLW", "aLost": 58, "hBtts": 61, "hDraw": 30, "hForm": "WWWLL", "hLost": 30, "match": "Shimizu S-Pulse - Nagoya Grampus", "table": "12|7", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 0, "H2H_UN": 100, "cScore": "1:1", "chance": 64, "league": "J1 League", "rating": 62, "awayWin": 43, "country": "Japan", "ftScore": "", "homeWin": 34, "o05Odds": 0, "o15Odds": 0, "o25Odds": 0, "o35Odds": 0, "o45Odds": 0, "score00": 8.35, "score01": 0, "score02": 4.17, "score10": 8.35, "score11": 12.7, "score12": 12.52, "score20": 6.35, "score21": 12.17, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-19 Nagoya Grampus - Avispa Fukuoka 3 : 2,2026-04-11 Vissel Kobe - Nagoya Grampus 3 : 2,2026-04-04 Nagoya Grampus - Cerezo Osaka 3 : 0,2026-03-22 Kyoto - Nagoya Grampus 2 : 1,2026-03-18 Nagoya Grampus - Sanfrecce Hiroshima 2 : 1", "H_Recent": "2026-04-11 Sanfrecce Hiroshima - Shimizu S-Pulse 2 : 1,2026-04-05 V-Varen Nagasaki - Shimizu S-Pulse 0 : 3,2026-04-01 Vissel Kobe - Shimizu S-Pulse 2 : 0,2026-03-22 Shimizu S-Pulse - Sanfrecce Hiroshima 3 : 1,2026-03-18 Avispa Fukuoka - Shimizu S-Pulse 1 : 2", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "1:1", "agcOver15": 54.17, "agsOver15": 20.83, "hgcOver15": 39.13, "hgsOver15": 34.78, "oneX2Rate": 26, "H2H_Recent": "2026-02-08 Nagoya Grampus - Shimizu S-Pulse 1 : 0,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 9, "fullLeague": "Japan - J1 League", "intelligence": {"risk": "Moderate", "guide": "GG", "edgeTier": "MEASURED", "stability": 0.6098425601770393, "confidence": "High", "modelTrust": 76, "narratives": {"overview": "\nThis fixture presents a measurable structural lean.\n\nShimizu S-Pulse average 1.35 goals scored and 1.26 conceded per home match, while Nagoya Grampus average 1.13 scored and 1.63 conceded away from home.\n\nPoints-per-game stands at 1.48 for Shimizu S-Pulse versus 0.83 for Nagoya Grampus, with recent form returning 9 points from the last five for the home side against 6 for the away side.\n\nThe model prices the primary outcome at 64%, supported by a structural differential of 0.20 and a stability index of 0.61. Momentum is currently classified as balanced momentum, while overall model trust registers at 76%.\n", "tactical": "\nShimizu S-Pulse''s attacking output of 1.35 goals per match is set against an away concession rate of 1.63, creating an attacking separation of -0.28.\n\nAt the same time, Nagoya Grampus''s away scoring average of 1.13 is measured against Shimizu S-Pulse''s home concession rate of 1.26, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 61% for Shimizu S-Pulse and 63% for Nagoya Grampus, while Over 2.5 lands 52% and 63% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 30% and 17%, alongside failed-to-score rates of 17% and 25%, help explain why the match is currently tagged as balanced defence.\n", "riskReport": "\nRisk is currently classified as moderate, while volatility is labeled controlled volatility.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nNagoya Grampus''s away win rate of 21% and Shimizu S-Pulse''s home draw rate of 30% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 17% and 25% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 2.68, with Over 2.5 at 62% and Under 2.5 at 38%.\n\nOver 1.5 goal occurrence registers 34.78% for Shimizu S-Pulse and 20.83% for Nagoya Grampus, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 0% and Under 2.5 landing 100% across 1 meetings.\n\nThe broader scoring backdrop is classified as neutral scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Both Teams To Score, currently projecting at 64% probability with a structural rating strength of 62%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 0% while Over 2.5 has occurred 0%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:1 (10%) as the primary script, with 1:2 (9%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. The edge is visible but requires controlled positioning due to moderate variance exposure.\n"}, "structural": {"ppgEdge": 0.65, "formEdge": 0.3, "composite": 0.19620000000000007, "attackEdge": -0.2799999999999998, "defensiveEdge": -0.13000000000000012, "cleanSheetEdge": 0.13, "reliabilityEdge": 0.08}, "volatility": "Controlled Volatility", "primaryEdge": "Balanced", "probability": 64, "recommendation": {"market": "BTTS", "selection": "Both Teams To Score", "stakeTier": "Low Exposure", "confidence": 64, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 10, "scorelineCSPercent": 12.7, "predictionValidation": "2.44%"}', '2026-04-25 15:09:46.056362+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('26', '1', '{"gg": 64, "ng": 36, "sn": "143", "acs": 15, "agc": 1.62, "ags": 2.08, "avg": 4.08, "cs2": "1:1", "hcs": 15, "hgc": 1.92, "hgs": 2.54, "aGrp": "B", "aOv2": 69, "aPts": 4, "aWin": 46, "afts": 23, "appg": 1.54, "date": "2026-04-25", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 92, "hPts": 6, "hWin": 31, "hfts": 0, "hppg": 1.08, "ov25": 69, "pick": "OV.2.5", "time": "12:00", "tips": "HOME", "un25": 31, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 69, "aDraw": 15, "aForm": "LWLDL", "aLost": 38, "hBtts": 85, "hDraw": 15, "hForm": "LLWLW", "hLost": 54, "match": "Pogon Szczecin II - Lech Poznan II", "table": "16|5", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:1", "chance": 69, "league": "Iii Liga Group Ii", "rating": 81, "awayWin": 20, "country": "Poland", "ftScore": "2:2", "homeWin": 60, "o05Odds": 0, "o15Odds": 0, "o25Odds": 0, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 0, "score02": 3.57, "score10": 0, "score11": 14.56, "score12": 18.68, "score20": 3.57, "score21": 7.14, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-19 Lech Poznan II - Swinoujscie 3 : 1,2026-04-15 Notec Czarnkow - Lech Poznan II 2 : 1,2026-04-10 Wda Swiecie - Lech Poznan II 2 : 3,2026-04-04 Lech Poznan II - Blekitni Stargard 1 : 1,2026-03-21 Lech Poznan II - Sroda 1 : 1", "H_Recent": "2026-04-18 Lipno Steszew - Pogon Szczecin II 1 : 0,2026-04-15 Pogon Szczecin II - Luzino 1 : 2,2026-04-12 Pogon Szczecin II - Wrzesnia 1 : 2,2026-04-03 Unia Swarzedz - Pogon Szczecin II 1 : 0,2026-03-22 Pogon Szczecin II - Blekitni Stargard 3 : 0", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "1:2", "agcOver15": 46.15, "agsOver15": 61.54, "hgcOver15": 61.54, "hgsOver15": 69.23, "oneX2Rate": 35, "H2H_Recent": "2025-10-04 Lech Poznan II - Pogon Szczecin II 3 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Ii", "intelligence": {"risk": "Low", "guide": "OV.2.5", "edgeTier": "MEASURED", "stability": 0.6963530524041059, "confidence": "Elite", "modelTrust": 77, "narratives": {"overview": "\nThis fixture presents a measurable structural lean.\n\nPogon Szczecin II average 2.54 goals scored and 1.92 conceded per home match, while Lech Poznan II average 2.08 scored and 1.62 conceded away from home.\n\nPoints-per-game stands at 1.08 for Pogon Szczecin II versus 1.54 for Lech Poznan II, with recent form returning 6 points from the last five for the home side against 4 for the away side.\n\nThe model prices the primary outcome at 69%, supported by a structural differential of 0.17 and a stability index of 0.70. Momentum is currently classified as balanced momentum, while overall model trust registers at 77%.\n", "tactical": "\nPogon Szczecin II''s attacking output of 2.54 goals per match is set against an away concession rate of 1.62, creating an attacking separation of 0.92.\n\nAt the same time, Lech Poznan II''s away scoring average of 2.08 is measured against Pogon Szczecin II''s home concession rate of 1.92, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 85% for Pogon Szczecin II and 69% for Lech Poznan II, while Over 2.5 lands 92% and 69% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 15% and 15%, alongside failed-to-score rates of 0% and 23%, help explain why the match is currently tagged as defensive instability.\n", "riskReport": "\nRisk is currently classified as low, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nLech Poznan II''s away win rate of 46% and Pogon Szczecin II''s home draw rate of 15% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 0% and 23% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 4.08, with Over 2.5 at 69% and Under 2.5 at 31%.\n\nOver 1.5 goal occurrence registers 69.23% for Pogon Szczecin II and 61.54% for Lech Poznan II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 69% probability with a structural rating strength of 81%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 2:1 (10%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. The edge is visible but requires controlled positioning due to moderate variance exposure.\n"}, "structural": {"ppgEdge": -0.45999999999999996, "formEdge": 0.2, "composite": 0.16819999999999996, "attackEdge": 0.9199999999999999, "defensiveEdge": 0.16000000000000014, "cleanSheetEdge": 0, "reliabilityEdge": 0.23}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 69, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 69, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 10, "scorelineCSPercent": 18.68, "predictionValidation": "51.97%"}', '2026-04-25 18:09:49.037817+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('27', '1', '{"gg": 64, "ng": 36, "sn": "143", "acs": 15, "agc": 1.62, "ags": 2.08, "avg": 4.08, "cs2": "1:1", "hcs": 15, "hgc": 1.92, "hgs": 2.54, "aGrp": "B", "aOv2": 69, "aPts": 4, "aWin": 46, "afts": 23, "appg": 1.54, "date": "2026-04-25", "draw": 20, "flag": "✅", "hGrp": "E", "hOv2": 92, "hPts": 6, "hWin": 31, "hfts": 0, "hppg": 1.08, "ov25": 69, "pick": "OV.2.5", "time": "12:00", "tips": "HOME", "un25": 31, "H2H_A": 100, "H2H_D": 0, "H2H_H": 0, "aBtts": 69, "aDraw": 15, "aForm": "LWLDL", "aLost": 38, "hBtts": 85, "hDraw": 15, "hForm": "LLWLW", "hLost": 54, "match": "Pogon Szczecin II - Lech Poznan II", "table": "16|5", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:1", "chance": 69, "league": "Iii Liga Group Ii", "rating": 81, "awayWin": 20, "country": "Poland", "ftScore": "2:2", "homeWin": 60, "o05Odds": 0, "o15Odds": 0, "o25Odds": 0, "o35Odds": 0, "o45Odds": 0, "score00": 0, "score01": 0, "score02": 3.57, "score10": 0, "score11": 14.56, "score12": 18.68, "score20": 3.57, "score21": 7.14, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-19 Lech Poznan II - Swinoujscie 3 : 1,2026-04-15 Notec Czarnkow - Lech Poznan II 2 : 1,2026-04-10 Wda Swiecie - Lech Poznan II 2 : 3,2026-04-04 Lech Poznan II - Blekitni Stargard 1 : 1,2026-03-21 Lech Poznan II - Sroda 1 : 1", "H_Recent": "2026-04-18 Lipno Steszew - Pogon Szczecin II 1 : 0,2026-04-15 Pogon Szczecin II - Luzino 1 : 2,2026-04-12 Pogon Szczecin II - Wrzesnia 1 : 2,2026-04-03 Unia Swarzedz - Pogon Szczecin II 1 : 0,2026-03-22 Pogon Szczecin II - Blekitni Stargard 3 : 0", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "1:2", "agcOver15": 46.15, "agsOver15": 61.54, "hgcOver15": 61.54, "hgsOver15": 69.23, "oneX2Rate": 35, "H2H_Recent": "2025-10-04 Lech Poznan II - Pogon Szczecin II 3 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 8, "fullLeague": "Poland - Iii Liga Group Ii", "intelligence": {"risk": "Low", "guide": "OV.2.5", "edgeTier": "MEASURED", "stability": 0.6963530524041059, "confidence": "Elite", "modelTrust": 77, "narratives": {"overview": "\nThis fixture presents a measurable structural lean.\n\nPogon Szczecin II average 2.54 goals scored and 1.92 conceded per home match, while Lech Poznan II average 2.08 scored and 1.62 conceded away from home.\n\nPoints-per-game stands at 1.08 for Pogon Szczecin II versus 1.54 for Lech Poznan II, with recent form returning 6 points from the last five for the home side against 4 for the away side.\n\nThe model prices the primary outcome at 69%, supported by a structural differential of 0.17 and a stability index of 0.70. Momentum is currently classified as balanced momentum, while overall model trust registers at 77%.\n", "tactical": "\nPogon Szczecin II''s attacking output of 2.54 goals per match is set against an away concession rate of 1.62, creating an attacking separation of 0.92.\n\nAt the same time, Lech Poznan II''s away scoring average of 2.08 is measured against Pogon Szczecin II''s home concession rate of 1.92, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 85% for Pogon Szczecin II and 69% for Lech Poznan II, while Over 2.5 lands 92% and 69% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 15% and 15%, alongside failed-to-score rates of 0% and 23%, help explain why the match is currently tagged as defensive instability.\n", "riskReport": "\nRisk is currently classified as low, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nLech Poznan II''s away win rate of 46% and Pogon Szczecin II''s home draw rate of 15% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 0% and 23% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 4.08, with Over 2.5 at 69% and Under 2.5 at 31%.\n\nOver 1.5 goal occurrence registers 69.23% for Pogon Szczecin II and 61.54% for Lech Poznan II, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 100% and Under 2.5 landing 0% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 69% probability with a structural rating strength of 81%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 100% while Over 2.5 has occurred 100%, which adds context to the current market angle.\n\nScoreline weighting highlights 2:1 (10%) as the primary script, with 1:1 (8%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. The edge is visible but requires controlled positioning due to moderate variance exposure.\n"}, "structural": {"ppgEdge": -0.45999999999999996, "formEdge": 0.2, "composite": 0.16819999999999996, "attackEdge": 0.9199999999999999, "defensiveEdge": 0.16000000000000014, "cleanSheetEdge": 0, "reliabilityEdge": 0.23}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 69, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 69, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 10, "scorelineCSPercent": 18.68, "predictionValidation": "51.97%"}', '2026-04-25 18:15:29.186395+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('28', '1', '{"gg": 57, "ng": 43, "sn": "14", "acs": 0, "agc": 1.8, "ags": 0.6, "avg": 3.22, "cs2": "2:1", "hcs": 16, "hgc": 1.92, "hgs": 2.12, "aGrp": "E", "aOv2": 60, "aPts": 0, "aWin": 0, "afts": 40, "appg": 0, "date": "2026-04-25", "draw": 22, "flag": "✅", "hGrp": "C", "hOv2": 72, "hPts": 6, "hWin": 44, "hfts": 20, "hppg": 1.56, "ov25": 59, "pick": "OV.2.5", "time": "08:00", "tips": "DRAW", "un25": 41, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 60, "aDraw": 0, "aForm": "LLLLL", "aLost": 100, "hBtts": 68, "hDraw": 24, "hForm": "LWLWL", "hLost": 32, "match": "Kawasaki Frontale - Chiba", "table": "11|20", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 0, "H2H_UN": 100, "cScore": "1:1", "chance": 59, "league": "J1 League", "rating": 66, "awayWin": 21, "country": "Japan", "ftScore": "2:1", "homeWin": 57, "o05Odds": 0, "o15Odds": 0, "o25Odds": 0, "o35Odds": 0, "o45Odds": 0, "score00": 2, "score01": 12.33, "score02": 10.33, "score10": 0, "score11": 2, "score12": 22.67, "score20": 4, "score21": 12.33, "u05Odds": 0, "u15Odds": 0, "u25Odds": 0, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-18 Verdy - Chiba 1 : 0,2026-04-11 Chiba - Mito 1 : 2,2026-04-04 Chiba - Verdy 3 : 2,2026-03-22 Kashima Antlers - Chiba 2 : 1,2026-03-18 Chiba - FC Tokyo 1 : 2", "H_Recent": "2026-04-18 Yokohama F. Marinos - Kawasaki Frontale 1 : 2,2026-04-12 Kawasaki Frontale - Kashima Antlers 0 : 2,2026-04-05 Kawasaki Frontale - Urawa Reds 3 : 2,2026-03-28 Machida - Kawasaki Frontale 2 : 1,2026-03-22 Kawasaki Frontale - Yokohama F. Marinos 0 : 5", "awayOdds": 0, "drawOdds": 0, "homeOdds": 0, "likelyCS": "1:2", "agcOver15": 80, "agsOver15": 0, "hgcOver15": 60, "hgsOver15": 64, "oneX2Rate": 12, "H2H_Recent": "2026-02-15 Chiba - Kawasaki Frontale 0 : 1,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 10, "fullLeague": "Japan - J1 League", "intelligence": {"risk": "High", "guide": "OV.2.5", "edgeTier": "THIN", "stability": 0.5072363215332693, "confidence": "High", "modelTrust": 61, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nKawasaki Frontale average 2.12 goals scored and 1.92 conceded per home match, while Chiba average 0.60 scored and 1.80 conceded away from home.\n\nPoints-per-game stands at 1.56 for Kawasaki Frontale versus 0.00 for Chiba, with recent form returning 6 points from the last five for the home side against 0 for the away side.\n\nThe model prices the primary outcome at 59%, supported by a structural differential of 0.78 and a stability index of 0.51. Momentum is currently classified as home momentum, while overall model trust registers at 61%.\n", "tactical": "\nKawasaki Frontale''s attacking output of 2.12 goals per match is set against an away concession rate of 1.80, creating an attacking separation of 0.32.\n\nAt the same time, Chiba''s away scoring average of 0.60 is measured against Kawasaki Frontale''s home concession rate of 1.92, which shapes the defensive counter-pressure in this matchup.\n\nBTTS frequencies are 68% for Kawasaki Frontale and 60% for Chiba, while Over 2.5 lands 72% and 60% respectively. That combination points toward a high tempo game state rather than a random scoring script.\n\nClean-sheet rates of 16% and 0%, alongside failed-to-score rates of 20% and 40%, help explain why the match is currently tagged as defensive instability.\n", "riskReport": "\nRisk is currently classified as high, while volatility is labeled high variance fixture.\n\nDraw pressure sits in the low draw pressure range, with head-to-head draws occurring 0% of the time. That creates equilibrium risk if early superiority does not translate into scoreboard control.\n\nChiba''s away win rate of 0% and Kawasaki Frontale''s home draw rate of 24% represent the clearest disruption channels to the primary projection.\n\nFailure-to-score rates of 20% and 40% remain the key suppression indicators that could invalidate more aggressive scoring assumptions.\n", "goalProjection": "\nCombined average goal expectation sits at 3.22, with Over 2.5 at 59% and Under 2.5 at 41%.\n\nOver 1.5 goal occurrence registers 64% for Kawasaki Frontale and 0% for Chiba, which strengthens the floor for baseline scoring expectation.\n\nHead-to-head totals show Over 2.5 landing 0% and Under 2.5 landing 100% across 1 meetings.\n\nThe broader scoring backdrop is classified as elevated scoring environment, so the projected goal output looks more structurally supported than purely variance-driven.\n", "marketAlignment": "\nMarket direction centers on Over 2.5 Goals, currently projecting at 59% probability with a structural rating strength of 66%.\n\nAcross 1 recent head-to-head meetings, BTTS has landed 0% while Over 2.5 has occurred 0%, which adds context to the current market angle.\n\nScoreline weighting highlights 1:1 (10%) as the primary script, with 2:1 (10%) acting as secondary backup.\n\nAgainst listed odds, the model estimates implied probability at 0% and a projected surplus of 0 points. Market efficiency appears tight, and engagement should remain selective.\n"}, "structural": {"ppgEdge": 1.56, "formEdge": 0.6, "composite": 0.7752, "attackEdge": 0.32000000000000006, "defensiveEdge": -1.3199999999999998, "cleanSheetEdge": 0.16, "reliabilityEdge": 0.2}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 59, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 59, "expectedValue": 0, "marketProbability": null}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 10, "scorelineCSPercent": 22.67, "predictionValidation": "3.50%"}', '2026-04-25 18:35:03.603207+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('29', '1', '{"gg": 28, "ng": 72, "sn": "6", "acs": 23, "agc": 1.59, "ags": 0.77, "avg": 2.57, "cs2": "1:0", "hcs": 32, "hgc": 1.09, "hgs": 1.68, "aGrp": "E", "aOv2": 45, "aPts": 3, "aWin": 23, "afts": 50, "appg": 0.82, "date": "2026-04-28", "draw": 16, "flag": "✅", "hGrp": "A", "hOv2": 59, "hPts": 12, "hWin": 59, "hfts": 14, "hppg": 1.95, "ov25": 46, "pick": "Home Win", "time": "20:45", "tips": "HOME", "un25": 54, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 32, "aDraw": 14, "aForm": "LLWLL", "aLost": 64, "hBtts": 59, "hDraw": 18, "hForm": "WLWWW", "hLost": 23, "match": "Stockport County - Port Vale", "table": "4|23", "H2H_GG": 0, "H2H_GP": 1, "H2H_NG": 100, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:0", "chance": 78, "league": "League One", "rating": 61, "awayWin": 5, "country": "England", "ftScore": "", "homeWin": 78, "o05Odds": 0, "o15Odds": 0, "o25Odds": 1.7, "o35Odds": 0, "o45Odds": 0, "score00": 15.91, "score01": 11.36, "score02": 2.27, "score10": 11.36, "score11": 11.36, "score12": 6.82, "score20": 2.27, "score21": 9.09, "u05Odds": 0, "u15Odds": 0, "u25Odds": 2.25, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-25 Plymouth - Port Vale 2 : 1,2026-04-22 Cardiff - Port Vale 1 : 0,2026-04-19 Port Vale - Wigan 0 : 0,2026-04-16 Peterborough - Port Vale 1 : 3,2026-04-14 Port Vale - Barnsley 0 : 0", "H_Recent": "2026-04-25 Stockport County - Peterborough 3 : 1,2026-04-21 Stockport County - Mansfield 0 : 1,2026-04-18 Exeter - Stockport County 3 : 3,2026-04-15 AFC Wimbledon - Stockport County 0 : 2,2026-04-06 Bolton - Stockport County 2 : 2", "awayOdds": 7.6, "drawOdds": 4.8, "homeOdds": 1.44, "likelyCS": "0:0", "agcOver15": 40.91, "agsOver15": 22.73, "hgcOver15": 31.82, "hgsOver15": 45.45, "oneX2Rate": 61, "H2H_Recent": "2025-10-27 Port Vale - Stockport County 0 : 3,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 17, "fullLeague": "England - League One", "intelligence": {"risk": "High", "guide": "HOME WIN", "edgeTier": "THIN", "stability": 0.5044066922582665, "confidence": "High", "modelTrust": 78, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nStockport County possess an attacking metric of 1.68 expected goals alongside a concession rate of 1.09, juxtaposed against Port Vale''s away metrics of 0.77 (GF) and 1.59 (GA).\n\nPoints-per-game distribution sits at 1.95 vs 0.82, supported by a short-term momentum distribution of 12 points to 3 over the trailing 5-match window.\n\nThe quantitative model values the primary outcome at 78%, anchored by a structural delta of 0.58 and a stability index of 0.50. Momentum flow is flagged as positive momentum divergence, driving a centralized model trust rating of 78%.\n", "tactical": "\nTactical separation relies on Stockport County''s attacking output (1.68) intersecting with Port Vale''s defensive decay (1.59), generating a baseline structural edge of 0.09.\n\nConversely, Port Vale''s offensive capacity (0.77) against Stockport County''s resistance (1.09) establishes the fixture''s counter-threat profile.\n\nBTTS propensities track at 59% (Stockport County) and 32% (Port Vale), mapping directly to a equilibrium tempo game script.\n\nShutout potential (Clean Sheet %: 32 vs 23) combined with offensive zeroes (FTS %: 14 vs 50) categorizes this matchup strictly as a state of defensive equilibrium.\n", "riskReport": "\nSystemic risk triggers at high, paired with an overarching volatility flag of controlled volatility.\n\nDraw pressure calculates as suppressed draw pressure (historical H2H draws: 0%), mapping a clear equilibrium threat if variance favors a stagnant script.\n\nUpset channels are defined by Port Vale''s away win frequency (23%) and Stockport County''s home draw frequency (18%).\n\nOffensive suppression (FTS: 14% / 50%) remains the primary friction point preventing steeper total goals exposure.\n", "goalProjection": "\nExpected total goals track to 2.57, distributed across Over 2.5 (46%) and Under 2.5 (54%) boundaries.\n\nEarly goal floor (Over 1.5) registers at 45.45% vs 22.73%, establishing a highly robust baseline for scoring expectation.\n\nH2H totals historically clear Over 2.5 at a 100% clip across 1 encounters.\n\nThis aggregate profile classifies the fixture explicitly within a neutral scoring environment.\n", "marketAlignment": "\nMarket alignment isolates on Home side to win, carrying a 78% true probability overlay against a system rating of 61%.\n\nTrailing head-to-head parameters over 1 iterations indicate BTTS at 0% and Over 2.5 at 100%.\n\nAlgorithmic scoreline distribution highlights 2:0 (18%) as the primary vector, trailed by 1:0 (17%).\n\nCompared to market pricing, the implied probability rests at 69.4%, exposing a quantified mathematical surplus of 8.6 points. Market efficiency appears tight, and engagement should remain highly selective.\n"}, "structural": {"ppgEdge": 1.13, "formEdge": 0.9, "composite": 0.582, "attackEdge": 0.08999999999999986, "defensiveEdge": -0.32000000000000006, "cleanSheetEdge": 0.09, "reliabilityEdge": 0.36}, "volatility": "Controlled Volatility", "primaryEdge": "Home Edge", "probability": 78, "recommendation": {"market": "1X2", "selection": "Home Win", "stakeTier": "Low Exposure", "confidence": 78, "expectedValue": 8.6, "marketProbability": 69.4, "suggestedBankrollPct": 5}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 18, "scorelineCSPercent": 15.91, "predictionValidation": "70.17%"}', '2026-04-28 16:44:33.808307+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('30', '1', '{"gg": 75, "ng": 25, "sn": "16", "acs": 28, "agc": 1.22, "ags": 2.17, "avg": 3.62, "cs2": "3:1", "hcs": 32, "hgc": 1.21, "hgs": 2.63, "aGrp": "A", "aOv2": 67, "aPts": 9, "aWin": 50, "afts": 0, "appg": 1.89, "date": "2026-05-01", "draw": 17, "flag": "✅", "hGrp": "A", "hOv2": 74, "hPts": 15, "hWin": 74, "hfts": 0, "hppg": 2.42, "ov25": 82, "pick": "OV.2.5", "time": "14:00", "tips": "HOME", "un25": 18, "H2H_A": 25, "H2H_D": 50, "H2H_H": 25, "aBtts": 72, "aDraw": 39, "aForm": "WWDDD", "aLost": 11, "hBtts": 68, "hDraw": 21, "hForm": "WWWWW", "hLost": 5, "match": "Shanghai Shenhua - Chengdu Rongcheng", "table": "2|1", "H2H_GG": 75, "H2H_GP": 4, "H2H_NG": 25, "H2H_OV": 25, "H2H_UN": 75, "cScore": "2:1", "chance": 82, "league": "Super League", "rating": 70, "awayWin": 20, "country": "China", "ftScore": "", "homeWin": 63, "o05Odds": 0, "o15Odds": 0, "o25Odds": 1.7, "o35Odds": 0, "o45Odds": 0, "score00": 2.5, "score01": 0, "score02": 0, "score10": 15.26, "score11": 7.63, "score12": 7.63, "score20": 10.26, "score21": 10.13, "u05Odds": 0, "u15Odds": 0, "u25Odds": 2.32, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-04-25 Chengdu Rongcheng - Zhejiang Professional 4 : 0,2026-04-21 Chengdu Rongcheng - Yunnan Yukun 2 : 1,2026-04-17 Wuhan Three Towns - Chengdu Rongcheng 0 : 1,2026-04-12 Beijing Guoan - Chengdu Rongcheng 1 : 2,2026-04-03 Chengdu Rongcheng - Qingdao West Coast 5 : 1", "H_Recent": "2026-04-26 Henan Songshan Longmen - Shanghai Shenhua 0 : 3,2026-04-22 Shanghai Shenhua - Qingdao Hainiu 2 : 0,2026-04-18 Shanghai Shenhua - Liaoning Tieren 3 : 1,2026-04-11 Shanghai Shenhua - Shanghai Port 1 : 0,2026-04-05 Tianjin Jinmen Tiger - Shanghai Shenhua 2 : 3", "awayOdds": 3.58, "drawOdds": 3.8, "homeOdds": 2.16, "likelyCS": "1:0", "agcOver15": 33.33, "agsOver15": 66.67, "hgcOver15": 42.11, "hgsOver15": 78.95, "oneX2Rate": 42, "H2H_Recent": "2025-09-21 Shanghai Shenhua - Chengdu Rongcheng 1 : 1,2025-05-02 Chengdu Rongcheng - Shanghai Shenhua 1 : 0,2024-11-02 Chengdu Rongcheng - Shanghai Shenhua 1 : 2,2025-09-21 Shanghai Shenhua - Chengdu Rongcheng 1 : 1", "cs2Percent": 7, "fullLeague": "China - Super League", "intelligence": {"risk": "High", "guide": "OV.2.5", "edgeTier": "MEASURED", "stability": 0.6140076526484062, "confidence": "High", "modelTrust": 70, "narratives": {"overview": "\nThis fixture presents a measurable structural lean.\n\nShanghai Shenhua possess an attacking metric of 2.63 expected goals alongside a concession rate of 1.21, juxtaposed against Chengdu Rongcheng''s away metrics of 2.17 (GF) and 1.22 (GA).\n\nPoints-per-game distribution sits at 2.42 vs 1.89, supported by a short-term momentum distribution of 15 points to 9 over the trailing 5-match window.\n\nThe quantitative model values the primary outcome at 82%, anchored by a structural delta of 0.52 and a stability index of 0.61. Momentum flow is flagged as positive momentum divergence, driving a centralized model trust rating of 70%.\n", "tactical": "\nTactical separation relies on Shanghai Shenhua''s attacking output (2.63) intersecting with Chengdu Rongcheng''s defensive decay (1.22), generating a baseline structural edge of 1.41.\n\nConversely, Chengdu Rongcheng''s offensive capacity (2.17) against Shanghai Shenhua''s resistance (1.21) establishes the fixture''s counter-threat profile.\n\nBTTS propensities track at 68% (Shanghai Shenhua) and 72% (Chengdu Rongcheng), mapping directly to a high-velocity tempo game script.\n\nShutout potential (Clean Sheet %: 32 vs 28) combined with offensive zeroes (FTS %: 0 vs 0) categorizes this matchup strictly as a state of defensive equilibrium.\n", "riskReport": "\nSystemic risk triggers at high, paired with an overarching volatility flag of high variance fixture.\n\nDraw pressure calculates as elevated draw probability (historical H2H draws: 50%), mapping a clear equilibrium threat if variance favors a stagnant script.\n\nUpset channels are defined by Chengdu Rongcheng''s away win frequency (50%) and Shanghai Shenhua''s home draw frequency (21%).\n\nOffensive suppression (FTS: 0% / 0%) remains the primary friction point preventing steeper total goals exposure.\n", "goalProjection": "\nExpected total goals track to 3.62, distributed across Over 2.5 (82%) and Under 2.5 (18%) boundaries.\n\nEarly goal floor (Over 1.5) registers at 78.95% vs 66.67%, establishing a highly robust baseline for scoring expectation.\n\nH2H totals historically clear Over 2.5 at a 25% clip across 4 encounters.\n\nThis aggregate profile classifies the fixture explicitly within a elevated scoring environment.\n", "marketAlignment": "\nMarket alignment isolates on Over 2.5 Goals, carrying a 82% true probability overlay against a system rating of 70%.\n\nTrailing head-to-head parameters over 4 iterations indicate BTTS at 75% and Over 2.5 at 25%.\n\nAlgorithmic scoreline distribution highlights 2:1 (8%) as the primary vector, trailed by 3:1 (7%).\n\nCompared to market pricing, the implied probability rests at 58.8%, exposing a quantified mathematical surplus of 23.2 points. The edge is visible but requires controlled positioning due to moderate variance exposure.\n"}, "structural": {"ppgEdge": 0.53, "formEdge": 0.6, "composite": 0.5167999999999999, "attackEdge": 1.41, "defensiveEdge": 0.96, "cleanSheetEdge": 0.04, "reliabilityEdge": 0}, "volatility": "High Variance Fixture", "primaryEdge": "Goals Edge", "probability": 82, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Low Exposure", "confidence": 82, "expectedValue": 23.2, "marketProbability": 58.8, "suggestedBankrollPct": 5}, "goalEnvironment": "Elevated Scoring Environment"}, "modelCSPercent": 8, "scorelineCSPercent": 15.26, "predictionValidation": "57.48%"}', '2026-04-30 14:35:43.017144+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('31', '1', '{"gg": 38, "ng": 62, "sn": "6", "acs": 11, "agc": 1.44, "ags": 1, "avg": 2.22, "cs2": "2:0", "hcs": 50, "hgc": 0.8, "hgs": 1.2, "aGrp": "A", "aOv2": 56, "aPts": 6, "aWin": 33, "afts": 33, "appg": 1.11, "date": "2026-07-31", "draw": 21, "flag": "⚠️", "hGrp": "B", "hOv2": 30, "hPts": 13, "hWin": 50, "hfts": 30, "hppg": 1.7, "ov25": 44, "pick": "Home Win", "time": "00:30", "tips": "HOME", "un25": 56, "H2H_A": 0, "H2H_D": 33, "H2H_H": 67, "aBtts": 56, "aDraw": 11, "aForm": "WWLLL", "aLost": 56, "hBtts": 30, "hDraw": 20, "hForm": "WWWWD", "hLost": 30, "match": "Corinthians - Athletico-PR", "table": "8|3", "H2H_GG": 67, "H2H_GP": 3, "H2H_NG": 33, "H2H_OV": 33, "H2H_UN": 67, "cScore": "1:0", "chance": 67, "league": "Serie A Betano", "rating": 53, "awayWin": 12, "country": "Brazil", "ftScore": "", "homeWin": 67, "o05Odds": 0, "o15Odds": 0, "o25Odds": 2.4, "o35Odds": 0, "o45Odds": 0, "score00": 10, "score01": 10, "score02": 5, "score10": 15, "score11": 10, "score12": 5, "score20": 19, "score21": 9, "u05Odds": 0, "u15Odds": 0, "u25Odds": 1.6, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-07-25 Athletico-PR - Internacional 2 : 0,2026-07-23 Sao Paulo - Athletico-PR 1 : 2,2026-05-30 Athletico-PR - Mirassol 1 : 0,2026-05-24 Remo - Athletico-PR 1 : 2,2026-05-18 Athletico-PR - Flamengo RJ 1 : 1", "H_Recent": "2026-07-26 Bahia - Corinthians 1 : 1,2026-07-24 Corinthians - Remo 3 : 0,2026-05-30 Gremio - Corinthians 1 : 3,2026-05-24 Corinthians - Atletico-MG 1 : 0,2026-05-17 Botafogo RJ - Corinthians 3 : 1", "awayOdds": 4.37, "drawOdds": 3.33, "homeOdds": 1.95, "likelyCS": "2:0", "agcOver15": 33, "agsOver15": 33, "hgcOver15": 30, "hgsOver15": 30, "oneX2Rate": 53, "H2H_Recent": "2026-02-19 Athletico-PR - Corinthians 0 : 1,2024-10-18 Corinthians - Athletico-PR 5 : 2,2024-06-23 Athletico-PR - Corinthians 1 : 1,1899-12-30  -", "cs2Percent": 15, "fullLeague": "Brazil - Serie A Betano", "intelligence": {"risk": "Moderate", "guide": "HOME WIN", "edgeTier": "THIN", "stability": 0.5726820032187825, "confidence": "Medium", "modelTrust": 80, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nCorinthians possess an attacking metric of 1.20 expected goals alongside a concession rate of 0.80, juxtaposed against Athletico-PR''s away metrics of 1.00 (GF) and 1.44 (GA).\n\nPoints-per-game distribution sits at 1.70 vs 1.11, supported by a short-term momentum distribution of 13 points to 6 over the trailing 5-match window.\n\nThe quantitative model values the primary outcome at 67%, anchored by a structural delta of 0.26 and a stability index of 0.57. Momentum flow is flagged as positive momentum divergence, driving a centralized model trust rating of 80%.\n", "tactical": "\nTactical separation relies on Corinthians''s attacking output (1.20) intersecting with Athletico-PR''s defensive decay (1.44), generating a baseline structural edge of -0.24.\n\nConversely, Athletico-PR''s offensive capacity (1.00) against Corinthians''s resistance (0.80) establishes the fixture''s counter-threat profile.\n\nBTTS propensities track at 30% (Corinthians) and 56% (Athletico-PR), mapping directly to a suppressed tempo game script.\n\nShutout potential (Clean Sheet %: 50 vs 11) combined with offensive zeroes (FTS %: 30 vs 33) categorizes this matchup strictly as a state of defensive equilibrium.\n", "riskReport": "\nSystemic risk triggers at moderate, paired with an overarching volatility flag of controlled volatility.\n\nDraw pressure calculates as suppressed draw pressure (historical H2H draws: 33%), mapping a clear equilibrium threat if variance favors a stagnant script.\n\nUpset channels are defined by Athletico-PR''s away win frequency (33%) and Corinthians''s home draw frequency (20%).\n\nOffensive suppression (FTS: 30% / 33%) remains the primary friction point preventing steeper total goals exposure.\n", "goalProjection": "\nExpected total goals track to 2.22, distributed across Over 2.5 (44%) and Under 2.5 (56%) boundaries.\n\nEarly goal floor (Over 1.5) registers at 30% vs 33%, establishing a highly robust baseline for scoring expectation.\n\nH2H totals historically clear Over 2.5 at a 33% clip across 3 encounters.\n\nThis aggregate profile classifies the fixture explicitly within a neutral scoring environment.\n", "marketAlignment": "\nMarket alignment isolates on Home side to win, carrying a 67% true probability overlay against a system rating of 53%.\n\nTrailing head-to-head parameters over 3 iterations indicate BTTS at 67% and Over 2.5 at 33%.\n\nAlgorithmic scoreline distribution highlights 1:0 (16%) as the primary vector, trailed by 2:0 (15%).\n\nCompared to market pricing, the implied probability rests at 51.3%, exposing a quantified mathematical surplus of 15.7 points. Market efficiency appears tight, and engagement should remain highly selective.\n"}, "structural": {"ppgEdge": 0.5899999999999999, "formEdge": 0.7, "composite": 0.25959999999999994, "attackEdge": -0.24, "defensiveEdge": 0.19999999999999996, "cleanSheetEdge": 0.39, "reliabilityEdge": 0.03}, "volatility": "Controlled Volatility", "primaryEdge": "Balanced", "probability": 67, "recommendation": {"market": "1X2", "selection": "Home Win", "stakeTier": "Medium Exposure (Standard Allocation)", "confidence": 67, "expectedValue": 15.7, "marketProbability": 51.3, "suggestedBankrollPct": 5}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 16, "scorelineCSPercent": 19, "predictionValidation": "62%"}', '2026-07-30 08:24:31.849988+00');
INSERT INTO public."user_comparisons" OVERRIDING SYSTEM VALUE VALUES ('32', '1', '{"gg": 64, "ng": 36, "sn": "7", "acs": 11, "agc": 1.89, "ags": 1.11, "avg": 2.72, "cs2": "1:1", "hcs": 22, "hgc": 1.22, "hgs": 1.22, "aGrp": "C", "aOv2": 67, "aPts": 10, "aWin": 33, "afts": 22, "appg": 1.22, "date": "2026-07-31", "draw": 20, "flag": "⚠️", "hGrp": "C", "hOv2": 33, "hPts": 8, "hWin": 33, "hfts": 22, "hppg": 1.33, "ov25": 68, "pick": "OV.2.5", "time": "02:30", "tips": "HOME", "un25": 32, "H2H_A": 0, "H2H_D": 0, "H2H_H": 100, "aBtts": 67, "aDraw": 22, "aForm": "WDWWL", "aLost": 44, "hBtts": 56, "hDraw": 33, "hForm": "LWDWD", "hLost": 33, "match": "Coritiba - Cruzeiro", "table": "10|11", "H2H_GG": 100, "H2H_GP": 1, "H2H_NG": 0, "H2H_OV": 100, "H2H_UN": 0, "cScore": "2:1", "chance": 68, "league": "Serie A Betano", "rating": 50, "awayWin": 20, "country": "Brazil", "ftScore": "", "homeWin": 60, "o05Odds": 0, "o15Odds": 0, "o25Odds": 2.14, "o35Odds": 0, "o45Odds": 0, "score00": 5, "score01": 16, "score02": 0, "score10": 6, "score11": 20, "score12": 5, "score20": 10, "score21": 9, "u05Odds": 0, "u15Odds": 0, "u25Odds": 1.74, "u35Odds": 0, "u45Odds": 0, "A_Recent": "2026-07-26 Cruzeiro - Botafogo RJ 0 : 1,2026-07-23 Internacional - Cruzeiro 1 : 2,2026-06-01 Cruzeiro - Fluminense 1 : 1,2026-05-24 Cruzeiro - Chapecoense-SC 2 : 1,2026-05-17 Palmeiras - Cruzeiro 1 : 1", "H_Recent": "2026-07-26 Bragantino - Coritiba 0 : 0,2026-07-23 Coritiba - Palmeiras 1 : 3,2026-05-30 Flamengo RJ - Coritiba 3 : 0,2026-05-26 Coritiba - Bahia 3 : 2,2026-05-17 Santos - Coritiba 0 : 3", "awayOdds": 2.39, "drawOdds": 3.4, "homeOdds": 3.13, "likelyCS": "1:1", "agcOver15": 56, "agsOver15": 33, "hgcOver15": 33, "hgsOver15": 33, "oneX2Rate": 39, "H2H_Recent": "2026-02-06 Cruzeiro - Coritiba 1 : 2,1899-12-30  -  ,1899-12-30  -  ,1899-12-30  -", "cs2Percent": 9, "fullLeague": "Brazil - Serie A Betano", "intelligence": {"risk": "Moderate", "guide": "OV.2.5", "edgeTier": "THIN", "stability": 0.5637151006251997, "confidence": "Medium", "modelTrust": 70, "narratives": {"overview": "\nThis fixture offers only a marginal structural advantage.\n\nCoritiba possess an attacking metric of 1.22 expected goals alongside a concession rate of 1.22, juxtaposed against Cruzeiro''s away metrics of 1.11 (GF) and 1.89 (GA).\n\nPoints-per-game distribution sits at 1.33 vs 1.22, supported by a short-term momentum distribution of 8 points to 10 over the trailing 5-match window.\n\nThe quantitative model values the primary outcome at 68%, anchored by a structural delta of -0.11 and a stability index of 0.56. Momentum flow is flagged as momentum equilibrium, driving a centralized model trust rating of 70%.\n", "tactical": "\nTactical separation relies on Coritiba''s attacking output (1.22) intersecting with Cruzeiro''s defensive decay (1.89), generating a baseline structural edge of -0.67.\n\nConversely, Cruzeiro''s offensive capacity (1.11) against Coritiba''s resistance (1.22) establishes the fixture''s counter-threat profile.\n\nBTTS propensities track at 56% (Coritiba) and 67% (Cruzeiro), mapping directly to a high-velocity tempo game script.\n\nShutout potential (Clean Sheet %: 22 vs 11) combined with offensive zeroes (FTS %: 22 vs 22) categorizes this matchup strictly as a state of defensive equilibrium.\n", "riskReport": "\nSystemic risk triggers at moderate, paired with an overarching volatility flag of controlled volatility.\n\nDraw pressure calculates as suppressed draw pressure (historical H2H draws: 0%), mapping a clear equilibrium threat if variance favors a stagnant script.\n\nUpset channels are defined by Cruzeiro''s away win frequency (33%) and Coritiba''s home draw frequency (33%).\n\nOffensive suppression (FTS: 22% / 22%) remains the primary friction point preventing steeper total goals exposure.\n", "goalProjection": "\nExpected total goals track to 2.72, distributed across Over 2.5 (68%) and Under 2.5 (32%) boundaries.\n\nEarly goal floor (Over 1.5) registers at 33% vs 33%, establishing a highly robust baseline for scoring expectation.\n\nH2H totals historically clear Over 2.5 at a 100% clip across 1 encounters.\n\nThis aggregate profile classifies the fixture explicitly within a neutral scoring environment.\n", "marketAlignment": "\nMarket alignment isolates on Over 2.5 Goals, carrying a 68% true probability overlay against a system rating of 50%.\n\nTrailing head-to-head parameters over 1 iterations indicate BTTS at 100% and Over 2.5 at 100%.\n\nAlgorithmic scoreline distribution highlights 2:1 (10%) as the primary vector, trailed by 1:1 (9%).\n\nCompared to market pricing, the implied probability rests at 46.7%, exposing a quantified mathematical surplus of 21.3 points. Market efficiency appears tight, and engagement should remain highly selective.\n"}, "structural": {"ppgEdge": 0.1100000000000001, "formEdge": -0.2, "composite": -0.11319999999999995, "attackEdge": -0.6699999999999999, "defensiveEdge": -0.10999999999999988, "cleanSheetEdge": 0.11, "reliabilityEdge": 0}, "volatility": "Controlled Volatility", "primaryEdge": "Balanced", "probability": 68, "recommendation": {"market": "Goals", "selection": "Over 2.5 Goals", "stakeTier": "Medium Exposure (Standard Allocation)", "confidence": 68, "expectedValue": 21.3, "marketProbability": 46.7, "suggestedBankrollPct": 5}, "goalEnvironment": "Neutral Scoring Environment"}, "modelCSPercent": 10, "scorelineCSPercent": 20, "predictionValidation": "49%"}', '2026-07-30 08:26:56.710867+00');
INSERT INTO public."export_usage" OVERRIDING SYSTEM VALUE VALUES ('2', '1', 'basic', '2026-04', '2', '2026-04-24 16:51:08.357413+00', '2026-04-24 16:52:16.555992+00');
INSERT INTO public."export_usage" OVERRIDING SYSTEM VALUE VALUES ('1', '1', 'pro', '2026-04', '5', '2026-04-24 16:50:41.06117+00', '2026-04-28 17:05:43.135528+00');