import Anthropic from "@anthropic-ai/sdk";
import {
  buscarProductos,
  consultarStock,
  obtenerPrecio,
  listarCategorias,
  obtenerProductosPorCategoria,
  obtenerProductoPorId,
} from "./catalog";
import { registrarPedido } from "./orders";

// Definiciones de herramientas que Claude puede invocar
export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "buscar_productos",
    description:
      "Busca productos en el catálogo por nombre, descripción, categoría o SKU. Úsalo cuando el cliente mencione un producto o quiera saber qué vendemos.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Término de búsqueda (nombre, tipo de producto, marca, etc.)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "listar_categorias",
    description:
      "Lista todas las categorías de productos disponibles. Úsalo cuando el cliente quiera ver qué tipos de productos vendemos o pida ver el catálogo completo.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "obtener_productos_por_categoria",
    description: "Obtiene todos los productos de una categoría específica.",
    input_schema: {
      type: "object" as const,
      properties: {
        categoria: {
          type: "string",
          description: "Nombre exacto de la categoría (ej: Herramientas Eléctricas, Plomería, Pintura y Accesorios)",
        },
      },
      required: ["categoria"],
    },
  },
  {
    name: "consultar_stock",
    description:
      "Consulta el stock disponible de un producto por su ID. Úsalo cuando el cliente pregunte si hay disponibilidad o quiera confirmar antes de comprar.",
    input_schema: {
      type: "object" as const,
      properties: {
        producto_id: {
          type: "string",
          description: "ID del producto (ej: HER001, PLO002)",
        },
      },
      required: ["producto_id"],
    },
  },
  {
    name: "obtener_precio",
    description:
      "Obtiene el precio de un producto por su ID. Úsalo cuando el cliente pregunte por el precio de un producto específico.",
    input_schema: {
      type: "object" as const,
      properties: {
        producto_id: {
          type: "string",
          description: "ID del producto (ej: HER001, PLO002)",
        },
      },
      required: ["producto_id"],
    },
  },
  {
    name: "obtener_detalle_producto",
    description:
      "Obtiene todos los detalles de un producto: nombre, descripción completa, precio, stock y SKU.",
    input_schema: {
      type: "object" as const,
      properties: {
        producto_id: {
          type: "string",
          description: "ID del producto",
        },
      },
      required: ["producto_id"],
    },
  },
  {
    name: "registrar_pedido",
    description:
      "Registra el pedido una vez que el cliente confirmó los productos y entregó todos sus datos. Notifica al vendedor por WhatsApp y guarda el pedido en el sistema. Úsalo SOLO cuando tengas: nombre, RUT, teléfono, dirección (o confirmación de retiro en tienda), tipo de documento (boleta/factura) y los productos con cantidades.",
    input_schema: {
      type: "object" as const,
      properties: {
        cliente_nombre: { type: "string", description: "Nombre completo del cliente" },
        cliente_rut: { type: "string", description: "RUT del cliente (ej: 12.345.678-9)" },
        cliente_telefono: { type: "string", description: "Teléfono de contacto del cliente" },
        cliente_direccion: { type: "string", description: "Dirección de despacho o 'Retiro en tienda'" },
        tipo_documento: { type: "string", enum: ["boleta", "factura"], description: "Tipo de documento tributario" },
        razon_social: { type: "string", description: "Razón social (solo si es factura)" },
        giro: { type: "string", description: "Giro comercial (solo si es factura)" },
        productos: { type: "string", description: "Descripción del pedido: productos, cantidades y precios unitarios" },
        total: { type: "number", description: "Total del pedido en CLP (número entero)" },
        whatsapp_cliente: { type: "string", description: "Número WhatsApp del cliente sin + (ej: 56912345678)" },
      },
      required: ["cliente_nombre", "cliente_rut", "cliente_telefono", "cliente_direccion", "tipo_documento", "productos", "total", "whatsapp_cliente"],
    },
  },
];

// Ejecuta la herramienta solicitada por Claude y retorna el resultado como string
export async function ejecutarHerramienta(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "buscar_productos": {
      const productos = await buscarProductos(input.query as string);
      if (productos.length === 0) {
        return JSON.stringify({ encontrados: 0, mensaje: "No se encontraron productos para esa búsqueda." });
      }
      return JSON.stringify({
        encontrados: productos.length,
        productos: productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          precio: p.precio,
          stock: p.stock,
          descripcion_corta: p.descripcion.substring(0, 100) + "...",
        })),
      });
    }

    case "listar_categorias": {
      const categorias = await listarCategorias();
      return JSON.stringify({ categorias });
    }

    case "obtener_productos_por_categoria": {
      const productos = await obtenerProductosPorCategoria(input.categoria as string);
      if (productos.length === 0) {
        return JSON.stringify({ encontrados: 0, mensaje: `No hay productos en la categoría "${input.categoria}".` });
      }
      return JSON.stringify({
        categoria: input.categoria,
        encontrados: productos.length,
        productos: productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          stock: p.stock,
        })),
      });
    }

    case "consultar_stock": {
      const resultado = await consultarStock(input.producto_id as string);
      if (!resultado) {
        return JSON.stringify({ error: `Producto con ID "${input.producto_id}" no encontrado.` });
      }
      return JSON.stringify({ producto_id: input.producto_id, ...resultado });
    }

    case "obtener_precio": {
      const resultado = await obtenerPrecio(input.producto_id as string);
      if (!resultado) {
        return JSON.stringify({ error: `Producto con ID "${input.producto_id}" no encontrado.` });
      }
      return JSON.stringify({ producto_id: input.producto_id, ...resultado });
    }

    case "obtener_detalle_producto": {
      const producto = await obtenerProductoPorId(input.producto_id as string);
      if (!producto) {
        return JSON.stringify({ error: `Producto con ID "${input.producto_id}" no encontrado.` });
      }
      return JSON.stringify(producto);
    }

    case "registrar_pedido": {
      try {
        await registrarPedido({
          clienteNombre: input.cliente_nombre as string,
          clienteRut: input.cliente_rut as string,
          clienteTelefono: input.cliente_telefono as string,
          clienteDireccion: input.cliente_direccion as string,
          tipoDocumento: input.tipo_documento as "boleta" | "factura",
          razonSocial: input.razon_social as string | undefined,
          giro: input.giro as string | undefined,
          productos: input.productos as string,
          total: input.total as number,
          whatsappCliente: input.whatsapp_cliente as string,
        });
        return JSON.stringify({ ok: true, mensaje: "Pedido registrado y vendedor notificado." });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[tools] Error registrando pedido:", msg);
        return JSON.stringify({ ok: false, mensaje: `Error al registrar el pedido: ${msg}` });
      }
    }

    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
  }
}
