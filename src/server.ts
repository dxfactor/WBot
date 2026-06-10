import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import session from "express-session";
import { enviarMensaje, marcarComoLeido, extraerMensajes, WebhookPayload } from "./whatsapp";
import { transcribirAudio } from "./audio";
import { procesarMensaje } from "./claude";
import { getSession, updateSession } from "./sessions";
import { getResumen } from "./token-tracker";
import authRoutes from "./auth-routes";
import dashboardRoutes from "./dashboard-routes";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use(session({
  secret:            process.env.SESSION_SECRET ?? "tarugo-secret-2026",
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 }, // 8 h
}));

app.use(authRoutes);
app.use(dashboardRoutes);

// Verificación del webhook
app.get("/webhook", (req: Request, res: Response) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recepción de mensajes
app.post("/webhook", async (req: Request, res: Response) => {
  res.sendStatus(200);

  const payload = req.body as WebhookPayload;
  if (payload.object !== "whatsapp_business_account") return;

  const mensajes = extraerMensajes(payload);

  for (const mensaje of mensajes) {
    const esTexto = mensaje.type === "text" && !!mensaje.text?.body;
    const esAudio = (mensaje.type === "audio" || mensaje.type === "voice") &&
                    !!(mensaje.audio?.id ?? mensaje.voice?.id);

    if (!esTexto && !esAudio) continue;

    const userId = mensaje.from;
    let texto    = "";

    await marcarComoLeido(mensaje.id).catch(() => {});

    if (esTexto) {
      texto = mensaje.text!.body.trim();
      console.log(`[${new Date().toISOString()}] Texto de ${userId}: ${texto}`);
    } else {
      if (!process.env.OPENAI_API_KEY) {
        await enviarMensaje(userId, "Lo siento, la transcripción de audio no está disponible en este momento.").catch(() => {});
        continue;
      }

      await enviarMensaje(userId, "🎤 Transcribiendo tu mensaje de voz…").catch(() => {});

      try {
        const mediaId = (mensaje.audio?.id ?? mensaje.voice?.id)!;
        texto = await transcribirAudio(mediaId);
        console.log(`[${new Date().toISOString()}] Audio transcrito de ${userId}: ${texto}`);
      } catch (err) {
        console.error(`Error transcribiendo audio de ${userId}:`, err);
        await enviarMensaje(userId, "No pude transcribir el mensaje de voz. ¿Puedes escribirlo?").catch(() => {});
        continue;
      }
    }

    try {
      const historial = getSession(userId);
      const { respuesta, historialActualizado } = await procesarMensaje(userId, texto, historial);
      updateSession(userId, historialActualizado);

      if (respuesta) {
        await enviarMensaje(userId, respuesta);
        console.log(`[${new Date().toISOString()}] Respuesta a ${userId}: ${respuesta.substring(0, 80)}...`);
      }
    } catch (error) {
      console.error(`Error procesando mensaje de ${userId}:`, error);
      await enviarMensaje(
        userId,
        "Lo siento, tuve un problema procesando tu mensaje. ¿Puedes intentarlo de nuevo?"
      ).catch(() => {});
    }
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/stats", (_req: Request, res: Response) => {
  res.json(getResumen());
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => {
  console.log(`🤖 WhatsApp Bot — Ferretería Tarugo corriendo en puerto ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`   Webhook: POST /webhook | Stats: GET /stats`);
});
