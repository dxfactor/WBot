import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.join(__dirname, "../data/hotel_reservas.xlsx");

export interface Habitacion {
  numero:     string;
  tipo:       string;
  capacidad:  number;
  precioCLP:  number;
  precioUSD:  number;
  descripcion: string;
}

export interface Reserva {
  id:               string;
  habitacion:       string;
  huesped:          string;
  rut:              string;
  telefono:         string;
  email:            string;
  fechaIngreso:     string; // "YYYY-MM-DD"
  fechaSalida:      string; // "YYYY-MM-DD"
  noches:           number;
  precioPorNocheCLP: number;
  totalCLP:         number;
  tipoDocumento:    "boleta" | "factura";
  estado:           "Confirmada" | "Activa" | "Completada" | "Anulada";
}

// ── Lectura ──────────────────────────────────────────────────────────────────

function leerWorkbook(): XLSX.WorkBook {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`No se encontró ${EXCEL_PATH}. Ejecuta: npx ts-node --transpile-only scripts/generar-hotel.ts`);
  }
  return XLSX.readFile(EXCEL_PATH);
}

export function getHabitaciones(): Habitacion[] {
  const wb = leerWorkbook();
  const sheet = wb.Sheets["Habitaciones"];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return filas.map((f) => ({
    numero:      String(f["Numero"]      ?? ""),
    tipo:        String(f["Tipo"]        ?? ""),
    capacidad:   Number(f["Capacidad"]   ?? 0),
    precioCLP:   Number(f["PrecioCLP"]   ?? 0),
    precioUSD:   Number(f["PrecioUSD"]   ?? 0),
    descripcion: String(f["Descripcion"] ?? ""),
  }));
}

export function getReservas(): Reserva[] {
  const wb = leerWorkbook();
  const sheet = wb.Sheets["Reservas"];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return filas.map((f) => ({
    id:               String(f["ID"]               ?? ""),
    habitacion:       String(f["Habitacion"]       ?? ""),
    huesped:          String(f["Huesped"]          ?? ""),
    rut:              String(f["RUT"]              ?? ""),
    telefono:         String(f["Telefono"]         ?? ""),
    email:            String(f["Email"]            ?? ""),
    fechaIngreso:     String(f["FechaIngreso"]     ?? ""),
    fechaSalida:      String(f["FechaSalida"]      ?? ""),
    noches:           Number(f["Noches"]           ?? 0),
    precioPorNocheCLP: Number(f["PrecioPorNocheCLP"] ?? 0),
    totalCLP:         Number(f["TotalCLP"]         ?? 0),
    tipoDocumento:    (String(f["TipoDocumento"] ?? "boleta")) as Reserva["tipoDocumento"],
    estado:           (String(f["Estado"]        ?? "Confirmada")) as Reserva["estado"],
  }));
}

// ── Escritura ────────────────────────────────────────────────────────────────

function guardarReservas(reservas: Reserva[]): void {
  const wb = leerWorkbook();
  const filas = reservas.map((r) => ({
    ID: r.id, Habitacion: r.habitacion, Huesped: r.huesped, RUT: r.rut,
    Telefono: r.telefono, Email: r.email, FechaIngreso: r.fechaIngreso,
    FechaSalida: r.fechaSalida, Noches: r.noches,
    PrecioPorNocheCLP: r.precioPorNocheCLP, TotalCLP: r.totalCLP,
    TipoDocumento: r.tipoDocumento, Estado: r.estado,
  }));
  const sheet = XLSX.utils.json_to_sheet(filas);
  sheet["!cols"] = [
    { wch: 12 }, { wch: 11 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 28 },
    { wch: 13 }, { wch: 12 }, { wch: 7 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
  ];
  wb.Sheets["Reservas"] = sheet;
  XLSX.writeFile(wb, EXCEL_PATH);
}

function generarId(): string {
  const reservas = getReservas();
  const nums = reservas
    .map((r) => parseInt(r.id.replace("RES-", ""), 10))
    .filter((n) => !isNaN(n));
  const siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 260600;
  return `RES-${siguiente}`;
}

// ── Consultas ────────────────────────────────────────────────────────────────

function conflictan(aIng: string, aSal: string, bIng: string, bSal: string): boolean {
  return aIng < bSal && aSal > bIng;
}

export function verificarDisponibilidad(
  fechaIngreso: string,
  fechaSalida:  string,
  tipo?:        string,
  capacidadMin?: number
): { disponibles: Habitacion[]; ocupadas: string[] } {
  const todasHabs = getHabitaciones();
  const reservas  = getReservas();

  const habsFiltradas = todasHabs.filter((h) => {
    if (tipo && !h.tipo.toLowerCase().includes(tipo.toLowerCase())) return false;
    if (capacidadMin && h.capacidad < capacidadMin) return false;
    return true;
  });

  const reservasActivas = reservas.filter(
    (r) => r.estado === "Confirmada" || r.estado === "Activa"
  );

  const ocupadas = new Set<string>();
  for (const r of reservasActivas) {
    if (conflictan(fechaIngreso, fechaSalida, r.fechaIngreso, r.fechaSalida)) {
      ocupadas.add(r.habitacion);
    }
  }

  return {
    disponibles: habsFiltradas.filter((h) => !ocupadas.has(h.numero)),
    ocupadas:    habsFiltradas.filter((h) =>  ocupadas.has(h.numero)).map((h) => h.numero),
  };
}

export function buscarReserva(criterio: string): Reserva[] {
  const q = criterio.toLowerCase().trim();
  return getReservas().filter(
    (r) =>
      r.id.toLowerCase().includes(q) ||
      r.huesped.toLowerCase().includes(q) ||
      r.rut.replace(/\./g, "").replace(/-/g, "").includes(q.replace(/\./g, "").replace(/-/g, "")) ||
      r.telefono.includes(q)
  );
}

export function crearReserva(data: {
  habitacion:    string;
  huesped:       string;
  rut:           string;
  telefono:      string;
  email:         string;
  fechaIngreso:  string;
  fechaSalida:   string;
  tipoDocumento: "boleta" | "factura";
}): Reserva {
  const hab = getHabitaciones().find((h) => h.numero === data.habitacion);
  if (!hab) throw new Error(`Habitación ${data.habitacion} no existe.`);

  const ingreso = new Date(data.fechaIngreso);
  const salida  = new Date(data.fechaSalida);
  const noches  = Math.round((salida.getTime() - ingreso.getTime()) / 86_400_000);
  if (noches <= 0) throw new Error("La fecha de salida debe ser posterior a la de ingreso.");

  const { disponibles } = verificarDisponibilidad(data.fechaIngreso, data.fechaSalida);
  if (!disponibles.find((h) => h.numero === data.habitacion)) {
    throw new Error(`La habitación ${data.habitacion} no está disponible para esas fechas.`);
  }

  const reserva: Reserva = {
    id:               generarId(),
    habitacion:       data.habitacion,
    huesped:          data.huesped,
    rut:              data.rut,
    telefono:         data.telefono,
    email:            data.email,
    fechaIngreso:     data.fechaIngreso,
    fechaSalida:      data.fechaSalida,
    noches,
    precioPorNocheCLP: hab.precioCLP,
    totalCLP:         hab.precioCLP * noches,
    tipoDocumento:    data.tipoDocumento,
    estado:           "Confirmada",
  };

  const todas = getReservas();
  todas.push(reserva);
  guardarReservas(todas);
  return reserva;
}

export function anularReserva(id: string): Reserva {
  const todas = getReservas();
  const idx = todas.findIndex((r) => r.id.toLowerCase() === id.toLowerCase());
  if (idx === -1) throw new Error(`No se encontró la reserva ${id}.`);
  if (todas[idx].estado === "Anulada") throw new Error(`La reserva ${id} ya está anulada.`);
  if (todas[idx].estado === "Completada") throw new Error(`No se puede anular una reserva ya completada.`);

  todas[idx] = { ...todas[idx], estado: "Anulada" };
  guardarReservas(todas);
  return todas[idx];
}

export function tiposHabitacion(): { tipo: string; cantidad: number; capacidad: number; precioCLP: number; precioUSD: number }[] {
  const habs = getHabitaciones();
  const mapa = new Map<string, { cantidad: number; capacidad: number; precioCLP: number; precioUSD: number }>();
  for (const h of habs) {
    if (!mapa.has(h.tipo)) {
      mapa.set(h.tipo, { cantidad: 0, capacidad: h.capacidad, precioCLP: h.precioCLP, precioUSD: h.precioUSD });
    }
    mapa.get(h.tipo)!.cantidad++;
  }
  return Array.from(mapa.entries()).map(([tipo, v]) => ({ tipo, ...v }));
}
