import { descargarMedia } from "./whatsapp";

export type MediaContent =
  | { tipo: "imagen";   base64: string; mimeType: string }
  | { tipo: "pdf";      base64: string }
  | { tipo: "word";     texto: string; filename: string }
  | { tipo: "no_soportado"; filename: string };

/**
 * Descarga el archivo desde Meta y lo convierte al formato adecuado para Claude.
 * - Imágenes → base64 (Claude vision)
 * - PDF      → base64 (Claude document block nativo)
 * - Word     → texto extraído con mammoth
 */
export async function procesarArchivo(
  mediaId: string,
  mimeType: string,
  filename = "archivo"
): Promise<MediaContent> {
  const { buffer } = await descargarMedia(mediaId);

  // ── Imagen ──────────────────────────────────────────────────────────────
  if (mimeType.startsWith("image/")) {
    return { tipo: "imagen", base64: buffer.toString("base64"), mimeType };
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    return { tipo: "pdf", base64: buffer.toString("base64") };
  }

  // ── Word (.docx / .doc) ──────────────────────────────────────────────────
  if (
    mimeType.includes("officedocument.wordprocessingml") ||
    mimeType.includes("msword") ||
    filename.toLowerCase().match(/\.docx?$/)
  ) {
    try {
      const mammoth = await import("mammoth");
      const result  = await mammoth.extractRawText({ buffer });
      return { tipo: "word", texto: result.value.trim(), filename };
    } catch (err) {
      console.error("[documents] Error extrayendo texto Word:", err);
      return { tipo: "no_soportado", filename };
    }
  }

  return { tipo: "no_soportado", filename };
}
