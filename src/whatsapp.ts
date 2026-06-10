import axios from "axios";

const BASE_URL = "https://graph.facebook.com/v20.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function enviarMensaje(to: string, texto: string): Promise<void> {
  await axios.post(
    `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto, preview_url: false },
    },
    { headers: getHeaders() }
  );
}

export async function marcarComoLeido(messageId: string): Promise<void> {
  await axios.post(
    `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
    { headers: getHeaders() }
  );
}

// Tipos para el payload del webhook de Meta
export interface WebhookMessage {
  from:      string;
  id:        string;
  timestamp: string;
  type:      string;
  text?:     { body: string };
  audio?:    { id: string; mime_type: string };
  voice?:    { id: string; mime_type: string };
  image?:    { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
}

export async function descargarMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const authHeader = { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };

  const meta = await axios.get<{ url: string; mime_type: string }>(
    `${BASE_URL}/${mediaId}`,
    { headers: authHeader }
  );

  const file = await axios.get<ArrayBuffer>(meta.data.url, {
    headers: authHeader,
    responseType: "arraybuffer",
  });

  return { buffer: Buffer.from(file.data), mimeType: meta.data.mime_type };
}

export interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string; display_phone_number: string };
        messages?: WebhookMessage[];
        statuses?: Array<{ id: string; status: string }>;
      };
      field: string;
    }>;
  }>;
}

export function extraerMensajes(payload: WebhookPayload): WebhookMessage[] {
  return payload.entry.flatMap((entry) =>
    entry.changes.flatMap((change) => change.value.messages ?? [])
  );
}
