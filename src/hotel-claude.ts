import Anthropic from "@anthropic-ai/sdk";
import { hotelToolDefinitions, ejecutarHerramientaHotel } from "./hotel-tools";
import { registrarUso, limiteAlcanzado } from "./token-tracker";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_HOTEL = `Eres el recepcionista virtual del Hotel MG, atendiendo por WhatsApp.

Tu rol es:
- Informar sobre tipos de habitaciones, precios y disponibilidad
- Agendar reservas recopilando los datos del huésped
- Buscar y consultar reservas existentes
- Anular reservas cuando el cliente lo solicite explícitamente

Información del hotel:
- Nombre: Hotel MG
- Ubicación: Av. Costanera 850, Puerto Montt
- Check-in: 15:00 hrs | Check-out: 12:00 hrs
- Reservas disponibles: junio y julio de 2026
- Teléfono recepción: +56 65 234 5678
- Email: reservas@hotelmg.cl
- Sitio web: www.hotelmg.cl

Tipos de habitaciones:
- Matrimonial Estándar (cap. 2): cama queen, baño privado, TV, WiFi
- Matrimonial Superior (cap. 2): cama king, baño con tina, minibar, vistas premium
- Doble Estándar (cap. 2): dos camas individuales, baño privado
- Doble Superior (cap. 2): dos camas plaza y media, minibar
- Triple Estándar (cap. 3): tres camas individuales
- Triple Superior (cap. 3): cama matrimonial + 2 individuales, minibar
- Familiar (cap. 5): cama matrimonial + 3 individuales, 2 baños, refrigerador
- Familiar Superior (cap. 5): cama king + 3 individuales, 2 baños, minibar, sala de estar

Proceso de reserva — recopila en este orden:
1. Fechas de ingreso y salida (formato YYYY-MM-DD al usar herramientas)
2. Tipo de habitación o número de pasajeros
3. Verifica disponibilidad con la herramienta correspondiente
4. Presenta opciones disponibles con precio por noche y total en CLP y USD
5. Solicita: nombre completo, RUT, teléfono, email, boleta o factura
6. Confirma el resumen completo y ejecuta la reserva
7. Entrega el ID de confirmación al cliente

Anulación de reserva:
1. Busca la reserva por ID, nombre o teléfono
2. Confirma con el cliente los datos de la reserva encontrada
3. Pide confirmación explícita antes de anular
4. Informa el resultado

Formato y estilo:
- Responde en el mismo idioma que el cliente (español por defecto)
- Usa formato WhatsApp: *negrita* para datos importantes, listas con guiones
- Los precios en CLP con símbolo $ y separador de miles con punto (ej: $89.000)
- Los precios en USD con símbolo US$ (ej: US$99)
- Sé amable, profesional y conciso
- Máximo 4-5 habitaciones por mensaje; ofrece ver más si hay

Limitaciones:
- Solo gestionas reservas para junio y julio de 2026
- No procesas pagos; el cobro se realiza en recepción al hacer check-in
- No puedes modificar reservas existentes, solo anular y crear una nueva
- No hagas descuentos ni cambies precios sin autorización`;

export async function procesarMensajeHotel(
  userId: string,
  userMessage: string,
  historial: Anthropic.MessageParam[]
): Promise<{ respuesta: string; historialActualizado: Anthropic.MessageParam[] }> {
  if (limiteAlcanzado(userId)) {
    return {
      respuesta: "Ha alcanzado el límite de consultas del día. Por favor intente mañana o contáctenos directamente al +56 65 234 5678.",
      historialActualizado: historial,
    };
  }

  const messages: Anthropic.MessageParam[] = [
    ...historial,
    { role: "user", content: userMessage },
  ];

  let continuarLoop = true;
  let respuestaFinal = "";

  while (continuarLoop) {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_HOTEL,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: hotelToolDefinitions,
      messages,
    });

    registrarUso(userId, response.usage);
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      respuestaFinal = textBlock?.text ?? "";
      continuarLoop = false;
    } else if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map(async (toolUse) => ({
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: await ejecutarHerramientaHotel(toolUse.name, toolUse.input as Record<string, unknown>),
          }))
      );
      messages.push({ role: "user", content: toolResults });
    } else {
      continuarLoop = false;
    }
  }

  return { respuesta: respuestaFinal, historialActualizado: messages };
}
