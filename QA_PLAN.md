# Plan de QA - WhatsApp Bot Ferretería Tarugo

## 1. FLUJO DE COTIZACIONES

### 1.1 Prueba: Cliente inicia flujo de cotización
**Pasos:**
1. Enviar "2" desde WhatsApp para seleccionar cotización
2. Verificar que bot responde con instrucciones

**Resultado esperado:**
- ✅ Bot responde: "📄 ¡Listo! Estás en el flujo de cotización..."
- ✅ Sesión guardada con context="cotizacion"

**Criterios de aceptación:**
- Mensaje recibido en menos de 3 segundos
- Sesión activa por 30 minutos
- Puede cambiar de flujo escribiendo "menu"

---

### 1.2 Prueba: Enviar cotización como texto
**Pasos:**
1. En flujo de cotización, escribir: "Necesito: Cemento x2 bolsas, Ladrillo x1000"
2. Bot debe identificar productos

**Resultado esperado:**
- ✅ Bot valida contra catálogo
- ✅ Muestra productos encontrados
- ✅ NO muestra precios
- ✅ Solicita datos del cliente (nombre, teléfono, email)

**Criterios de aceptación:**
- Productos identificados correctamente
- Sin precios visibles al cliente
- Campos solicitados: nombre, teléfono, email

---

### 1.3 Prueba: Enviar cotización como imagen
**Pasos:**
1. Capturar screenshot de lista de productos
2. Enviar como imagen
3. Bot debe procesar

**Resultado esperado:**
- ✅ Imagen procesada por Claude Vision
- ✅ Productos extraídos
- ✅ Validados contra catálogo
- ✅ Solicita datos del cliente

**Criterios de aceptación:**
- Tasa de reconocimiento > 90%
- Respuesta en menos de 10 segundos
- Manejo de alternativas claro

---

### 1.4 Prueba: Cambio de estado (alternativas)
**Pasos:**
1. Enviar producto que no existe: "Ladrillo especial XYZ"
2. Verificar que bot sugiere alternativa

**Resultado esperado:**
- ✅ Bot identifica "no existe"
- ✅ Busca alternativa similar
- ✅ Muestra: "[ALTERNATIVA] Ladrillo reforzado"
- ✅ Permite cliente confirmar o rechazar

**Criterios de aceptación:**
- Alternativa relevante (mismo tipo/categoría)
- Claramente marcada como alternativa
- Cliente puede aceptar/rechazar

---

### 1.5 Prueba: Guardar cotización
**Pasos:**
1. Completar flujo: productos validados + datos cliente
2. Cliente confirma: "si" o "confirmar"
3. Bot guarda en BD

**Resultado esperado:**
- ✅ Cotización guardada en BD
- ✅ Número de cotización generado (#0001, #0002, etc)
- ✅ Email de confirmación enviado
- ✅ Notificación al vendedor

**Criterios de aceptación:**
- Cotización visible en BD: `SELECT * FROM cotizaciones WHERE estado='Recibida'`
- Productos guardados en `cotizacion_productos` (1 registro por producto)
- Email enviado al cliente
- WhatsApp enviado al vendedor (VENDEDOR_PHONE)

---

## 2. DASHBOARD ADMIN

### 2.1 Prueba: Acceder al dashboard
**URL:** `http://localhost:8080/cotizaciones` (local) o Cloud Run

**Resultado esperado:**
- ✅ Carga sin errores
- ✅ Lista de cotizaciones visible
- ✅ Estados coloreados

**Criterios de aceptación:**
- Tiempo de carga < 2 segundos
- Todas las cotizaciones listadas
- Filtros funcionan

---

### 2.2 Prueba: Ver detalles de cotización
**Pasos:**
1. En dashboard, hacer click en "Ver detalles y margen"
2. Ver modal con información

**Resultado esperado:**
- ✅ Modal abre sin errores
- ✅ Muestra por cada producto:
  - Nombre (lo que pidió cliente)
  - Cantidad
  - Precio venta (catálogo)
  - Precio compra (última compra)
  - **% Margen = ((Venta - Compra) / Compra) × 100**
- ✅ Indica si es alternativa

**Criterios de aceptación:**
- Cálculo de margen correcto
- Colores: positivo (verde) / negativo (rojo)
- Datos completos y legibles

---

### 2.3 Prueba: Cambiar estado
**Pasos:**
1. Cotización en estado "Recibida"
2. Click en botón "✓ Revisar"
3. Estado cambia a "Revisada"

**Resultado esperado:**
- ✅ Estado actualizado en BD
- ✅ Interfaz refleja cambio
- ✅ Color del card se actualiza
- ✅ Botones cambian según nuevo estado

**Criterios de aceptación:**
- Transiciones: Recibida → Revisada → Respondida → Cerrada
- No hay reversa (no puede volver atrás)
- Cambios persisten en BD

---

### 2.4 Prueba: Filtrar cotizaciones
**Pasos:**
1. Seleccionar estado en dropdown
2. Verificar lista se filtra

**Resultado esperado:**
- ✅ Solo cotizaciones del estado seleccionado
- ✅ "Todos" muestra todas

**Criterios de aceptación:**
- Filtro instantáneo
- Números correctos

---

## 3. BASE DE DATOS

### 3.1 Prueba: Integridad de tablas
**Pasos:**
```sql
-- Verificar estructura
\d cotizaciones
\d cotizacion_productos
```

**Resultado esperado:**
- ✅ `cotizaciones`: id, fecha, cliente_*, tipo, descripcion, estado
- ✅ `cotizacion_productos`: id, cotizacion_id (FK), nombre_cotizado, cantidad, precios, margen, etc

**Criterios de aceptación:**
- ForeignKeys correctas
- Índices en cotizacion_id
- Tipos de datos correctos

---

### 3.2 Prueba: Relación 1:N
**Pasos:**
1. Guardar cotización con 3 productos
2. Verificar registros

```sql
SELECT * FROM cotizaciones WHERE id = 1;
SELECT * FROM cotizacion_productos WHERE cotizacion_id = 1;
```

**Resultado esperado:**
- ✅ 1 registro en cotizaciones
- ✅ 3 registros en cotizacion_productos
- ✅ Todos con cotizacion_id = 1

**Criterios de aceptación:**
- Relación 1:N funciona
- Cascada DELETE funciona

---

### 3.3 Prueba: Eliminación en cascada
**Pasos:**
1. Eliminar cotización
2. Verificar productos se eliminan también

```sql
DELETE FROM cotizaciones WHERE id = 1;
SELECT COUNT(*) FROM cotizacion_productos WHERE cotizacion_id = 1;
```

**Resultado esperado:**
- ✅ Cotización eliminada
- ✅ Productos también eliminados (COUNT = 0)

**Criterios de aceptación:**
- No quedan huérfanos
- BD consistente

---

## 4. PRUEBAS DE INTEGRACIÓN

### 4.1 Prueba: Cloud Run ↔ Cloud SQL
**Pasos:**
1. Enviar cotización desde WhatsApp (producción)
2. Verificar en Cloud Run logs
3. Verificar en Cloud SQL

**Resultado esperado:**
- ✅ Sin errores de conexión
- ✅ Datos guardados en Cloud SQL
- ✅ Dashboard muestra datos
- ✅ Log: "[cotizacion] #XXXX guardada con N productos"

**Criterios de aceptación:**
- Latencia < 5 segundos
- Cero errores de BD
- Datos consistentes

---

### 4.2 Prueba: Email de confirmación
**Pasos:**
1. Guardar cotización con email válido
2. Verificar inbox del cliente

**Resultado esperado:**
- ✅ Email recibido en < 2 minutos
- ✅ Contiene: número cot, productos, datos cliente
- ✅ NO contiene precios

**Criterios de aceptación:**
- Email enviado correctamente
- Formato profesional
- Links funcionan

---

### 4.3 Prueba: Notificación al vendedor
**Pasos:**
1. Guardar cotización
2. Vendedor recibe WhatsApp

**Resultado esperado:**
- ✅ Mensaje WhatsApp al VENDEDOR_PHONE
- ✅ Contiene: cliente, teléfono, email, productos (resumido)
- ✅ Link wa.me para responder

**Criterios de aceptación:**
- Mensaje recibido en < 30 segundos
- Información completa
- Formato legible

---

## 5. PRUEBAS DE RENDIMIENTO

### 5.1 Carga de dashboard
**Prueba:** Dashboard con 100+ cotizaciones

**Resultado esperado:**
- ✅ Carga en < 3 segundos
- ✅ Scroll fluido
- ✅ Filtros rápidos

---

### 5.2 Query de comparativa
**Prueba:** Ver detalles de cotización con 20 productos

**Resultado esperado:**
- ✅ Modal abre en < 1 segundo
- ✅ Todos los datos presentes

---

## 6. PRUEBAS DE SEGURIDAD

### 6.1 Precio no visible al cliente
**Pasos:**
1. Inspeccionar elementos del navegador durante flujo
2. Buscar números de precios

**Resultado esperado:**
- ✅ NO hay precios en mensajes
- ✅ NO hay precios en email
- ✅ NO hay precios en interfaz del cliente

**Criterios de aceptación:**
- Cero exposición de precios
- Datos sensibles en BD solamente

---

### 6.2 Autenticación del dashboard
**Pasos:**
1. Intentar acceder a `/api/dashboard/cotizaciones` sin auth
2. Intentar acceder a `/cotizaciones` sin login

**Resultado esperado:**
- ✅ `/api/dashboard/cotizaciones` retorna 401
- ✅ `/cotizaciones` redirige a login o requiere auth

**Criterios de aceptación:**
- Admin solo: requireAuth funciona

---

## 7. CHECKLIST DE QA FINAL

### Antes de Deploy a Producción

- [ ] Flujo de cotización funciona (texto, imagen)
- [ ] Dashboard muestra todas las cotizaciones
- [ ] Cálculo de margen correcto en 10+ cotizaciones
- [ ] Cambio de estado funciona
- [ ] Filtros del dashboard funcionan
- [ ] Email de confirmación enviado
- [ ] Notificación al vendedor enviada
- [ ] BD: cotizaciones y cotizacion_productos sincronizadas
- [ ] No hay precios visibles al cliente
- [ ] Logs limpios (no errores)
- [ ] Cloud Run conecta a Cloud SQL sin problemas
- [ ] API endpoints retornan datos correctos
- [ ] Margen visible en dashboard
- [ ] Alternativas claramente marcadas
- [ ] Sesiones expiran correctamente (30 min)

---

## 8. PRUEBAS MANUALES - CASOS EDGE

### 8.1 Cliente sin datos
**Escenario:** Cliente intenta guardar sin rellenar campos

**Esperado:** Bot pide nuevamente los datos

### 8.2 Producto sin stock
**Escenario:** Producto existe pero stock = 0

**Esperado:** Dashboard muestra stock = 0, admin notificado

### 8.3 Margen negativo
**Escenario:** Precio compra > precio venta

**Esperado:** Margen negativo en rojo, admin alerta

### 8.4 Múltiples cotizaciones mismo cliente
**Escenario:** Cliente envía 5 cotizaciones seguidas

**Esperado:** Todas se guardan con números secuenciales

### 8.5 Cambio de contexto
**Escenario:** Cliente escribe "menu" durante cotización

**Esperado:** Vuelve al menú principal, cotización incompleta NO se guarda

---

## 9. MÉTRICAS DE ÉXITO

| Métrica | Target | Actual |
|---|---|---|
| Tasa de éxito de cotización | > 95% | [ ] |
| Tiempo de respuesta bot | < 3s | [ ] |
| Precisión de margen | 100% | [ ] |
| Disponibilidad dashboard | 99.9% | [ ] |
| Emails entregados | > 98% | [ ] |
| Errores en logs | 0 | [ ] |

---

## 10. REPORTAR ISSUES

**Formato:**
```
Título: [QA] Breve descripción
Pasos para reproducir:
1.
2.
3.

Resultado esperado:
Resultado actual:
Ambiente: Local / Cloud Run
Severidad: Crítico / Alto / Medio / Bajo
```

---

**Generado:** 2026-06-12
**Versión:** 1.0
