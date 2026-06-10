/**
 * Precios claude-opus-4-7 (USD por millón de tokens).
 * Actualizar si Anthropic cambia las tarifas.
 */
const PRECIO = {
  input:      15.00,
  output:     75.00,
  cacheWrite: 18.75,
  cacheRead:   1.875,
} as const;

export interface UsageSnapshot {
  inputTokens:      number;
  outputTokens:     number;
  cacheWriteTokens: number;
  cacheReadTokens:  number;
  llamadas:         number;
  costoUSD:         number;
}

interface DailyStats {
  fecha:      string;                    // "YYYY-MM-DD"
  total:      UsageSnapshot;
  porUsuario: Map<string, UsageSnapshot>;
}

function snapVacio(): UsageSnapshot {
  return { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, llamadas: 0, costoUSD: 0 };
}

function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function calcularCosto(u: {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}): number {
  return (
    (u.inputTokens      * PRECIO.input      +
     u.outputTokens     * PRECIO.output     +
     u.cacheWriteTokens * PRECIO.cacheWrite +
     u.cacheReadTokens  * PRECIO.cacheRead) / 1_000_000
  );
}

let stats: DailyStats = {
  fecha:      fechaHoy(),
  total:      snapVacio(),
  porUsuario: new Map(),
};

function resetearSiCambioElDia(): void {
  const hoy = fechaHoy();
  if (stats.fecha !== hoy) {
    stats = { fecha: hoy, total: snapVacio(), porUsuario: new Map() };
  }
}

export function registrarUso(
  userId: string,
  usage: {
    input_tokens:                number;
    output_tokens:               number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?:    number | null;
  }
): void {
  resetearSiCambioElDia();

  const delta = {
    inputTokens:      usage.input_tokens,
    outputTokens:     usage.output_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens:  usage.cache_read_input_tokens     ?? 0,
  };
  const costo = calcularCosto(delta);

  // Acumular en total global
  stats.total.inputTokens      += delta.inputTokens;
  stats.total.outputTokens     += delta.outputTokens;
  stats.total.cacheWriteTokens += delta.cacheWriteTokens;
  stats.total.cacheReadTokens  += delta.cacheReadTokens;
  stats.total.llamadas         += 1;
  stats.total.costoUSD         += costo;

  // Acumular por usuario
  if (!stats.porUsuario.has(userId)) {
    stats.porUsuario.set(userId, snapVacio());
  }
  const u = stats.porUsuario.get(userId)!;
  u.inputTokens      += delta.inputTokens;
  u.outputTokens     += delta.outputTokens;
  u.cacheWriteTokens += delta.cacheWriteTokens;
  u.cacheReadTokens  += delta.cacheReadTokens;
  u.llamadas         += 1;
  u.costoUSD         += costo;

  const totalUsuario = u.inputTokens + u.outputTokens;
  console.log(
    `[tokens] ${userId} | +${delta.inputTokens}in +${delta.outputTokens}out` +
    (delta.cacheReadTokens ? ` +${delta.cacheReadTokens}cacheHit` : "") +
    ` | usuario hoy: ${totalUsuario.toLocaleString()} tok ($${u.costoUSD.toFixed(4)})` +
    ` | global hoy: ${(stats.total.inputTokens + stats.total.outputTokens).toLocaleString()} tok ($${stats.total.costoUSD.toFixed(4)})`
  );
}

/**
 * Devuelve true si el usuario superó el límite diario de tokens.
 * El límite se configura con MAX_TOKENS_USUARIO_DIA (0 = sin límite).
 */
export function limiteAlcanzado(userId: string): boolean {
  const limite = parseInt(process.env.MAX_TOKENS_USUARIO_DIA ?? "0", 10);
  if (limite <= 0) return false;

  resetearSiCambioElDia();
  const u = stats.porUsuario.get(userId);
  if (!u) return false;

  const totalUsuario = u.inputTokens + u.outputTokens;
  return totalUsuario >= limite;
}

export function getResumen() {
  resetearSiCambioElDia();

  const usuariosActivos = Array.from(stats.porUsuario.entries()).map(([id, s]) => ({
    usuario: id,
    ...s,
    costoUSD: Number(s.costoUSD.toFixed(6)),
  }));

  return {
    fecha: stats.fecha,
    total: {
      ...stats.total,
      costoUSD: Number(stats.total.costoUSD.toFixed(6)),
    },
    usuariosActivos,
    limiteTokensUsuarioDia: parseInt(process.env.MAX_TOKENS_USUARIO_DIA ?? "0", 10) || "sin límite",
    precios_usd_por_millon: PRECIO,
  };
}
