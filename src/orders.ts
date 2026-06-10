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

export async function registrarPedido(pedido: Pedido): Promise<void> {
  await guardarEnDB(pedido); // fallo aquí sí es crítico
  notificarVendedor(pedido).catch((err) =>
    console.error("[pedidos] No se pudo notificar al vendedor:", (err as Error).message)
  );
}

async function guardarEnDB(pedido: Pedido): Promise<void> {
  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  await pool.query(
    `INSERT INTO pedidos
      (fecha, cliente_nombre, cliente_rut, cliente_telefono, cliente_whatsapp,
       cliente_direccion, tipo_documento, razon_social, giro, productos, total_clp, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pendiente')`,
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
  console.log(`[pedidos] Pedido guardado para ${pedido.clienteNombre}`);
}

async function notificarVendedor(pedido: Pedido): Promise<void> {
  const vendedorPhone = process.env.VENDEDOR_PHONE;
  if (!vendedorPhone) {
    console.warn("[pedidos] VENDEDOR_PHONE no configurado — no se envió notificación");
    return;
  }

  const docExtra = pedido.tipoDocumento === "factura" && pedido.razonSocial
    ? `\n📄 *Razón social:* ${pedido.razonSocial}\n📋 *Giro:* ${pedido.giro ?? "-"}`
    : "";

  const mensaje =
    `🛒 *NUEVO PEDIDO*\n` +
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
