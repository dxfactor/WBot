import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, ejecutarHerramienta } from "./tools";
import { registrarUso, limiteAlcanzado } from "./token-tracker";
import { MediaContent } from "./documents";
import { pool } from "./db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const businessName = process.env.BUSINESS_NAME ?? "Ferretería Tarugo";

const SYSTEM_PROMPT = `Eres el agente de cotizaciones de ${businessName} en WhatsApp. Tu nombre es *Conecta IA*.

Tu especialidad es analizar cotizaciones que los clientes reciben de otros proveedores o solicitudes de precio, y generar una propuesta competitiva basada en nuestro catálogo.

Cuando el cliente envía una cotización (imagen, PDF, Word o texto):
1. Extrae todos los productos, marcas, cantidades y precios indicados
2. Llama a la herramienta *registrar_cotizacion* con los productos identificados (SIEMPRE antes de responder)
3. Busca en el catálogo los productos equivalentes usando las herramientas de búsqueda
4. Presenta una tabla comparativa: producto | precio cotizado | nuestro precio | diferencia
5. Destaca el ahorro total si nuestros precios son mejores
6. Si algún producto no está en nuestro catálogo, indícalo honestamente

Si el cliente aún no ha enviado una cotización:
- Explícale que puede enviarla como imagen, PDF, Word o escribir los productos directamente
- NO llames a registrar_cotizacion hasta que haya una cotización real

Formato de respuesta:
- Usa *negrita* para nombres de productos y cifras importantes
- Muestra precios en CLP con separador de miles (ej: $12.990)
- Sé conciso y orientado a la venta

Limitaciones:
- Solo puedes consultar el catálogo, no registrar pedidos en este flujo
- Si el cliente quiere comprar tras ver la comparativa, indícale que escriba *menu* para ir al flujo de compra`;

// ── Tool definition exclusiva de cotización ──────────────────────────────────
const TOOL_REGISTRAR_COTIZACION: Anthropic.Tool = {
  name: "registrar_cotizacion",
  description:
    "Registra en el sistema los productos identificados en la cotización recibida. " +
    "Llámalo SIEMPRE cuando el cliente envíe una cotización real, antes de responder.",
  input_schema: {
    type: "object" as const,
    properties: {
      descripcion: {
        type: "string",
        description: "Breve descripción de la cotización (ej: 'Cotización de ferretería ABC – 5 productos')",
      },
      tipo: {
        type: "string",
        enum: ["imagen", "pdf", "word", "texto"],
        description: "Formato en que llegó la cotización",
      },
      productos: {
        type: "array",
        description: "Lista de productos identificados en la cotización",
        items: {
          type: "object",
          properties: {
            nombre:          { type: "string",  description: "Nombre del producto tal como aparece en la cotización" },
            cantidad:        { type: "number",  description: "Cantidad solicitada" },
            precio_cotizado: { type: "number",  description: "Precio unitario indicado en la cotización (0 si no aparece)" },
          },
          required: ["nombre", "cantidad", "precio_cotizado"],
        },
      },
    },
    required: ["descripcion", "productos"],
  },
};

// Herramientas disponibles en el flujo de cotización
const CATALOG_TOOL_NAMES = [
  "buscar_productos", "listar_categorias", "obtener_productos_por_categoria",
  "consultar_stock", "obtener_precio", "obtener_detalle_producto",
];

const TOOLS_COTIZACION: Anthropic.Tool[] = [
  ...toolDefinitions.filter((t) => CATALOG_TOOL_NAMES.includes(t.name)),
  TOOL_REGISTRAR_COTIZACION,
];

// ── Guardar cotización en BD ─────────────────────────────────────────────────
async function guardarCotizacion(
  userId:      string,
  descripcion: string,
  tipo:        string,
  productos:   unknown[]
): Promise<string> {
  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  await pool.query(
    `INSERT INTO cotizaciones (fecha, cliente_whatsapp, tipo, descripcion, productos_json, estado)
     VALUES ($1, $2, $3, $4, $5, 'Recibida')`,
    [fecha, userId, tipo ?? "texto", descripcion, JSON.stringify(productos)]
  );
  console.log(`[cotizacion] Guardada para ${userId}: ${descripcion}`);
  return JSON.stringify({ ok: true, mensaje: "Cotización registrada en el sistema." });
}

// ── Dispatcher local (con acceso a userId) ────────────────────────────────────
async function ejecutarHerramientaCotizacion(
  name:    string,
  input:   Record<string, unknown>,
  userId:  string
): Promise<string> {
  if (name === "registrar_cotizacion") {
    return guardarCotizacion(
      userId,
      input.descripcion as string,
      (input.tipo as string) ?? "texto",
      (input.productos as unknown[]) ?? []
    );
  }
  return ejecutarHerramienta(name, input);
}

// ── Construcción del contenido del mensaje ────────────────────────────────────
type ContentBlock = Anthropic.ContentBlockParam;

function buildUserContent(texto: string, media?: MediaContent): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  if (media) {
    if (media.tipo === "imagen") {
      blocks.push({
        type: "image",
        source: {
          type:       "base64",
          media_type: media.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data:       media.base64,
        },
      } as ContentBlock);
      blocks.push({ type: "text", text: texto || "Aquí te envío la cotización. Analízala y compara con nuestros precios." });
    } else if (media.tipo === "pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: media.base64 },
      } as unknown as ContentBlock);
      blocks.push({ type: "text", text: texto || "Te envío la cotización en PDF. Por favor analízala y compara con nuestros precios." });
    } else if (media.tipo === "word") {
      const intro = texto ? `${texto}\n\n` : "";
      blocks.push({
        type: "text",
        text: `${intro}Contenido de la cotización (${media.filename}):\n\n${media.texto}`,
      });
    } else {
      blocks.push({ type: "text", text: texto || "Adjunté un archivo pero el formato no es compatible. ¿Puedes enviarlo como imagen, PDF o escribir los productos?" });
    }
  } else {
    blocks.push({ type: "text", text: texto });
  }

  return blocks;
}

// ── Función principal ─────────────────────────────────────────────────────────
export async function procesarCotizacion(
  userId:    string,
  texto:     string,
  historial: Anthropic.MessageParam[],
  media?:    MediaContent
): Promise<{ respuesta: string; historialActualizado: Anthropic.MessageParam[] }> {
  if (limiteAlcanzado(userId)) {
    return {
      respuesta: "Has alcanzado el límite de consultas del día. Intenta mañana o contacta directamente a la tienda.",
      historialActualizado: historial,
    };
  }

  const userContent = buildUserContent(texto, media);
  const messages: Anthropic.MessageParam[] = [
    ...historial,
    { role: "user", content: userContent },
  ];

  let continuarLoop = true;
  let respuestaFinal = "";

  while (continuarLoop) {
    const response = await client.messages.create({
      model:      "claude-opus-4-7",
      max_tokens: 4096,
      system: [{
        type:          "text",
        text:          SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      }],
      tools:    TOOLS_COTIZACION,
      messages,
    });

    registrarUso(userId, response.usage);
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      respuestaFinal = textBlock?.text ?? "";
      continuarLoop  = false;
    } else if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map(async (t) => ({
            type:        "tool_result" as const,
            tool_use_id: t.id,
            content:     await ejecutarHerramientaCotizacion(
              t.name,
              t.input as Record<string, unknown>,
              userId
            ),
          }))
      );
      messages.push({ role: "user", content: toolResults });
    } else {
      continuarLoop = false;
    }
  }

  return { respuesta: respuestaFinal, historialActualizado: messages };
}
