import { Pool, PoolConfig } from "pg";

// En producción (Cloud Run) se conecta via Unix socket al Cloud SQL Auth Proxy.
// En local usa TCP con las variables DB_HOST / DB_PORT.
const config: PoolConfig = process.env.DB_SOCKET_PATH
  ? {
      host:     process.env.DB_SOCKET_PATH,   // /cloudsql/PROJECT:REGION:INSTANCE
      database: process.env.DB_DATABASE,
      user:     process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    }
  : {
      host:     process.env.DB_HOST     ?? "127.0.0.1",
      port:     parseInt(process.env.DB_PORT ?? "5432", 10),
      database: process.env.DB_DATABASE ?? "WBot",
      user:     process.env.DB_USERNAME ?? "postgres",
      password: process.env.DB_PASSWORD ?? "",
      ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(config);

pool.on("error", (err) => {
  console.error("[db] Error inesperado en el pool:", err.message);
});

// Crear tabla de cotizaciones si no existe (compatibilidad con versiones anteriores)
pool.query(`
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
`).catch((err) => {
  console.warn("[db] No se pudo crear tabla cotizaciones:", err.message);
});
