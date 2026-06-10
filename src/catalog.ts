import { pool } from "./db";

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  descripcion: string;
  sku: string;
}

function mapRow(r: Record<string, unknown>): Producto {
  return {
    id:          String(r.id          ?? ""),
    nombre:      String(r.nombre      ?? ""),
    categoria:   String(r.categoria   ?? ""),
    precio:      Number(r.precio      ?? 0),
    stock:       Number(r.stock       ?? 0),
    descripcion: String(r.descripcion ?? ""),
    sku:         String(r.sku         ?? ""),
  };
}

export async function buscarProductos(query: string): Promise<Producto[]> {
  const q = `%${query}%`;
  const { rows } = await pool.query(
    `SELECT * FROM productos
     WHERE nombre ILIKE $1 OR descripcion ILIKE $1 OR categoria ILIKE $1 OR sku ILIKE $1
     ORDER BY nombre`,
    [q]
  );
  return rows.map(mapRow);
}

export async function obtenerProductoPorId(id: string): Promise<Producto | null> {
  const { rows } = await pool.query(`SELECT * FROM productos WHERE id = $1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function obtenerProductosPorCategoria(categoria: string): Promise<Producto[]> {
  const { rows } = await pool.query(
    `SELECT * FROM productos WHERE categoria ILIKE $1 ORDER BY nombre`,
    [categoria]
  );
  return rows.map(mapRow);
}

export async function listarCategorias(): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT categoria FROM productos
     WHERE categoria IS NOT NULL AND categoria <> ''
     ORDER BY categoria`
  );
  return rows.map((r) => String(r.categoria));
}

export async function consultarStock(productoId: string): Promise<{ stock: number; disponible: boolean } | null> {
  const p = await obtenerProductoPorId(productoId);
  if (!p) return null;
  return { stock: p.stock, disponible: p.stock > 0 };
}

export async function obtenerPrecio(productoId: string): Promise<{ precio: number; moneda: string } | null> {
  const p = await obtenerProductoPorId(productoId);
  if (!p) return null;
  return { precio: p.precio, moneda: "CLP" };
}
