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
