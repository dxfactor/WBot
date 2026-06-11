--
-- PostgreSQL database dump
--

\restrict pKs8xgmTPE7bPGIYJ0rn7R4qk7pXkGczcFdKZwmrakXRoHTBqB0S1vaTCsgY4cJ

-- Dumped from database version 14.21 (Homebrew)
-- Dumped by pg_dump version 14.21 (Homebrew)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    fecha text,
    cliente_nombre character varying(255),
    cliente_rut character varying(30),
    cliente_telefono character varying(30),
    cliente_whatsapp character varying(30),
    cliente_direccion text,
    tipo_documento character varying(20),
    razon_social character varying(255),
    giro character varying(100),
    productos text,
    total_clp bigint DEFAULT 0,
    estado character varying(50) DEFAULT 'Pendiente'::character varying
);


--
-- Name: pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id character varying(20) NOT NULL,
    nombre character varying(255) NOT NULL,
    categoria character varying(100),
    precio numeric(12,0) DEFAULT 0,
    stock integer DEFAULT 0,
    descripcion text,
    sku character varying(50)
);


--
-- Name: pedidos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);


--
-- Data for Name: pedidos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pedidos (id, fecha, cliente_nombre, cliente_rut, cliente_telefono, cliente_whatsapp, cliente_direccion, tipo_documento, razon_social, giro, productos, total_clp, estado) FROM stdin;
1	09-06-2026, 8:01:32 p. m.	Omar Martínez	21.987.654-0	+56 9 2345 6789	56923456789	Retiro en tienda	boleta	\N	\N	2x Pintura látex interior blanco 4L ($24.990 c/u), 2x Pintura esmalte sintético negro 1L ($14.990 c/u), 1x Rodillo lana 22cm con mango ($8.990)	88950	Pendiente
3	09-06-2026, 10:23:36 p. m.	Álvaro Ramírez	10.546.778-1	56923644358	56923644358	Retiro en tienda (Alsacia 1177, Osorno)	boleta	\N	\N	1× Cable unipolar 2.5mm² rollo 25m ($19.990), 1× Cinta aisladora 3M Temflex 20m ($3.490), 1× Toma corriente doble con tierra ($6.990), 3× Anteojos de seguridad transparentes ($5.990 c/u), 3× Casco de obra blanco ($14.990 c/u), 3× Guantes de trabajo multifunción L ($8.990 c/u)	120380	Pendiente
4	09-06-2026, 10:35:25 p. m.	Renato Ugalde	10.658.115-0	+56 9 3458 8361	56934588361	Retiro en tienda	boleta	\N	\N	- 3x Pintura látex interior blanco 4L (PIN001) a $24.990 c/u = $74.970\n- 3x Pintura esmalte sintético negro 1L (PIN002) a $14.990 c/u = $44.970\n- 3x Rodillo lana 22cm con mango (PIN003) a $8.990 c/u = $26.970\n- 3x Pincel plano N°2 cerda natural (PIN004) a $3.990 c/u = $11.970	158880	Pendiente
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, nombre, categoria, precio, stock, descripcion, sku) FROM stdin;
HER001	Taladro percutor Bosch GSB 550	Herramientas Eléctricas	89990	8	Taladro percutor Bosch GSB 550W, mandril 13mm, 2 velocidades, incluye maletín y 2 brocas.	BSH-GSB550
HER002	Amoladora angular Dewalt 115mm	Herramientas Eléctricas	74990	5	Amoladora angular Dewalt DWE4011, 710W, disco 115mm, protección contra sobrecargas.	DEW-DWE4011
HER003	Sierra caladora Black+Decker	Herramientas Eléctricas	59990	6	Sierra caladora Black+Decker KS501, 400W, 3000 cpm, para madera hasta 55mm y metal hasta 4mm.	BD-KS501
HER004	Atornillador inalámbrico Bosch GO 2	Herramientas Eléctricas	49990	12	Atornillador inalámbrico Bosch GO 2, batería 3.6V, 5Nm, carga USB-C, compacto y liviano.	BSH-GO2
HER005	Martillo carpintero 500g	Herramientas Manuales	12990	30	Martillo carpintero mango fibra de vidrio, cabeza 500g, antideslizante, uña extractora.	MAR-500G
HER006	Juego destornilladores Stanley 6 piezas	Herramientas Manuales	18990	20	Set 6 destornilladores Stanley: 3 planos y 3 Phillips, mango bimateria antideslizante.	STN-DST6
HER007	Llave ajustable 10" Bahco	Herramientas Manuales	22990	15	Llave ajustable Bahco 80 10 pulgadas, apertura máx 28mm, acero cromo vanadio.	BAH-10ADJ
HER008	Nivel de burbuja 60cm Stanley	Herramientas Manuales	16990	18	Nivel de burbuja Stanley 60cm, 3 matraces, cuerpo aluminio, medición horizontal y vertical.	STN-NIV60
FIJ001	Tornillos autoperforantes 6x1" (caja 100u)	Fijaciones y Tornillería	4990	80	Tornillos autoperforantes cabeza hexagonal 6x1 pulgada, acero zincado, caja 100 unidades.	TOR-AUTO6X1
FIJ002	Tarugos plásticos N°8 (bolsa 50u)	Fijaciones y Tornillería	2990	100	Tarugos plásticos número 8, color gris, para pared de mampostería y hormigón, bolsa 50 unidades.	TAR-P8-50
FIJ003	Adhesivo de montaje Loctite 375g	Fijaciones y Tornillería	9990	40	Adhesivo de montaje Loctite Power Grab Express 375g, fijación sin taladro, interior y exterior.	LOC-PMG375
PIN001	Pintura látex interior blanco 4L	Pintura y Accesorios	24990	25	Pintura látex interior color blanco mate, rendimiento 10-12 m²/L, lavable, secado 1 hora, balde 4 litros.	PIN-LAT-BL4
PIN002	Pintura esmalte sintético negro 1L	Pintura y Accesorios	14990	20	Esmalte sintético negro brillante 1 litro, para madera y metal, resistente a golpes y humedad.	PIN-ESM-NG1
PIN003	Rodillo lana 22cm con mango	Pintura y Accesorios	8990	35	Rodillo de lana 22cm con mango extensible 40cm, para pintura látex en paredes y cielorrasos.	ROD-LAN22
PIN004	Pincel plano N°2 cerda natural	Pintura y Accesorios	3990	50	Pincel plano número 2, cerda natural, mango madera, para esmaltes y barnices.	PNC-PL2
PLO001	Cinta teflón 12mm x 10m	Plomería	1990	150	Cinta teflón PTFE 12mm x 10 metros, para sellado de uniones roscadas en tuberías de agua y gas.	TEF-12X10
PLO002	Llave de paso esférica 1/2"	Plomería	11990	22	Llave de paso esférica 1/2 pulgada, latón niquelado, palanca mariposa, para agua fría y caliente.	LLP-ESP-12
PLO003	Silicona sanitaria blanca 280ml	Plomería	7990	45	Silicona acetínica sanitaria color blanco 280ml, resistente al agua y hongos, para baños y cocinas.	SIL-SAN-BL
ELE001	Cable unipolar 2.5mm² (rollo 25m)	Electricidad	19990	30	Cable unipolar de cobre 2.5mm², aislación 750V, color rojo, rollo 25 metros. Para instalaciones domiciliarias.	CAB-UNI25-R
ELE002	Cinta aisladora 3M Temflex 20m	Electricidad	3490	90	Cinta aisladora eléctrica 3M Temflex 1500, 19mm x 20m, resistencia 600V, temperatura -18°C a 105°C.	3M-TEM20
ELE003	Toma corriente doble con tierra	Electricidad	6990	40	Toma corriente doble con toma de tierra IRAM, para embutir, 16A/250V, color blanco.	TOM-DBL-T
SEG001	Guantes de trabajo multifunción L	Seguridad	8990	28	Guantes de trabajo talla L, palma cuero vacuno, dorso tela elástica, refuerzo en pulgar e índice.	GUA-TRA-L
SEG002	Anteojos de seguridad transparentes	Seguridad	5990	35	Anteojos de seguridad lente policarbonato transparente, protección UV, marco ajustable.	ANT-SEG-TR
SEG003	Casco de obra blanco	Seguridad	14990	15	Casco de seguridad industrial blanco, polietileno de alta densidad, ajuste rueda, clase E 20.000V.	CAS-OBR-BL
\.


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 4, true);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict pKs8xgmTPE7bPGIYJ0rn7R4qk7pXkGczcFdKZwmrakXRoHTBqB0S1vaTCsgY4cJ

