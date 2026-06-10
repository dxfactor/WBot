import { pool } from "./db";
import { enviarMensaje } from "./whatsapp";

export interface Pedido {
  clienteNombre: string;
  clienteRut: string;
  clienteTelefono: string;
  clienteDireccion: string;
  tipoDocumento: "boleta" | "factura";
  razonSocial?: string;
  giro?: string;
  productos: string;
  total: number;
  whatsappCliente: string;
}

export interface PedidoDetalle {
  id: number;
  fecha: string;
  clienteNombre: string;
  clienteRut: string;
  clienteTelefono: string;
  clienteDireccion: string;
  tipoDocumento: string;
  razonSocial: string;
  giro: string;
  productos: string;
  total: number;
  estado: string;
}

export interface CambiosPedido {
  productos?:     string;
  total?:         number;
  clienteDireccion?: string;
  tipoDocumento?: "boleta" | "factura";
  razonSocial?:   string;
  giro?:          string;
}

export async function consultarPedido(id: number): Promise<PedidoDetalle | null> {
  const { rows } = await pool.query(
    `SELECT id, fecha, cliente_nombre, cliente_rut, cliente_telefono,
            cliente_direccion, tipo_documento, razon_social, giro,
            productos, total_clp, estado
     FROM pedidos WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id:              r.id,
    fecha:           r.fecha,
    clienteNombre:   r.cliente_nombre,
    clienteRut:      r.cliente_rut,
    clienteTelefono: r.cliente_telefono,
    clienteDireccion:r.cliente_direccion,
    tipoDocumento:   r.tipo_documento,
    razonSocial:     r.razon_social ?? "",
    giro:            r.giro ?? "",
    productos:       r.productos,
    total:           Number(r.total_clp),
    estado:          r.estado,
  };
}

export async function actualizarPedido(id: number, cambios: CambiosPedido): Promise<void> {
  // Verificar que sigue en Pendiente
  const { rows } = await pool.query(`SELECT estado FROM pedidos WHERE id = $1`, [id]);
  if (!rows[0]) throw new Error(`Pedido #${id} no encontrado`);
  if (rows[0].estado !== "Pendiente") {
    throw new Error(`El pedido #${String(id).padStart(4,"0")} ya está en estado "${rows[0].estado}" y no puede modificarse`);
  }

  const sets: string[]  = [];
  const vals: unknown[] = [];
  let   n = 1;

  if (cambios.productos     !== undefined) { sets.push(`productos = $${n++}`);          vals.push(cambios.productos); }
  if (cambios.total         !== undefined) { sets.push(`total_clp = $${n++}`);          vals.push(cambios.total); }
  if (cambios.clienteDireccion !== undefined) { sets.push(`cliente_direccion = $${n++}`); vals.push(cambios.clienteDireccion); }
  if (cambios.tipoDocumento !== undefined) { sets.push(`tipo_documento = $${n++}`);     vals.push(cambios.tipoDocumento); }
  if (cambios.razonSocial   !== undefined) { sets.push(`razon_social = $${n++}`);       vals.push(cambios.razonSocial); }
  if (cambios.giro          !== undefined) { sets.push(`giro = $${n++}`);               vals.push(cambios.giro); }

  if (sets.length === 0) return;

  vals.push(id);
  await pool.query(`UPDATE pedidos SET ${sets.join(", ")} WHERE id = $${n}`, vals);
  console.log(`[pedidos] Pedido #${id} actualizado`);
}

export async function registrarPedido(pedido: Pedido): Promise<number> {
  const id = await guardarEnDB(pedido); // fallo aquí sí es crítico
  notificarVendedor(pedido, id).catch((err) =>
    console.error("[pedidos] No se pudo notificar al vendedor:", (err as Error).message)
  );
  return id;
}

async function guardarEnDB(pedido: Pedido): Promise<number> {
  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const { rows } = await pool.query(
    `INSERT INTO pedidos
      (fecha, cliente_nombre, cliente_rut, cliente_telefono, cliente_whatsapp,
       cliente_direccion, tipo_documento, razon_social, giro, productos, total_clp, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pendiente')
     RETURNING id`,
    [
      fecha,
      pedido.clienteNombre,
      pedido.clienteRut,
      pedido.clienteTelefono,
      pedido.whatsappCliente,
      pedido.clienteDireccion,
      pedido.tipoDocumento,
      pedido.razonSocial ?? null,
      pedido.giro        ?? null,
      pedido.productos,
      pedido.total,
    ]
  );
  const id = rows[0].id as number;
  console.log(`[pedidos] Pedido #${id} guardado para ${pedido.clienteNombre}`);
  return id;
}

async function notificarVendedor(pedido: Pedido, id: number): Promise<void> {
  const vendedorPhone = process.env.VENDEDOR_PHONE;
  if (!vendedorPhone) {
    console.warn("[pedidos] VENDEDOR_PHONE no configurado — no se envió notificación");
    return;
  }

  const docExtra = pedido.tipoDocumento === "factura" && pedido.razonSocial
    ? `\n📄 *Razón social:* ${pedido.razonSocial}\n📋 *Giro:* ${pedido.giro ?? "-"}`
    : "";

  const mensaje =
    `🛒 *NUEVO PEDIDO #${String(id).padStart(4, "0")}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Cliente:* ${pedido.clienteNombre}\n` +
    `🪪 *RUT:* ${pedido.clienteRut}\n` +
    `📱 *Teléfono:* ${pedido.clienteTelefono}\n` +
    `📍 *Dirección:* ${pedido.clienteDireccion}\n` +
    `🧾 *Documento:* ${pedido.tipoDocumento}${docExtra}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 *Productos:*\n${pedido.productos}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total:* $${pedido.total.toLocaleString("es-CL")}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💬 Responder al cliente: wa.me/${pedido.whatsappCliente}`;

  await enviarMensaje(vendedorPhone, mensaje);
  console.log(`[pedidos] Vendedor notificado en ${vendedorPhone}`);
}
