/**
 * Crea las tablas en PostgreSQL y migra datos desde los Excel si existen.
 * Seguro de ejecutar múltiples veces (idempotente).
 *
 * Uso: npx ts-node --transpile-only scripts/init-db.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const pool = new Pool({
  host:     process.env.DB_HOST     ?? "127.0.0.1",
  port:     parseInt(process.env.DB_PORT ?? "5432", 10),
  database: process.env.DB_DATABASE ?? "WBot",
  user:     process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function main() {
  console.log("[init-db] Conectando a PostgreSQL…");

  // ── Crear tablas ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id          VARCHAR(20)    PRIMARY KEY,
      nombre      VARCHAR(255)   NOT NULL,
      categoria   VARCHAR(100),
      precio      NUMERIC(12,0)  DEFAULT 0,
      stock       INTEGER        DEFAULT 0,
      descripcion TEXT,
      sku         VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id                 SERIAL        PRIMARY KEY,
      fecha              TEXT,
      cliente_nombre     VARCHAR(255),
      cliente_rut        VARCHAR(30),
      cliente_telefono   VARCHAR(30),
      cliente_whatsapp   VARCHAR(30),
      cliente_direccion  TEXT,
      tipo_documento     VARCHAR(20),
      razon_social       VARCHAR(255),
      giro               VARCHAR(100),
      productos          TEXT,
      total_clp          BIGINT        DEFAULT 0,
      estado             VARCHAR(50)   DEFAULT 'Pendiente'
    );
  `);
  console.log("[init-db] Tablas verificadas ✓");

  // ── Migrar catalogo.xlsx ────────────────────────────────────────────────
  const catalogPath = path.join(__dirname, "../data/catalogo.xlsx");
  if (fs.existsSync(catalogPath)) {
    console.log("[init-db] Migrando productos desde catalogo.xlsx…");
    const wb    = XLSX.readFile(catalogPath);
    const sheet = wb.Sheets["Productos"] ?? wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let count = 0;
    for (const row of filas) {
      const id = String(row["ID"] ?? "").trim();
      if (!id) continue;
      await pool.query(
        `INSERT INTO productos (id, nombre, categoria, precio, stock, descripcion, sku)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          String(row["Nombre"]      ?? ""),
          String(row["Categoria"]   ?? ""),
          Number(row["Precio"]      ?? 0),
          Number(row["Stock"]       ?? 0),
          String(row["Descripcion"] ?? ""),
          String(row["SKU"]         ?? ""),
        ]
      );
      count++;
    }
    console.log(`[init-db] ${count} productos migrados ✓`);
  } else {
    console.log("[init-db] catalogo.xlsx no encontrado — omitido");
  }

  // ── Migrar pedidos.xlsx (solo si la tabla está vacía) ───────────────────
  const pedidosPath = path.join(__dirname, "../data/pedidos.xlsx");
  if (fs.existsSync(pedidosPath)) {
    const { rows: cnt } = await pool.query("SELECT COUNT(*) AS n FROM pedidos");
    if (parseInt(cnt[0].n) === 0) {
      console.log("[init-db] Migrando pedidos desde pedidos.xlsx…");
      const wb    = XLSX.readFile(pedidosPath);
      const sheet = wb.Sheets["Pedidos"] ?? wb.Sheets[wb.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      let count = 0;
      for (const row of filas) {
        await pool.query(
          `INSERT INTO pedidos
            (fecha, cliente_nombre, cliente_rut, cliente_telefono, cliente_whatsapp,
             cliente_direccion, tipo_documento, razon_social, giro, productos, total_clp, estado)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            String(row["Fecha"]        ?? ""),
            String(row["Nombre"]       ?? ""),
            String(row["RUT"]          ?? ""),
            String(row["Teléfono"]     ?? ""),
            String(row["WhatsApp"]     ?? ""),
            String(row["Dirección"]    ?? ""),
            String(row["Documento"]    ?? ""),
            String(row["Razón Social"] ?? "") || null,
            String(row["Giro"]         ?? "") || null,
            String(row["Productos"]    ?? ""),
            Number(row["Total CLP"]    ?? 0),
            String(row["Estado"]       ?? "Pendiente"),
          ]
        );
        count++;
      }
      console.log(`[init-db] ${count} pedidos migrados ✓`);
    } else {
      console.log("[init-db] Tabla pedidos ya tiene datos — omitido");
    }
  } else {
    console.log("[init-db] pedidos.xlsx no encontrado — omitido");
  }

  await pool.end();
  console.log("[init-db] ¡Listo!");
}

main().catch((err) => {
  console.error("[init-db] Error:", err.message);
  process.exit(1);
});
