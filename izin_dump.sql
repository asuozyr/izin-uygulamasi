--
-- PostgreSQL database dump
--

\restrict YY0YatWEvo0C37GRibdCb3rdpFvjh6HSyRyFbitELkSSucRLhyvF4zDXdwHSO6i

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg12+1)
-- Dumped by pg_dump version 18.4

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id text NOT NULL,
    name text NOT NULL,
    initials text NOT NULL,
    balance integer DEFAULT 14 NOT NULL,
    email text,
    role text DEFAULT 'calisan'::text NOT NULL,
    google_id text,
    avatar_url text,
    hire_date date,
    total_earned_leave numeric(7,2) DEFAULT 0 NOT NULL,
    leave_balance numeric(7,2) DEFAULT 0 NOT NULL,
    employee_color text
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days numeric(5,1) NOT NULL,
    reason text,
    status text DEFAULT 'beklemede'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    start_time text,
    end_time text,
    return_date date,
    location text,
    contact_phone text,
    source text DEFAULT 'self'::text NOT NULL,
    created_by_admin_id text,
    duration_type text DEFAULT 'full_day'::text NOT NULL,
    updated_at timestamp with time zone,
    use_residence_city boolean DEFAULT false NOT NULL,
    use_existing_phone boolean DEFAULT false NOT NULL,
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['beklemede'::text, 'onaylandi'::text, 'reddedildi'::text, 'iptal'::text]))),
    CONSTRAINT leave_requests_type_check CHECK ((type = ANY (ARRAY['yillik'::text, 'mazeret'::text, 'hastalik'::text, 'ucretsiz'::text])))
);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, name, initials, balance, email, role, google_id, avatar_url, hire_date, total_earned_leave, leave_balance, employee_color) FROM stdin;
seed_ayhan_okuyan	AYHAN OKUYAN	AO	14	\N	calisan	\N	\N	2021-04-22	82.50	82.50	#FBEFD6
seed_berker_boyaci	BERKER BOYACI	BB	14	\N	calisan	\N	\N	2023-03-06	51.75	51.75	#DDEBF6
seed_cem_volkan_dogan	CEM VOLKAN DOĞAN	CD	14	\N	calisan	\N	\N	2021-01-08	86.25	86.25	#F8E2D0
seed_ecem_kuscuoglu	ECEM KUŞCUOĞLU	EK	14	\N	calisan	\N	\N	2022-10-03	58.00	58.00	#E3F3DD
seed_miray_sen	MİRAY ŞEN	MŞ	14	\N	calisan	\N	\N	2021-05-24	80.00	80.00	#E0E7E9
seed_murat_yildiz	MURAT YILDIZ	MY	14	\N	calisan	\N	\N	2023-03-10	51.75	51.75	#E0E7E9
seed_ozan_biler	OZAN BİLER	OB	14	\N	calisan	\N	\N	2020-01-20	102.25	102.25	#E3F3DD
seed_omer_ferhad_sarioglu	ÖMER FERHAD SARIOĞLU	ÖS	14	\N	calisan	\N	\N	2021-02-01	85.00	85.00	#DCE7FB
seed_safa_emre_yildirim	SAFA EMRE YILDIRIM	SY	14	\N	calisan	\N	\N	2021-08-16	76.50	76.50	#E8EAD6
seed_senanur_samur_duysal	SENANUR SAMUR DUYSAL	SD	14	\N	calisan	\N	\N	2022-03-02	67.75	67.75	#FBE2E6
seed_umut_dundar	UMUT DÜNDAR	UD	14	\N	calisan	\N	\N	2022-11-07	56.75	56.75	#E0E7E9
106328691818592794017	Utku Kaya	UK	14	utku.kaya@smartalpha.ai	yonetici	106328691818592794017	https://lh3.googleusercontent.com/a/ACg8ocIT9h1DHbp8_kit8eRIoy4DSFOxgLMHFFqHI1bNEh_zX6-eZw=s96-c	2019-09-01	107.25	105.25	#FBE2E6
117987814585259756826	Ayşe Yalçıner	AY	14	ayse.yalciner@smartalpha.ai	calisan	117987814585259756826	https://lh3.googleusercontent.com/a/ACg8ocLyz4ZWJ7NZMomOmpATvRpCj4jD7XdAXIkaW5rR-zc6Yd4RsA=s96-c	2025-05-02	17.25	17.25	#DCE7FB
115243798600995299142	Deniz Katırcıoğlu	DK	14	deniz.katircioglu@smartalpha.ai	yonetici	115243798600995299142	https://lh3.googleusercontent.com/a/ACg8ocKzZGAng_yglbm01jdra0rUXbA3kd82okUc4g-LIdGhCQlMPg=s96-c	2025-02-21	21.00	20.00	#E8EAD6
102245911553730499376	Asu Ozayar	AO	14	asu.ozayar@smartalpha.ai	yonetici	102245911553730499376	https://lh3.googleusercontent.com/a/ACg8ocLLWydj8zQRuTmsIxuNKiwt1rsdcIkNHkv54opj-P61aSOsvg=s96-c	2026-04-01	2.50	2.50	#DCE7FB
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, user_id, type, start_date, end_date, days, reason, status, created_at, start_time, end_time, return_date, location, contact_phone, source, created_by_admin_id, duration_type, updated_at, use_residence_city, use_existing_phone) FROM stdin;
5	115243798600995299142	yillik	2022-01-20	2022-01-20	1.0	DENEME - SİLİNECEK	onaylandi	2026-06-19 13:12:13.177302+00	09:00	18:00	2022-01-21	İzmir	05326407638	self	\N	full_day	\N	f	f
6	106328691818592794017	yillik	2026-06-22	2026-06-23	2.0	\N	onaylandi	2026-06-22 08:30:40.097011+00	11:30	14:30	2026-06-23	memleket	+90 5303869435	self	\N	full_day	\N	f	f
7	115243798600995299142	yillik	2025-09-03	2025-09-12	10.0	\N	onaylandi	2026-06-23 07:36:42.909722+00	\N	\N	2025-09-15	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
8	115243798600995299142	yillik	2026-05-25	2026-05-26	2.0	\N	onaylandi	2026-06-23 07:37:34.845155+00	\N	\N	2026-05-27	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
9	117987814585259756826	yillik	2026-05-25	2026-05-26	2.0	\N	onaylandi	2026-06-23 07:38:27.844403+00	\N	\N	2026-05-27	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
10	117987814585259756826	yillik	2026-05-15	2026-05-15	1.0	\N	onaylandi	2026-06-23 07:39:31.159337+00	12:00	18:00	2026-05-16	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
11	seed_umut_dundar	yillik	2026-05-25	2026-05-26	2.0	\N	onaylandi	2026-06-23 07:40:52.583317+00	09:00	12:00	2026-05-26	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
12	seed_berker_boyaci	yillik	2026-05-25	2026-05-26	2.0	\N	onaylandi	2026-06-23 07:42:23.84446+00	09:00	12:00	2026-05-26	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
13	seed_berker_boyaci	yillik	2026-05-22	2026-05-22	1.0	\N	onaylandi	2026-06-23 07:43:03.915186+00	09:00	18:00	2026-05-25	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
14	seed_cem_volkan_dogan	yillik	2026-06-01	2026-06-05	5.0	\N	onaylandi	2026-06-23 07:44:00.665902+00	09:00	18:00	2026-06-08	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
15	seed_cem_volkan_dogan	yillik	2026-05-25	2026-05-26	2.0	\N	onaylandi	2026-06-23 07:44:28.480378+00	09:00	12:00	2026-05-26	\N	\N	admin_created	102245911553730499376	full_day	\N	f	f
16	115243798600995299142	hastalik	2022-12-30	2022-12-30	0.5	...	reddedildi	2026-06-23 08:48:41.616384+00	13:00	18:00	2023-01-02	ev	+90 5326407638	self	\N	half_day_afternoon	\N	f	f
17	102245911553730499376	yillik	2026-06-25	2026-06-25	1.0	saglık kontrolu	reddedildi	2026-06-24 13:46:33.962449+00	09:00	18:00	2026-06-26	izmir	+90 5055025498	self	\N	full_day	2026-06-24 13:51:13.675621+00	f	f
18	102245911553730499376	mazeret	2026-06-26	2026-06-26	0.5	aile	iptal	2026-06-25 11:31:16.022118+00	16:37	17:35	2026-06-29	İkamet şehrim	Mevcut cep telefonum	self	\N	custom	2026-06-26 08:35:58.478547+00	t	t
19	102245911553730499376	yillik	2026-06-29	2026-06-29	1.0	aile ziyareti	onaylandi	2026-06-29 07:41:29.259225+00	\N	\N	2026-06-30	İkamet şehrim	Mevcut cep telefonum	self	\N	full_day	\N	t	t
\.


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 19, true);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_employees_email ON public.employees USING btree (email);


--
-- Name: idx_employees_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_employees_google_id ON public.employees USING btree (google_id);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_leave_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_user_id ON public.leave_requests USING btree (user_id);


--
-- Name: leave_requests leave_requests_created_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_created_by_admin_id_fkey FOREIGN KEY (created_by_admin_id) REFERENCES public.employees(id);


--
-- Name: leave_requests leave_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id);


--
-- PostgreSQL database dump complete
--

\unrestrict YY0YatWEvo0C37GRibdCb3rdpFvjh6HSyRyFbitELkSSucRLhyvF4zDXdwHSO6i

