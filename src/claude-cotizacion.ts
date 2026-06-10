import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, ejecutarHerramienta } from "./tools";
import { registrarUso, limiteAlcanzado } from "./token-tracker";
import { MediaContent } from "./documents";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const businessName = process.env.BUSINESS_NAME ?? "Ferretería Tarugo";

const SYSTEM_PROMPT = `Eres el agente de cotizaciones de ${businessName} en WhatsApp. Tu nombre es *Conecta IA*.

Tu especialidad es analizar cotizaciones que los clientes reciben de otros proveedores o solicitudes de precio, y generar una propuesta competitiva basada en nuestro catálogo.

Cuando el cliente envía una cotización (imagen, PDF, Word o texto):
1. Extrae todos los productos, marcas, cantidades y precios indicados
2. Busca en nuestro catálogo los productos equivalentes usando las herramientas
3. Presenta una tabla comparativa clara: producto | precio cotizado | nuestro precio | diferencia
4. Destaca el ahorro total si nuestros precios son mejores
5. Si algún producto no está en nuestro catálogo, indícalo honestamente

Si el cliente aún no ha enviado una cotización:
- Explícale que puede enviarte la cotización como imagen, PDF o Word
- También puede escribir los productos y cantidades directamente

Formato de respuesta:
- Usa *negrita* para nombres de productos y cifras importantes
- Muestra precios en CLP con separador de miles (ej: $12.990)
- Sé conciso y orientado a la venta

Limitaciones:
- Solo puedes consultar el catálogo, no registrar pedidos en este flujo
- Si el cliente quiere comprar tras ver la comparativa, indícale que escriba "menu" para ir al flujo de compra`;

// Solo herramientas de catálogo (sin registrar/actualizar pedidos)
const TOOLS_COTIZACION = toolDefinitions.filter((t) =>
  ["buscar_productos", "listar_categorias", "obtener_productos_por_categoria",
   "consultar_stock", "obtener_precio", "obtener_detalle_producto"].includes(t.name)
);

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
      if (texto) blocks.push({ type: "text", text: texto });
      else       blocks.push({ type: "text", text: "Aquí te envío la cotización. ¿Puedes analizarla y compararla con sus precios?" });
    } else if (media.tipo === "pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: media.base64 },
      } as unknown as ContentBlock);
      if (texto) blocks.push({ type: "text", text: texto });
      else       blocks.push({ type: "text", text: "Te envío la cotización en PDF. Por favor analízala y compara con sus precios." });
    } else if (media.tipo === "word") {
      const intro = texto ? `${texto}\n\n` : "";
      blocks.push({
        type: "text",
        text: `${intro}Contenido de la cotización (documento Word — ${media.filename}):\n\n${media.texto}`,
      });
    } else {
      blocks.push({ type: "text", text: `${texto || "Adjunté un archivo pero el formato no es compatible. ¿Puedes enviarla como imagen, PDF o escribe los productos?"}` });
    }
  } else {
    blocks.push({ type: "text", text: texto });
  }

  return blocks;
}

export async function procesarCotizacion(
  userId:   string,
  texto:    string,
  historial: Anthropic.MessageParam[],
  media?:   MediaContent
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
            content:     await ejecutarHerramienta(t.name, t.input as Record<string, unknown>),
          }))
      );
      messages.push({ role: "user", content: toolResults });
    } else {
      continuarLoop = false;
    }
  }

  return { respuesta: respuestaFinal, historialActualizado: messages };
}
