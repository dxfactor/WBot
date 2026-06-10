/**
 * Genera data/hotel_reservas.xlsx con habitaciones y reservas dummy.
 * Ejecutar: npx ts-node --transpile-only scripts/generar-hotel.ts
 */
import * as XLSX from "xlsx";
import * as path from "path";

// ── Habitaciones ────────────────────────────────────────────────────────────
const habitaciones = [
  // Matrimonial Estándar (101–104)
  { Numero: "101", Tipo: "Matrimonial Estándar", Capacidad: 2, PrecioCLP: 75000, PrecioUSD: 84, Descripcion: "Cama queen, baño privado, TV 43\", WiFi, vista al patio interior" },
  { Numero: "102", Tipo: "Matrimonial Estándar", Capacidad: 2, PrecioCLP: 75000, PrecioUSD: 84, Descripcion: "Cama queen, baño privado, TV 43\", WiFi, vista al patio interior" },
  { Numero: "103", Tipo: "Matrimonial Estándar", Capacidad: 2, PrecioCLP: 75000, PrecioUSD: 84, Descripcion: "Cama queen, baño privado, TV 43\", WiFi, vista al jardín" },
  { Numero: "104", Tipo: "Matrimonial Estándar", Capacidad: 2, PrecioCLP: 79000, PrecioUSD: 88, Descripcion: "Cama queen extra larga, baño privado, TV 43\", WiFi, vista al jardín" },
  // Matrimonial Superior (105–108)
  { Numero: "105", Tipo: "Matrimonial Superior", Capacidad: 2, PrecioCLP: 89000, PrecioUSD: 99, Descripcion: "Cama king, baño con tina, TV 55\", WiFi, minibar, vista al parque" },
  { Numero: "106", Tipo: "Matrimonial Superior", Capacidad: 2, PrecioCLP: 89000, PrecioUSD: 99, Descripcion: "Cama king, baño con tina, TV 55\", WiFi, minibar, vista al parque" },
  { Numero: "107", Tipo: "Matrimonial Superior", Capacidad: 2, PrecioCLP: 95000, PrecioUSD: 106, Descripcion: "Cama king premium, baño con tina y ducha, TV 55\", WiFi, minibar, vista a la montaña" },
  { Numero: "108", Tipo: "Matrimonial Superior", Capacidad: 2, PrecioCLP: 95000, PrecioUSD: 106, Descripcion: "Cama king premium, baño con tina y ducha, TV 55\", WiFi, minibar, vista a la montaña" },
  // Doble Estándar (201–204)
  { Numero: "201", Tipo: "Doble Estándar",      Capacidad: 2, PrecioCLP: 65000, PrecioUSD: 72, Descripcion: "Dos camas individuales, baño privado, TV 43\", WiFi" },
  { Numero: "202", Tipo: "Doble Estándar",      Capacidad: 2, PrecioCLP: 65000, PrecioUSD: 72, Descripcion: "Dos camas individuales, baño privado, TV 43\", WiFi" },
  { Numero: "203", Tipo: "Doble Estándar",      Capacidad: 2, PrecioCLP: 69000, PrecioUSD: 77, Descripcion: "Dos camas individuales, baño privado, TV 43\", WiFi, vista al jardín" },
  { Numero: "204", Tipo: "Doble Estándar",      Capacidad: 2, PrecioCLP: 69000, PrecioUSD: 77, Descripcion: "Dos camas individuales, baño privado, TV 43\", WiFi, vista al jardín" },
  // Doble Superior (205–206)
  { Numero: "205", Tipo: "Doble Superior",      Capacidad: 2, PrecioCLP: 75000, PrecioUSD: 84, Descripcion: "Dos camas plaza y media, baño privado, TV 55\", WiFi, minibar" },
  { Numero: "206", Tipo: "Doble Superior",      Capacidad: 2, PrecioCLP: 75000, PrecioUSD: 84, Descripcion: "Dos camas plaza y media, baño privado, TV 55\", WiFi, minibar" },
  // Triple Estándar (301–302)
  { Numero: "301", Tipo: "Triple Estándar",     Capacidad: 3, PrecioCLP: 95000, PrecioUSD: 106, Descripcion: "Tres camas individuales, baño privado, TV 43\", WiFi" },
  { Numero: "302", Tipo: "Triple Estándar",     Capacidad: 3, PrecioCLP: 95000, PrecioUSD: 106, Descripcion: "Tres camas individuales, baño privado, TV 43\", WiFi" },
  // Triple Superior (303–304)
  { Numero: "303", Tipo: "Triple Superior",     Capacidad: 3, PrecioCLP: 109000, PrecioUSD: 121, Descripcion: "Cama matrimonial + 2 camas individuales, baño privado, TV 55\", WiFi, minibar" },
  { Numero: "304", Tipo: "Triple Superior",     Capacidad: 3, PrecioCLP: 109000, PrecioUSD: 121, Descripcion: "Cama matrimonial + 2 camas individuales, baño privado, TV 55\", WiFi, minibar" },
  // Familiar 5 pax (401–402)
  { Numero: "401", Tipo: "Familiar",            Capacidad: 5, PrecioCLP: 135000, PrecioUSD: 150, Descripcion: "Cama matrimonial + 3 camas individuales, 2 baños, TV 55\", WiFi, refrigerador" },
  { Numero: "402", Tipo: "Familiar",            Capacidad: 5, PrecioCLP: 135000, PrecioUSD: 150, Descripcion: "Cama matrimonial + 3 camas individuales, 2 baños, TV 55\", WiFi, refrigerador" },
  // Familiar Superior 5 pax (403–404)
  { Numero: "403", Tipo: "Familiar Superior",   Capacidad: 5, PrecioCLP: 149000, PrecioUSD: 166, Descripcion: "Cama king + 3 camas individuales, 2 baños, TV 65\", WiFi, minibar, sala de estar" },
  { Numero: "404", Tipo: "Familiar Superior",   Capacidad: 5, PrecioCLP: 149000, PrecioUSD: 166, Descripcion: "Cama king + 3 camas individuales, 2 baños, TV 65\", WiFi, minibar, sala de estar" },
];

// ── Reservas dummy ───────────────────────────────────────────────────────────
const reservas = [
  // Completadas (checkout ≤ 2 jun 2026)
  { ID: "RES-260501", Habitacion: "101", Huesped: "Ana Martínez Rojas",     RUT: "12.345.678-9", Telefono: "56932111222", Email: "ana.martinez@gmail.com",    FechaIngreso: "2026-05-28", FechaSalida: "2026-06-01", Noches: 4, PrecioPorNocheCLP: 75000,  TotalCLP: 300000,  TipoDocumento: "boleta",  Estado: "Completada" },
  { ID: "RES-260502", Habitacion: "201", Huesped: "Juan Carlos Reyes",      RUT: "11.234.567-8", Telefono: "56912345679", Email: "jc.reyes@hotmail.com",      FechaIngreso: "2026-05-29", FechaSalida: "2026-06-01", Noches: 3, PrecioPorNocheCLP: 65000,  TotalCLP: 195000,  TipoDocumento: "factura", Estado: "Completada" },
  { ID: "RES-260503", Habitacion: "105", Huesped: "Valentina Castro Mena",  RUT: "14.567.890-K", Telefono: "56912399901", Email: "v.castro@gmail.com",        FechaIngreso: "2026-05-30", FechaSalida: "2026-06-02", Noches: 3, PrecioPorNocheCLP: 89000,  TotalCLP: 267000,  TipoDocumento: "boleta",  Estado: "Completada" },
  // Activas hoy (2 jun 2026)
  { ID: "RES-260504", Habitacion: "102", Huesped: "Lucía González Parra",   RUT: "13.456.789-0", Telefono: "56923456789", Email: "l.gonzalez@gmail.com",      FechaIngreso: "2026-06-01", FechaSalida: "2026-06-04", Noches: 3, PrecioPorNocheCLP: 75000,  TotalCLP: 225000,  TipoDocumento: "boleta",  Estado: "Activa" },
  { ID: "RES-260505", Habitacion: "204", Huesped: "Nicolás Guerrero Salas", RUT: "15.678.901-2", Telefono: "56912345670", Email: "n.guerrero@outlook.com",    FechaIngreso: "2026-06-01", FechaSalida: "2026-06-03", Noches: 2, PrecioPorNocheCLP: 69000,  TotalCLP: 138000,  TipoDocumento: "boleta",  Estado: "Activa" },
  { ID: "RES-260506", Habitacion: "104", Huesped: "Pedro Muñoz Araya",      RUT: "16.789.012-3", Telefono: "56956789012", Email: "p.munoz@gmail.com",         FechaIngreso: "2026-06-02", FechaSalida: "2026-06-05", Noches: 3, PrecioPorNocheCLP: 79000,  TotalCLP: 237000,  TipoDocumento: "boleta",  Estado: "Activa" },
  { ID: "RES-260507", Habitacion: "106", Huesped: "Fernando Díaz Lobos",    RUT: "17.890.123-4", Telefono: "56934567892", Email: "f.diaz@empresa.cl",         FechaIngreso: "2026-06-02", FechaSalida: "2026-06-07", Noches: 5, PrecioPorNocheCLP: 89000,  TotalCLP: 445000,  TipoDocumento: "factura", Estado: "Activa" },
  { ID: "RES-260508", Habitacion: "301", Huesped: "Familia García Soto",    RUT: "18.901.234-5", Telefono: "56989012349", Email: "garcia.fam@gmail.com",      FechaIngreso: "2026-06-02", FechaSalida: "2026-06-06", Noches: 4, PrecioPorNocheCLP: 95000,  TotalCLP: 380000,  TipoDocumento: "boleta",  Estado: "Activa" },
  // Anulada
  { ID: "RES-260509", Habitacion: "204", Huesped: "Andrea Pizarro Vidal",   RUT: "19.012.345-6", Telefono: "56934567894", Email: "a.pizarro@gmail.com",       FechaIngreso: "2026-07-10", FechaSalida: "2026-07-14", Noches: 4, PrecioPorNocheCLP: 69000,  TotalCLP: 276000,  TipoDocumento: "boleta",  Estado: "Anulada" },
  // Confirmadas junio
  { ID: "RES-260510", Habitacion: "101", Huesped: "Roberto Pérez Lagos",    RUT: "20.123.456-7", Telefono: "56945678901", Email: "r.perez@gmail.com",         FechaIngreso: "2026-06-10", FechaSalida: "2026-06-13", Noches: 3, PrecioPorNocheCLP: 75000,  TotalCLP: 225000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260511", Habitacion: "103", Huesped: "Carmen Silva Vargas",    RUT: "10.234.567-8", Telefono: "56934567890", Email: "c.silva@gmail.com",         FechaIngreso: "2026-06-15", FechaSalida: "2026-06-18", Noches: 3, PrecioPorNocheCLP: 75000,  TotalCLP: 225000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260512", Habitacion: "105", Huesped: "Andrés Morales Cid",     RUT: "11.345.678-9", Telefono: "56901234567", Email: "a.morales@gmail.com",       FechaIngreso: "2026-06-06", FechaSalida: "2026-06-10", Noches: 4, PrecioPorNocheCLP: 89000,  TotalCLP: 356000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260513", Habitacion: "107", Huesped: "Rodrigo Alvarado Pino",  RUT: "12.456.789-0", Telefono: "56956789014", Email: "r.alvarado@gmail.com",      FechaIngreso: "2026-06-18", FechaSalida: "2026-06-22", Noches: 4, PrecioPorNocheCLP: 95000,  TotalCLP: 380000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260514", Habitacion: "108", Huesped: "Marco Antonio López",    RUT: "13.567.890-K", Telefono: "56978901236", Email: "m.lopez@empresa.cl",        FechaIngreso: "2026-06-12", FechaSalida: "2026-06-15", Noches: 3, PrecioPorNocheCLP: 95000,  TotalCLP: 285000,  TipoDocumento: "factura", Estado: "Confirmada" },
  { ID: "RES-260515", Habitacion: "201", Huesped: "María José Soto Bravo",  RUT: "14.678.901-2", Telefono: "56923456782", Email: "mj.soto@gmail.com",         FechaIngreso: "2026-06-14", FechaSalida: "2026-06-17", Noches: 3, PrecioPorNocheCLP: 65000,  TotalCLP: 195000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260516", Habitacion: "202", Huesped: "Alejandra Núñez Torres", RUT: "15.789.012-3", Telefono: "56945678904", Email: "a.nunez@gmail.com",         FechaIngreso: "2026-06-08", FechaSalida: "2026-06-11", Noches: 3, PrecioPorNocheCLP: 65000,  TotalCLP: 195000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260517", Habitacion: "203", Huesped: "Daniela Espinoza Cruz",  RUT: "16.890.123-4", Telefono: "56967890126", Email: "d.espinoza@gmail.com",      FechaIngreso: "2026-06-05", FechaSalida: "2026-06-08", Noches: 3, PrecioPorNocheCLP: 69000,  TotalCLP: 207000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260518", Habitacion: "205", Huesped: "Tomás Bravo Fuentes",    RUT: "17.901.234-5", Telefono: "56945678905", Email: "t.bravo@gmail.com",         FechaIngreso: "2026-06-07", FechaSalida: "2026-06-10", Noches: 3, PrecioPorNocheCLP: 75000,  TotalCLP: 225000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260519", Habitacion: "206", Huesped: "Diego Sandoval Rojas",   RUT: "18.012.345-6", Telefono: "56967890127", Email: "d.sandoval@gmail.com",      FechaIngreso: "2026-06-13", FechaSalida: "2026-06-17", Noches: 4, PrecioPorNocheCLP: 75000,  TotalCLP: 300000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260520", Habitacion: "302", Huesped: "Familia Jiménez Muñoz",  RUT: "19.123.456-7", Telefono: "56934567895", Email: "jimenez.fam@gmail.com",     FechaIngreso: "2026-06-10", FechaSalida: "2026-06-14", Noches: 4, PrecioPorNocheCLP: 95000,  TotalCLP: 380000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260521", Habitacion: "303", Huesped: "Familia Gómez Herrera",  RUT: "20.234.567-8", Telefono: "56956789017", Email: "gomez.fam@empresa.cl",      FechaIngreso: "2026-06-06", FechaSalida: "2026-06-11", Noches: 5, PrecioPorNocheCLP: 109000, TotalCLP: 545000,  TipoDocumento: "factura", Estado: "Confirmada" },
  { ID: "RES-260522", Habitacion: "304", Huesped: "Familia Flores Castro",  RUT: "10.345.678-9", Telefono: "56978901239", Email: "flores.fam@gmail.com",      FechaIngreso: "2026-06-17", FechaSalida: "2026-06-22", Noches: 5, PrecioPorNocheCLP: 109000, TotalCLP: 545000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260523", Habitacion: "401", Huesped: "Familia Pérez Martínez", RUT: "11.456.789-0", Telefono: "56912345672", Email: "perez.martinez@gmail.com",  FechaIngreso: "2026-06-05", FechaSalida: "2026-06-10", Noches: 5, PrecioPorNocheCLP: 135000, TotalCLP: 675000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260524", Habitacion: "402", Huesped: "Familia Muñoz Díaz",     RUT: "12.567.890-K", Telefono: "56945678907", Email: "munoz.diaz@gmail.com",      FechaIngreso: "2026-06-08", FechaSalida: "2026-06-14", Noches: 6, PrecioPorNocheCLP: 135000, TotalCLP: 810000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260525", Habitacion: "403", Huesped: "Familia Silva Alvarado", RUT: "13.678.901-2", Telefono: "56967890129", Email: "silva.alvarado@empresa.cl", FechaIngreso: "2026-06-12", FechaSalida: "2026-06-18", Noches: 6, PrecioPorNocheCLP: 149000, TotalCLP: 894000,  TipoDocumento: "factura", Estado: "Confirmada" },
  { ID: "RES-260526", Habitacion: "404", Huesped: "Familia Contreras N.",   RUT: "14.789.012-3", Telefono: "56989012341", Email: "contreras.nunez@gmail.com", FechaIngreso: "2026-06-03", FechaSalida: "2026-06-08", Noches: 5, PrecioPorNocheCLP: 149000, TotalCLP: 745000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  // Confirmadas julio
  { ID: "RES-260527", Habitacion: "102", Huesped: "Miguel Ángel Torres",    RUT: "15.890.123-4", Telefono: "56978901234", Email: "m.torres@gmail.com",        FechaIngreso: "2026-07-10", FechaSalida: "2026-07-14", Noches: 4, PrecioPorNocheCLP: 75000,  TotalCLP: 300000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260528", Habitacion: "105", Huesped: "Patricia Fuentes Mora",  RUT: "16.901.234-5", Telefono: "56923456781", Email: "p.fuentes@gmail.com",       FechaIngreso: "2026-07-12", FechaSalida: "2026-07-16", Noches: 4, PrecioPorNocheCLP: 89000,  TotalCLP: 356000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260529", Habitacion: "301", Huesped: "Familia Rodríguez Vega", RUT: "17.012.345-6", Telefono: "56912345671", Email: "rodriguez.vega@gmail.com",  FechaIngreso: "2026-07-05", FechaSalida: "2026-07-10", Noches: 5, PrecioPorNocheCLP: 95000,  TotalCLP: 475000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
  { ID: "RES-260530", Habitacion: "401", Huesped: "Familia González Soto",  RUT: "18.123.456-7", Telefono: "56923456785", Email: "gonzalez.soto@gmail.com",   FechaIngreso: "2026-07-20", FechaSalida: "2026-07-26", Noches: 6, PrecioPorNocheCLP: 135000, TotalCLP: 810000,  TipoDocumento: "boleta",  Estado: "Confirmada" },
];

// ── Generar Excel ────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

const sheetHab = XLSX.utils.json_to_sheet(habitaciones);
sheetHab["!cols"] = [
  { wch: 8 }, { wch: 22 }, { wch: 11 }, { wch: 12 }, { wch: 11 }, { wch: 70 },
];
XLSX.utils.book_append_sheet(wb, sheetHab, "Habitaciones");

const sheetRes = XLSX.utils.json_to_sheet(reservas);
sheetRes["!cols"] = [
  { wch: 12 }, { wch: 11 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 28 },
  { wch: 13 }, { wch: 12 }, { wch: 7 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
];
XLSX.utils.book_append_sheet(wb, sheetRes, "Reservas");

const outputPath = path.join(__dirname, "../data/hotel_reservas.xlsx");
XLSX.writeFile(wb, outputPath);
console.log(`✅ Generado: ${outputPath}`);
console.log(`   ${habitaciones.length} habitaciones, ${reservas.length} reservas`);
