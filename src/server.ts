import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import session from "express-session";
import { enviarMensaje, marcarComoLeido, extraerMensajes, WebhookPayload } from "./whatsapp";
import { transcribirAudio } from "./audio";
import { procesarMensaje } from "./claude";
import { procesarCotizacion } from "./claude-cotizacion";
import { procesarArchivo } from "./documents";
import { getSession, updateSession, getFlow, setFlow } from "./sessions";
import { getResumen } from "./token-tracker";
import authRoutes from "./auth-routes";
import dashboardRoutes from "./dashboard-routes";

const app = express();
app.use(express.json());

// Servir archivos estáticos desde public/
const publicPath = path.resolve(__dirname, "../public");
app.use(express.static(publicPath));

// Rutas explícitas para dashboards
app.get("/cotizaciones-dashboard.html", (_req, res) => {
  const filePath = path.resolve(publicPath, "cotizaciones-dashboard.html");
  console.log(`[server] Sirviendo ${filePath}`);
  res.sendFile(filePath, (err) => {
    if (err) console.error("[server] Error sirviendo archivo:", err);
  });
});

app.use(session({
  secret:            process.env.SESSION_SECRET ?? "tarugo-secret-2026",
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 },
}));

app.use(authRoutes);
app.use(dashboardRoutes);

// Dashboard de cotizaciones
app.get("/cotizaciones", (_req, res) => {
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(__dirname, "../public/cotizaciones-dashboard.html");
  try {
    const html = fs.readFileSync(filePath, "utf-8");
    res.type("text/html").send(html);
  } catch (err) {
    res.status(500).send("<h1>Error cargando dashboard</h1>");
  }
});

// ── Mensajes del menú ────────────────────────────────────────────────────────
const businessName = process.env.BUSINESS_NAME ?? "Ferretería Tarugo";

const MSG_MENU = `👋 ¡Hola! Bienvenido a *${businessName}*.\n\n¿En qué puedo ayudarte hoy?\n\n1️⃣ *Compra* — Consulta catálogo, precios y realiza tu pedido\n2️⃣ *Cotización* — Analizo tu cotización y la comparo con nuestros precios\n\nResponde con *1* o *2* para continuar.`;

const MSG_BIENVENIDA_COMPRA =
  `🔧 ¡Perfecto! Estás en el flujo de *compra*.\n¿Qué producto estás buscando?`;

const MSG_BIENVENIDA_COTIZACION =
  `📄 ¡Listo! Estás en el flujo de *cotización*.\n\nEnvíame la cotización que recibiste como:\n• 🖼️ *Imagen* (foto o captura de pantalla)\n• 📑 *PDF*\n• 📝 *Word* (.docx)\n• ✍️ O escribe los productos y precios directamente\n\nLa compararé con nuestro catálogo y te doy una propuesta.`;

const MSG_VOLVER_MENU =
  `🔄 Volviste al menú principal.\n\n${MSG_MENU.split("\n").slice(1).join("\n")}`;

// ── Keywords de navegación ───────────────────────────────────────────────────
function esMenuKeyword(texto: string): boolean {
  return ["menu", "menú", "inicio", "0", "volver", "salir"].includes(texto.toLowerCase().trim());
}

// ── Webhook verificación ─────────────────────────────────────────────────────
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

// ── Recepción de mensajes ─────────────────────────────────────────────────────
app.post("/webhook", async (req: Request, res: Response) => {
  res.sendStatus(200);

  const payload = req.body as WebhookPayload;
  if (payload.object !== "whatsapp_business_account") return;

  const mensajes = extraerMensajes(payload);

  for (const mensaje of mensajes) {
    const userId = mensaje.from;

    await marcarComoLeido(mensaje.id).catch(() => {});

    const esTexto     = mensaje.type === "text"     && !!mensaje.text?.body;
    const esAudio     = (mensaje.type === "audio" || mensaje.type === "voice") && !!(mensaje.audio?.id ?? mensaje.voice?.id);
    const esImagen    = mensaje.type === "image"    && !!mensaje.image?.id;
    const esDocumento = mensaje.type === "document" && !!mensaje.document?.id;

    if (!esTexto && !esAudio && !esImagen && !esDocumento) continue;

    try {
      // ── 1. Determinar texto de entrada ──────────────────────────────────
      let texto = "";

      if (esTexto) {
        texto = mensaje.text!.body.trim();
        console.log(`[${new Date().toISOString()}] Texto de ${userId}: ${texto}`);
      } else if (esAudio) {
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

      // ── 2. Gestión del menú / flujo ──────────────────────────────────────
      const flow = getFlow(userId);

      // Volver al menú
      if (esTexto && esMenuKeyword(texto)) {
        setFlow(userId, null);
        await enviarMensaje(userId, MSG_VOLVER_MENU);
        continue;
      }

      // Sin flujo activo → mostrar menú o procesar selección
      if (!flow) {
        if (esTexto && texto === "1") {
          setFlow(userId, "compra");
          await enviarMensaje(userId, MSG_BIENVENIDA_COMPRA);
        } else if (esTexto && texto === "2") {
          setFlow(userId, "cotizacion");
          await enviarMensaje(userId, MSG_BIENVENIDA_COTIZACION);
        } else {
          await enviarMensaje(userId, MSG_MENU);
        }
        continue;
      }

      // ── 3. Flujo COMPRA ──────────────────────────────────────────────────
      if (flow === "compra") {
        if (esImagen || esDocumento) {
          await enviarMensaje(userId,
            "📄 Para analizar documentos o imágenes usa el flujo de *cotización*.\nEscribe *menu* para cambiar."
          );
          continue;
        }
        const historial = getSession(userId);
        const { respuesta, historialActualizado } = await procesarMensaje(userId, texto, historial);
        updateSession(userId, historialActualizado);
        if (respuesta) {
          await enviarMensaje(userId, respuesta);
          console.log(`[${new Date().toISOString()}] [compra] → ${userId}: ${respuesta.substring(0, 80)}...`);
        }
        continue;
      }

      // ── 4. Flujo COTIZACIÓN ──────────────────────────────────────────────
      if (flow === "cotizacion") {
        let media;
        const caption = esImagen
          ? (mensaje.image!.caption ?? "")
          : esDocumento ? (mensaje.document!.caption ?? "") : "";
        const textoFinal = texto || caption;

        if (esImagen || esDocumento) {
          await enviarMensaje(userId, "⏳ Analizando tu archivo…").catch(() => {});
          try {
            const mediaId  = esImagen ? mensaje.image!.id : mensaje.document!.id;
            const mimeType = esImagen ? mensaje.image!.mime_type : mensaje.document!.mime_type;
            const filename = esDocumento ? (mensaje.document!.filename ?? "archivo") : "imagen";
            media = await procesarArchivo(mediaId, mimeType, filename);

            if (media.tipo === "no_soportado") {
              await enviarMensaje(userId,
                `❌ El archivo *${filename}* no es compatible.\nEnvíalo como imagen, PDF o Word (.docx).`
              );
              continue;
            }
          } catch (err) {
            console.error(`Error procesando archivo de ${userId}:`, err);
            await enviarMensaje(userId, "No pude leer el archivo. ¿Puedes intentarlo de nuevo?").catch(() => {});
            continue;
          }
        }

        const historial = getSession(userId);
        const { respuesta, historialActualizado } = await procesarCotizacion(
          userId, textoFinal, historial, media
        );
        updateSession(userId, historialActualizado);
        if (respuesta) {
          await enviarMensaje(userId, respuesta);
          console.log(`[${new Date().toISOString()}] [cotizacion] → ${userId}: ${respuesta.substring(0, 80)}...`);
        }
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
  console.log(`🤖 Conecta IA — ${businessName} corriendo en puerto ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`   Webhook: POST /webhook | Stats: GET /stats`);
});
