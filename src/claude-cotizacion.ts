import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, ejecutarHerramienta } from "./tools";
import { registrarUso, limiteAlcanzado } from "./token-tracker";
import { MediaContent } from "./documents";
import { pool } from "./db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const businessName = process.env.BUSINESS_NAME ?? "Ferretería Tarugo";

const SYSTEM_PROMPT = `Eres el agente de cotizaciones de *${businessName}* en WhatsApp. Tu nombre es *Conecta IA*.

## Flujo obligatorio — sigue estos pasos en orden:

### PASO 1 — Recibir la cotización
Cuando el cliente envíe imagen, PDF, Word o texto con productos:
- Extrae todos los productos y cantidades indicados
- NO menciones precios de otros proveedores ni hagas comparativas de precios

### PASO 2 — Solicitar datos del cliente
Antes de validar productos, solicita estos datos si no los tienes:
1. *Nombre completo*
2. *Teléfono de contacto*
3. *Email* (para enviarle la cotización)

Puedes pedir los tres en un solo mensaje. Espera la respuesta antes de continuar.

### PASO 3 — Validar productos contra catálogo
Con los datos del cliente recibidos, valida cada producto:
- Usa *buscar_productos* o *obtener_detalle_producto* para buscarlo
- Si *EXISTE* en catálogo: inclúyelo con stock y precio disponible
- Si *NO EXISTE*: busca la alternativa más similar con *buscar_productos* y proponla indicando claramente que es una alternativa
- Si no hay alternativa posible: indícalo honestamente

### PASO 4 — Presentar resumen al cliente
Muestra el listado validado:
- ✅ Productos encontrados directamente en catálogo
- 🔄 Alternativas propuestas (indicar por qué es alternativa)
- ❌ Productos sin alternativa disponible

Pregunta al cliente si confirma continuar con este listado.

### PASO 5 — Registrar la cotización
Cuando el cliente confirme:
- Llama a *registrar_cotizacion* con todos los datos del cliente y productos validados
- Informa que la cotización quedó registrada y se enviará por email a la dirección indicada

## Reglas importantes:
- NO compares con precios de otros proveedores
- NO registres la cotización sin datos del cliente completos (nombre, teléfono, email)
- NO registres sin confirmación explícita del cliente
- Usa *negrita* para nombres de productos y datos importantes
- Muestra precios en CLP: $12.990
- Máximo 4 productos por mensaje para no saturar; ofrece ver más si los hay`;

// ── Tool exclusivo de cotización ─────────────────────────────────────────────
const TOOL_REGISTRAR_COT: Anthropic.Tool = {
  name: "registrar_cotizacion",
  description:
    "Registra la cotización validada en el sistema con los datos del cliente. " +
    "Llámalo SOLO cuando el cliente haya confirmado el listado de productos y tengas nombre, teléfono y email completos.",
  input_schema: {
    type: "object" as const,
    properties: {
      cliente_nombre:   { type: "string", description: "Nombre completo del cliente" },
      cliente_telefono: { type: "string", description: "Teléfono de contacto" },
      cliente_email:    { type: "string", description: "Email para enviar la cotización" },
      descripcion:      { type: "string", description: "Resumen breve de la cotización (ej: 'Cotización 5 productos — ferretería')" },
      tipo:             { type: "string", enum: ["imagen","pdf","word","texto"], description: "Formato en que llegó la cotización" },
      productos: {
        type: "array",
        description: "Productos validados contra el catálogo",
        items: {
          type: "object",
          properties: {
            nombre_cotizado:  { type: "string",  description: "Nombre del producto tal como lo pidió el cliente" },
            cantidad:         { type: "number",  description: "Cantidad solicitada" },
            id_catalogo:      { type: "string",  description: "ID del producto en catálogo (vacío si no hay match)" },
            nombre_catalogo:  { type: "string",  description: "Nombre del producto en catálogo" },
            es_alternativa:   { type: "boolean", description: "true si es sugerencia alternativa, false si es match exacto" },
            nota:             { type: "string",  description: "Explicación de la alternativa (opcional)" },
          },
          required: ["nombre_cotizado", "cantidad", "es_alternativa"],
        },
      },
    },
    required: ["cliente_nombre","cliente_telefono","cliente_email","descripcion","productos"],
  },
};

// Herramientas disponibles
const CATALOG_TOOL_NAMES = [
  "buscar_productos","listar_categorias","obtener_productos_por_categoria",
  "consultar_stock","obtener_precio","obtener_detalle_producto",
];
const TOOLS_COT: Anthropic.Tool[] = [
  ...toolDefinitions.filter((t) => CATALOG_TOOL_NAMES.includes(t.name)),
  TOOL_REGISTRAR_COT,
];

// ── Persistencia ─────────────────────────────────────────────────────────────
async function guardarCotizacion(userId: string, input: Record<string, unknown>): Promise<string> {
  const fecha = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const { rows } = await pool.query(
    `INSERT INTO cotizaciones
       (fecha, cliente_whatsapp, cliente_nombre, cliente_telefono, cliente_email,
        tipo, descripcion, productos_json, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Recibida')
     RETURNING id`,
    [
      fecha,
      userId,
      String(input.cliente_nombre   ?? ""),
      String(input.cliente_telefono ?? ""),
      String(input.cliente_email    ?? ""),
      String(input.tipo ?? "texto"),
      String(input.descripcion ?? ""),
      JSON.stringify(input.productos ?? []),
    ]
  );
  const id = rows[0].id as number;
  console.log(`[cotizacion] #${id} guardada para ${userId} — ${input.cliente_email}`);
  return JSON.stringify({
    ok: true,
    numeroCotizacion: `#${String(id).padStart(4,"0")}`,
    mensaje: `Cotización registrada con el número *#${String(id).padStart(4,"0")}*. Se enviará por email a ${input.cliente_email}.`,
  });
}

// ── Dispatcher local ──────────────────────────────────────────────────────────
async function ejecutarTool(name: string, input: Record<string, unknown>, userId: string): Promise<string> {
  if (name === "registrar_cotizacion") return guardarCotizacion(userId, input);
  return ejecutarHerramienta(name, input);
}

// ── Contenido multimedia ──────────────────────────────────────────────────────
type Block = Anthropic.ContentBlockParam;

function buildContent(texto: string, media?: MediaContent): Block[] {
  const blocks: Block[] = [];
  if (media) {
    if (media.tipo === "imagen") {
      blocks.push({ type:"image", source:{ type:"base64", media_type: media.mimeType as "image/jpeg"|"image/png"|"image/webp"|"image/gif", data:media.base64 } } as Block);
      blocks.push({ type:"text", text: texto || "Aquí te envío la cotización. Por favor identifica los productos y ayúdame a procesarla." });
    } else if (media.tipo === "pdf") {
      blocks.push({ type:"document", source:{ type:"base64", media_type:"application/pdf", data:media.base64 } } as unknown as Block);
      blocks.push({ type:"text", text: texto || "Aquí te envío la cotización en PDF." });
    } else if (media.tipo === "word") {
      blocks.push({ type:"text", text:`${texto ? texto+"\n\n" : ""}Contenido de la cotización (${media.filename}):\n\n${media.texto}` });
    } else {
      blocks.push({ type:"text", text: texto || "El archivo no es compatible. Envíalo como imagen, PDF, Word o escribe los productos directamente." });
    }
  } else {
    blocks.push({ type:"text", text: texto });
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
      respuesta: "Has alcanzado el límite de consultas del día. Intenta mañana.",
      historialActualizado: historial,
    };
  }

  const messages: Anthropic.MessageParam[] = [
    ...historial,
    { role: "user", content: buildContent(texto, media) },
  ];

  let loop = true;
  let respuestaFinal = "";

  while (loop) {
    const response = await client.messages.create({
      model:      "claude-opus-4-7",
      max_tokens: 4096,
      system: [{ type:"text", text:SYSTEM_PROMPT, cache_control:{ type:"ephemeral" } }],
      tools:    TOOLS_COT,
      messages,
    });

    registrarUso(userId, response.usage);
    messages.push({ role:"assistant", content:response.content });

    if (response.stop_reason === "end_turn") {
      respuestaFinal = (response.content.find((b): b is Anthropic.TextBlock => b.type==="text") )?.text ?? "";
      loop = false;
    } else if (response.stop_reason === "tool_use") {
      const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map(async (t) => ({
            type:        "tool_result" as const,
            tool_use_id: t.id,
            content:     await ejecutarTool(t.name, t.input as Record<string,unknown>, userId),
          }))
      );
      messages.push({ role:"user", content:results });
    } else {
      loop = false;
    }
  }

  return { respuesta: respuestaFinal, historialActualizado: messages };
}
