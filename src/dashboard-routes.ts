import { Router } from "express";
import { pool } from "./db";
import { requireAuth } from "./auth-routes";
import fs from "fs";
import pathModule from "path";

const router = Router();

router.get("/api/dashboard/kpis", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN estado <> 'Rechazado' THEN total_clp ELSE 0 END), 0)  AS total_ventas,
       COUNT(*)                                                                        AS total_pedidos,
       COUNT(DISTINCT COALESCE(NULLIF(cliente_whatsapp,''), cliente_telefono))         AS total_clientes,
       COALESCE(AVG(CASE WHEN estado <> 'Rechazado' THEN total_clp END), 0)           AS ticket_promedio,
       COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END)                               AS pedidos_pendientes
     FROM pedidos`
  );
  const r = rows[0];
  res.json({
    totalVentas:       Number(r.total_ventas),
    totalPedidos:      Number(r.total_pedidos),
    totalClientes:     Number(r.total_clientes),
    ticketPromedio:    Math.round(Number(r.ticket_promedio)),
    pedidosPendientes: Number(r.pedidos_pendientes),
  });
});

router.get("/api/dashboard/productos", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, nombre, categoria, precio, stock, sku FROM productos ORDER BY nombre`
  );
  res.json(rows.map((p) => ({
    id:        String(p.id),
    nombre:    String(p.nombre),
    categoria: String(p.categoria ?? ""),
    precio:    Number(p.precio),
    stock:     Number(p.stock),
    sku:       String(p.sku ?? ""),
  })));
});

router.get("/api/dashboard/ventas", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, fecha, cliente_nombre, cliente_rut, productos, total_clp,
            estado, tipo_documento, razon_social, giro, cliente_telefono,
            cliente_whatsapp, cliente_direccion
     FROM pedidos
     ORDER BY id DESC`
  );
  res.json(rows.map((p) => ({
    id:          Number(p.id),
    fecha:       String(p.fecha        ?? ""),
    nombre:      String(p.cliente_nombre ?? ""),
    rut:         String(p.cliente_rut    ?? ""),
    productos:   String(p.productos      ?? ""),
    total:       Number(p.total_clp      ?? 0),
    estado:      String(p.estado         ?? "Pendiente"),
    documento:   String(p.tipo_documento ?? ""),
    razonSocial: String(p.razon_social   ?? ""),
    giro:        String(p.giro           ?? ""),
    telefono:    String(p.cliente_telefono  ?? ""),
    whatsapp:    String(p.cliente_whatsapp  ?? ""),
    direccion:   String(p.cliente_direccion ?? ""),
  })));
});

router.patch("/api/dashboard/ventas/:id", requireAuth, async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const estado = String((req.body as Record<string, unknown>).estado ?? "").trim();

  const ESTADOS_VALIDOS = ["Pendiente", "En Curso", "Rechazado", "Entregado"];
  if (!ESTADOS_VALIDOS.includes(estado)) {
    res.status(400).json({ ok: false, mensaje: "Estado no válido" });
    return;
  }

  const { rowCount } = await pool.query(
    `UPDATE pedidos SET estado = $1 WHERE id = $2`,
    [estado, id]
  );

  if (rowCount === 0) {
    res.status(404).json({ ok: false, mensaje: "Pedido no encontrado" });
    return;
  }

  res.json({ ok: true, estado });
});

router.get("/api/dashboard/clientes", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT
       cliente_nombre                                              AS nombre,
       cliente_rut                                                AS rut,
       cliente_telefono                                           AS telefono,
       cliente_whatsapp                                           AS whatsapp,
       MAX(cliente_direccion)                                     AS direccion,
       MAX(tipo_documento)                                        AS documento,
       SUM(CASE WHEN estado <> 'Rechazado' THEN total_clp ELSE 0 END) AS total_compras,
       COUNT(*)                                                   AS pedidos,
       MAX(fecha)                                                 AS ultima_compra
     FROM pedidos
     GROUP BY cliente_nombre, cliente_rut, cliente_telefono, cliente_whatsapp
     ORDER BY total_compras DESC`
  );
  res.json(rows.map((c) => ({
    nombre:       String(c.nombre       ?? ""),
    rut:          String(c.rut          ?? ""),
    telefono:     String(c.telefono     ?? ""),
    whatsapp:     String(c.whatsapp     ?? ""),
    direccion:    String(c.direccion    ?? ""),
    documento:    String(c.documento    ?? ""),
    totalCompras: Number(c.total_compras ?? 0),
    pedidos:      Number(c.pedidos      ?? 0),
    ultimaCompra: String(c.ultima_compra ?? ""),
  })));
});

// ── Cotizaciones ──────────────────────────────────────────────────────────────

router.get("/api/dashboard/cotizaciones", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, fecha, cliente_whatsapp, cliente_nombre, cliente_telefono,
            cliente_email, tipo, descripcion, productos_json, estado
     FROM cotizaciones
     ORDER BY id DESC`
  );
  res.json(rows.map((c) => ({
    id:              Number(c.id),
    fecha:           String(c.fecha          ?? ""),
    clienteWhatsapp: String(c.cliente_whatsapp ?? ""),
    clienteNombre:   String(c.cliente_nombre   ?? ""),
    clienteTelefono: String(c.cliente_telefono ?? ""),
    clienteEmail:    String(c.cliente_email    ?? ""),
    tipo:            String(c.tipo             ?? "texto"),
    descripcion:     String(c.descripcion      ?? ""),
    productos:       c.productos_json          ?? [],
    estado:          String(c.estado           ?? "Recibida"),
  })));
});

router.patch("/api/dashboard/cotizaciones/:id", requireAuth, async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const estado = String((req.body as Record<string, unknown>).estado ?? "").trim();
  const ESTADOS = ["Recibida", "Revisada", "Respondida", "Cerrada"];
  if (!ESTADOS.includes(estado)) {
    res.status(400).json({ ok: false, mensaje: "Estado no válido" });
    return;
  }
  const { rowCount } = await pool.query(
    `UPDATE cotizaciones SET estado = $1 WHERE id = $2`, [estado, id]
  );
  if (rowCount === 0) { res.status(404).json({ ok: false, mensaje: "No encontrada" }); return; }
  res.json({ ok: true, estado });
});

// Comparativa desde tabla cotizacion_productos
router.get("/api/dashboard/cotizaciones/:id/comparativa", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // Obtener productos individuales de la cotización
  const { rows: productos } = await pool.query(
    `SELECT id, nombre_cotizado, cantidad, id_catalogo, nombre_catalogo,
            es_alternativa, nota, precio_venta, precio_compra, stock
     FROM cotizacion_productos
     WHERE cotizacion_id = $1
     ORDER BY id ASC`,
    [id]
  );

  if (productos.length === 0) {
    // Fallback a JSON para cotizaciones antiguas
    const { rows: cotRows } = await pool.query(
      `SELECT productos_json FROM cotizaciones WHERE id = $1`, [id]
    );
    if (!cotRows[0]) { res.status(404).json({ error: "No encontrada" }); return; }
    res.json(cotRows[0].productos_json ?? []);
    return;
  }

  const comparativa = productos.map(p => {
    const precioVenta = p.precio_venta ? Number(p.precio_venta) : null;
    const precioCompra = p.precio_compra ? Number(p.precio_compra) : null;
    const margen = precioVenta && precioCompra && precioCompra > 0
      ? Math.round(((precioVenta - precioCompra) / precioCompra) * 100)
      : null;

    return {
      nombreCotizado:  p.nombre_cotizado ?? "",
      cantidad:        Number(p.cantidad ?? 0),
      esAlternativa:   Boolean(p.es_alternativa ?? false),
      nota:            p.nota ?? "",
      catalogo: {
        id:            p.id_catalogo,
        nombre:        p.nombre_catalogo,
        stock:         Number(p.stock ?? 0),
        precioVenta,
        precioCompra,
        margen,
      },
    };
  });

  res.json(comparativa);
});

// ── Dev: token stats ─────────────────────────────────────────────────────────
router.get("/api/dashboard/tokens", requireAuth, (_req, res) => {
  const { getResumen } = require("./token-tracker");
  res.json({
    devMode: process.env.DEV_TOOLS === "true",
    ...getResumen(),
  });
});

// ── Dashboard HTML (vía API) ────────────────────────────────────────────────
router.get("/cotizaciones-html", requireAuth, (_req, res) => {
  res.redirect("/cotizaciones");
});

export default router;
