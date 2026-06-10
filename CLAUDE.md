# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development with hot reload (ts-node-dev)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled output

ngrok http 3000  # Expose local server for Meta webhook (run in separate terminal)
```

No test suite exists. Manual testing requires a real WhatsApp Business account and ngrok tunnel.

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Description |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Meta permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from Meta dashboard |
| `WHATSAPP_VERIFY_TOKEN` | Arbitrary string used to verify webhook registration |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `BUSINESS_NAME` | Business name shown in Claude's greeting |
| `VENDEDOR_PHONE` | Seller's WhatsApp number (e.g. `56912345678`) — receives order notifications |
| `OPENAI_API_KEY` | OpenAI API key — optional; enables voice message transcription via Whisper |
| `PORT` | HTTP port, defaults to `3000` |

## Architecture

The bot supports multiple business contexts. Each user's session tracks which context is active. Writing `ferreteria` or `hotel` in WhatsApp switches the context and clears the conversation history.

**Request flow:**
1. Meta sends a webhook `POST /webhook` on each incoming WhatsApp message
2. `server.ts` immediately responds `200`; audio messages are transcribed via OpenAI Whisper (`audio.ts`) before further processing
3. Context-switch keywords (`ferreteria`/`hotel`) clear history and set the session context; messages without a context receive a selector prompt
4. Each context has its own agentic loop: Claude (`claude-opus-4-7`) with tools; if `stop_reason === "tool_use"`, executes all requested tools in parallel and loops; exits on `end_turn`
5. Tool dispatchers call the appropriate data layer (`catalog.ts` for ferretería, `hotel-catalog.ts` for hotel)

**Modules:**
- `src/server.ts` — Express app, context-switch detection, routing to ferretería or hotel processor
- `src/sessions.ts` — In-memory session per phone number with `context: "ferreteria" | "hotel" | null`; expires after 30 min
- `src/claude.ts` — Ferretería: system prompt (prompt-cached) + agentic loop
- `src/tools.ts` — Ferretería: tool definitions + dispatcher → `catalog.ts`, `orders.ts`
- `src/catalog.ts` — Reads `data/catalogo.xlsx` (sheet "Productos", columns: ID, Nombre, Categoria, Precio, Stock, Descripcion, SKU). Reloads on every call
- `src/orders.ts` — Appends confirmed orders to `data/pedidos.xlsx`, notifies seller via WhatsApp
- `src/hotel-claude.ts` — Hotel MG: system prompt (prompt-cached) + agentic loop
- `src/hotel-tools.ts` — Hotel: tool definitions + dispatcher → `hotel-catalog.ts`
- `src/hotel-catalog.ts` — Reads/writes `data/hotel_reservas.xlsx` (sheets: "Habitaciones", "Reservas"); handles availability checks and reservation CRUD
- `src/audio.ts` — Downloads audio from Meta, transcribes via OpenAI Whisper (`whisper-1`); requires `OPENAI_API_KEY`
- `src/hotel-routes.ts` — Express router for hotel management REST API (`GET /api/hotel/dashboard`, `POST /api/hotel/anular/:id`); served alongside the WhatsApp webhook
- `src/whatsapp.ts` — Thin wrapper over Meta Graph API v20.0
- `src/token-tracker.ts` — Daily token/cost tracking per user; exposes `getResumen()` for `/stats`

**Web dashboard (`public/hotel-dashboard.html`):** Static HTML dashboard that calls `/api/hotel/dashboard` and `/api/hotel/anular/:id`. Served automatically by Express from `public/`. Open `http://localhost:3000/hotel-dashboard.html` while the server is running.

**Data files (`data/`):**
- `catalogo.xlsx` — Ferretería product catalog
- `pedidos.xlsx` — Auto-generated ferretería order log
- `hotel_reservas.xlsx` — Hotel rooms (sheet "Habitaciones") and reservations (sheet "Reservas"); written on every new/cancelled booking

## Hotel Data

The Excel `data/hotel_reservas.xlsx` is the source of truth. To regenerate it with fresh dummy data:
```bash
npx ts-node --transpile-only scripts/generar-hotel.ts
```
20 rooms: 8 Matrimonial (101–108), 6 Doble (201–206), 4 Triple (301–304), 4 Familiar/5pax (401–404). Reservations span June–July 2026. Date overlap detection excludes "Anulada" and "Completada" statuses.

## Catalog Integration

`catalog.ts` is designed as the ERP integration point. All six exported functions (`buscarProductos`, `obtenerProductoPorId`, `obtenerProductosPorCategoria`, `listarCategorias`, `consultarStock`, `obtenerPrecio`) share a stable interface. Replace the Excel reads with HTTP calls to an ERP without touching anything else.

## Adding New Tools

1. Add the `Anthropic.Tool` definition to the `toolDefinitions` array in `tools.ts`
2. Add a `case` to `ejecutarHerramienta` in the same file
3. Implement the backing function in `catalog.ts` or a new module

Tool results must be returned as JSON strings. Claude receives all tool results in a single `user` message before the next turn.
