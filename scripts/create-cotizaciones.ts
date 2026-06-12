/**
 * Crea la tabla de cotizaciones en PostgreSQL si no existe.
 * Uso: npx ts-node --transpile-only scripts/create-cotizaciones.ts
 */
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  host:     process.env.DB_HOST     ?? "127.0.0.1",
  port:     parseInt(process.env.DB_PORT ?? "5432", 10),
  database: process.env.DB_DATABASE ?? "WBot",
  user:     process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function main() {
  console.log("[create-cotizaciones] Conectando a PostgreSQL…");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id SERIAL PRIMARY KEY,
      fecha TEXT,
      cliente_whatsapp TEXT,
      cliente_nombre TEXT,
      tipo TEXT DEFAULT 'texto',
      descripcion TEXT,
      productos_json JSONB,
      estado TEXT DEFAULT 'Recibida',
      cliente_telefono TEXT,
      cliente_email TEXT
    );
  `);
  console.log("[create-cotizaciones] Tabla verificada ✓");

  await pool.end();
  console.log("[create-cotizaciones] ¡Listo!");
}

main().catch((err) => {
  console.error("[create-cotizaciones] Error:", err.message);
  process.exit(1);
});
