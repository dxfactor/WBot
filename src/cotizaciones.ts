import { pool } from "./db";
import { enviarMensaje } from "./whatsapp";
import { enviarCorreo } from "./email";

export interface Cotizacion {
  clienteNombre: string;
  clienteRut: string;
  clienteTelefono: string;
  clienteEmail: string;
  productos: string;
  total: number;
  whatsappCliente: string;
}

export interface CotizacionDetalle {
  id: number;
  fecha: string;
  clienteNombre: string;
  clienteRut: string;
  clienteTelefono: string;
  clienteEmail: string;
  productos: string;
  total: number;
  estado: string;
}

export async function consultarCotizacion(id: number): Promise<CotizacionDetalle | null> {
  const { rows } = await pool.query(
    `SELECT id, fecha, cliente_nombre, cliente_rut, cliente_telefono,
            cliente_email, productos, total_clp, estado
     FROM cotizaciones WHERE id = $1`,
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
    clienteEmail:    r.cliente_email,
    productos:       r.productos,
    total:           Number(r.total_clp),
    estado:          r.estado,
  };
}

export async function registrarCotizacion(cotizacion: Cotizacion): Promise<number> {
  const id = await guardarEnDB(cotizacion);
  notificarVendedor(cotizacion, id).catch((err) =>
    console.error("[cotizaciones] No se pudo notificar al vendedor:", (err as Error).message)
  );
  enviarConfirmacion(cotizacion, id).catch((err) =>
    console.error("[cotizaciones] No se pudo enviar correo de confirmación:", (err as Error).message)
  );
  return id;
}

async function guardarEnDB(cotizacion: Cotizacion): Promise<number> {
  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const { rows } = await pool.query(
    `INSERT INTO cotizaciones
      (fecha, cliente_nombre, cliente_rut, cliente_telefono, cliente_email,
       cliente_whatsapp, productos, total_clp, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pendiente')
     RETURNING id`,
    [
      fecha,
      cotizacion.clienteNombre,
      cotizacion.clienteRut,
      cotizacion.clienteTelefono,
      cotizacion.clienteEmail,
      cotizacion.whatsappCliente,
      cotizacion.productos,
      cotizacion.total,
    ]
  );
  const id = rows[0].id as number;
  console.log(`[cotizaciones] Cotización #${id} guardada para ${cotizacion.clienteNombre}`);
  return id;
}

async function notificarVendedor(cotizacion: Cotizacion, id: number): Promise<void> {
  const vendedorPhone = process.env.VENDEDOR_PHONE;
  if (!vendedorPhone) {
    console.warn("[cotizaciones] VENDEDOR_PHONE no configurado — no se envió notificación");
    return;
  }

  const mensaje =
    `💼 *NUEVA COTIZACIÓN #${String(id).padStart(4, "0")}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Cliente:* ${cotizacion.clienteNombre}\n` +
    `🪪 *RUT:* ${cotizacion.clienteRut}\n` +
    `📱 *Teléfono:* ${cotizacion.clienteTelefono}\n` +
    `📧 *Email:* ${cotizacion.clienteEmail}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 *Productos:*\n${cotizacion.productos}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total estimado:* $${cotizacion.total.toLocaleString("es-CL")}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💬 Responder al cliente: wa.me/${cotizacion.whatsappCliente}`;

  await enviarMensaje(vendedorPhone, mensaje);
  console.log(`[cotizaciones] Vendedor notificado en ${vendedorPhone}`);
}

async function enviarConfirmacion(cotizacion: Cotizacion, id: number): Promise<void> {
  const asunto = `Cotización #${String(id).padStart(4, "0")} - ${process.env.BUSINESS_NAME ?? "Ferretería"}`;

  const cuerpo = `
Estimado/a ${cotizacion.clienteNombre},

Agradecemos tu solicitud de cotización. A continuación te presentamos los detalles:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COTIZACIÓN #${String(id).padStart(4, "0")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATOS DEL CLIENTE:
• Nombre: ${cotizacion.clienteNombre}
• RUT: ${cotizacion.clienteRut}
• Teléfono: ${cotizacion.clienteTelefono}
• Email: ${cotizacion.clienteEmail}

PRODUCTOS SOLICITADOS:
${cotizacion.productos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL ESTIMADO: $${cotizacion.total.toLocaleString("es-CL")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

En breve nos comunicaremos contigo para entregar los detalles finales de la cotización y coordinar las condiciones de pago y entrega.

Si tienes alguna pregunta, no dudes en contactarnos por WhatsApp o responder a este correo.

Saludos cordiales,
${process.env.BUSINESS_NAME ?? "Ferretería"}
Teléfono: ${process.env.VENDEDOR_PHONE ?? "N/A"}
Sitio web: ferreteria.cl
`;

  await enviarCorreo(
    cotizacion.clienteEmail,
    asunto,
    cuerpo
  );
  console.log(`[cotizaciones] Confirmación enviada a ${cotizacion.clienteEmail}`);
}
