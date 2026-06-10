import { Router } from "express";
import { getReservas, getHabitaciones, anularReserva } from "./hotel-catalog";

const router = Router();

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasRestantes(fechaSalida: string): number {
  const hoyD  = new Date(hoy());
  const salida = new Date(fechaSalida);
  return Math.round((salida.getTime() - hoyD.getTime()) / 86_400_000);
}

function enRango(fecha: string, desdeDias: number, hastaDias: number): boolean {
  const d = diasRestantes(fecha);
  // Para entradas, d es días desde hoy hasta el ingreso
  const diff = Math.round((new Date(fecha).getTime() - new Date(hoy()).getTime()) / 86_400_000);
  return diff >= desdeDias && diff <= hastaDias;
}

router.get("/api/hotel/dashboard", (_req, res) => {
  try {
    const reservas    = getReservas();
    const habitaciones = getHabitaciones();
    const habMap      = new Map(habitaciones.map((h) => [h.numero, h]));
    const fechaHoy    = hoy();

    const activas = reservas
      .filter((r) => r.estado === "Activa")
      .sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida))
      .map((r) => ({
        ...r,
        tipo:            habMap.get(r.habitacion)?.tipo ?? "",
        descripcion:     habMap.get(r.habitacion)?.descripcion ?? "",
        diasRestantes:   diasRestantes(r.fechaSalida),
        saleHoy:         r.fechaSalida === fechaHoy,
        saleManana:      diasRestantes(r.fechaSalida) === 1,
      }));

    const proximasEntradas = reservas
      .filter((r) => {
        if (r.estado !== "Confirmada") return false;
        const diff = Math.round((new Date(r.fechaIngreso).getTime() - new Date(fechaHoy).getTime()) / 86_400_000);
        return diff >= 0;
      })
      .sort((a, b) => a.fechaIngreso.localeCompare(b.fechaIngreso))
      .map((r) => ({
        ...r,
        tipo:            habMap.get(r.habitacion)?.tipo ?? "",
        diasParaIngreso: Math.round((new Date(r.fechaIngreso).getTime() - new Date(fechaHoy).getTime()) / 86_400_000),
        entraHoy:        r.fechaIngreso === fechaHoy,
      }));

    const proximasSalidas = activas
      .map((r) => ({ ...r, tipo: habMap.get(r.habitacion)?.tipo ?? "" }));

    const entradasHoy = proximasEntradas.filter((r) => r.entraHoy).length;
    const salidasHoy  = activas.filter((r) => r.saleHoy).length;

    res.json({
      fechaActual: fechaHoy,
      resumen: {
        totalHabitaciones: habitaciones.length,
        ocupadas:          activas.length,
        entradasHoy,
        salidasHoy,
      },
      activas,
      proximasEntradas,
      proximasSalidas,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/api/hotel/anular/:id", (req, res) => {
  try {
    const reserva = anularReserva(req.params.id);
    res.json({ ok: true, reserva });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: (err as Error).message });
  }
});

export default router;
