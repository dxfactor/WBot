import Anthropic from "@anthropic-ai/sdk";
import {
  tiposHabitacion,
  verificarDisponibilidad,
  buscarReserva,
  crearReserva,
  anularReserva,
} from "./hotel-catalog";

export const hotelToolDefinitions: Anthropic.Tool[] = [
  {
    name: "listar_tipos_habitacion",
    description: "Lista todos los tipos de habitación del hotel con precios en CLP y USD, capacidad y cantidad disponible. Úsalo cuando el cliente pregunte qué tipos de habitaciones hay o cuánto cuestan.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "verificar_disponibilidad",
    description: "Verifica qué habitaciones están disponibles para un rango de fechas. Puede filtrar por tipo de habitación o capacidad mínima de pasajeros.",
    input_schema: {
      type: "object" as const,
      properties: {
        fecha_ingreso:  { type: "string", description: "Fecha de check-in en formato YYYY-MM-DD" },
        fecha_salida:   { type: "string", description: "Fecha de check-out en formato YYYY-MM-DD" },
        tipo:           { type: "string", description: "Filtro opcional por tipo: 'Matrimonial', 'Doble', 'Triple', 'Familiar'" },
        capacidad_min:  { type: "number", description: "Número mínimo de pasajeros (filtra habitaciones con capacidad ≥ este valor)" },
      },
      required: ["fecha_ingreso", "fecha_salida"],
    },
  },
  {
    name: "buscar_reserva",
    description: "Busca una reserva por ID de reserva, nombre del huésped, RUT o número de teléfono.",
    input_schema: {
      type: "object" as const,
      properties: {
        criterio: { type: "string", description: "ID de reserva (ej: RES-260510), nombre, RUT o teléfono del huésped" },
      },
      required: ["criterio"],
    },
  },
  {
    name: "agendar_reserva",
    description: "Crea una nueva reserva confirmada. Úsalo SOLO cuando tengas: habitación elegida, nombre completo, RUT, teléfono, email, fechas de ingreso y salida, y tipo de documento. Verifica la disponibilidad antes de llamar esta herramienta.",
    input_schema: {
      type: "object" as const,
      properties: {
        habitacion:     { type: "string", description: "Número de habitación (ej: '105', '301')" },
        huesped:        { type: "string", description: "Nombre completo del huésped" },
        rut:            { type: "string", description: "RUT del huésped (ej: 12.345.678-9)" },
        telefono:       { type: "string", description: "Teléfono de contacto (ej: 56912345678)" },
        email:          { type: "string", description: "Correo electrónico" },
        fecha_ingreso:  { type: "string", description: "Fecha de check-in en formato YYYY-MM-DD" },
        fecha_salida:   { type: "string", description: "Fecha de check-out en formato YYYY-MM-DD" },
        tipo_documento: { type: "string", enum: ["boleta", "factura"], description: "Tipo de documento tributario" },
      },
      required: ["habitacion", "huesped", "rut", "telefono", "email", "fecha_ingreso", "fecha_salida", "tipo_documento"],
    },
  },
  {
    name: "anular_reserva",
    description: "Anula una reserva existente por su ID. Úsalo cuando el cliente confirme explícitamente que desea cancelar una reserva específica.",
    input_schema: {
      type: "object" as const,
      properties: {
        id_reserva: { type: "string", description: "ID de la reserva a anular (ej: RES-260510)" },
      },
      required: ["id_reserva"],
    },
  },
];

export async function ejecutarHerramientaHotel(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "listar_tipos_habitacion": {
      const tipos = tiposHabitacion();
      return JSON.stringify({ tipos });
    }

    case "verificar_disponibilidad": {
      const { fecha_ingreso, fecha_salida, tipo, capacidad_min } = input as {
        fecha_ingreso: string; fecha_salida: string; tipo?: string; capacidad_min?: number;
      };
      const result = verificarDisponibilidad(fecha_ingreso, fecha_salida, tipo, capacidad_min);
      const noches = Math.round(
        (new Date(fecha_salida).getTime() - new Date(fecha_ingreso).getTime()) / 86_400_000
      );
      return JSON.stringify({
        fechaIngreso: fecha_ingreso,
        fechaSalida:  fecha_salida,
        noches,
        disponibles: result.disponibles.map((h) => ({
          numero:    h.numero,
          tipo:      h.tipo,
          capacidad: h.capacidad,
          precioPorNocheCLP: h.precioCLP,
          precioPorNocheUSD: h.precioUSD,
          totalCLP:  h.precioCLP * noches,
          totalUSD:  h.precioUSD * noches,
        })),
        ocupadas: result.ocupadas,
      });
    }

    case "buscar_reserva": {
      const encontradas = buscarReserva(input.criterio as string);
      if (encontradas.length === 0) {
        return JSON.stringify({ encontradas: 0, mensaje: "No se encontraron reservas con ese criterio." });
      }
      return JSON.stringify({ encontradas: encontradas.length, reservas: encontradas });
    }

    case "agendar_reserva": {
      try {
        const reserva = crearReserva({
          habitacion:    input.habitacion    as string,
          huesped:       input.huesped       as string,
          rut:           input.rut           as string,
          telefono:      input.telefono      as string,
          email:         input.email         as string,
          fechaIngreso:  input.fecha_ingreso as string,
          fechaSalida:   input.fecha_salida  as string,
          tipoDocumento: input.tipo_documento as "boleta" | "factura",
        });
        return JSON.stringify({ ok: true, reserva });
      } catch (err) {
        return JSON.stringify({ ok: false, mensaje: (err as Error).message });
      }
    }

    case "anular_reserva": {
      try {
        const reserva = anularReserva(input.id_reserva as string);
        return JSON.stringify({ ok: true, reserva });
      } catch (err) {
        return JSON.stringify({ ok: false, mensaje: (err as Error).message });
      }
    }

    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
  }
}
