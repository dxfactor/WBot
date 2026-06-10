import OpenAI, { toFile } from "openai";
import axios from "axios";

const BASE_URL = "https://graph.facebook.com/v20.0";

export async function transcribirAudio(mediaId: string): Promise<string> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const authHeader = { Authorization: `Bearer ${token}` };

  // 1. Obtener URL de descarga desde la API de Meta
  const metaRes = await axios.get<{ url: string; mime_type: string }>(
    `${BASE_URL}/${mediaId}`,
    { headers: authHeader }
  );
  const { url, mime_type } = metaRes.data;

  // 2. Descargar el binario del audio
  const audioRes = await axios.get<ArrayBuffer>(url, {
    headers: authHeader,
    responseType: "arraybuffer",
  });

  const buffer   = Buffer.from(audioRes.data);
  const ext      = mime_type.includes("ogg") ? "ogg"
                 : mime_type.includes("mp4") ? "mp4"
                 : mime_type.includes("mpeg") ? "mp3"
                 : "ogg";

  // 3. Transcribir con Whisper
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result = await openai.audio.transcriptions.create({
    file:  await toFile(buffer, `audio.${ext}`, { type: mime_type }),
    model: "whisper-1",
    // Sin language → detección automática (español, inglés, etc.)
  });

  return result.text.trim();
}
