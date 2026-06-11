# Despliegue de Conecta AI en Google Cloud Platform

## ✓ Estado: En despliegue

**Fecha:** 2026-06-11  
**Proyecto GCP:** `conecta-ai-499103`  
**Región:** `us-central1`

---

## Recursos Creados

### Cloud SQL
```
Instancia:    wbot-db
Motor:        PostgreSQL 15
Máquina:      db-f1-micro
IP Pública:   34.59.103.224
Usuario:      postgres
Contraseña:   WBot.Prod.2026!
Base de datos: WBot
```

### Artifact Registry
```
Repositorio: us-central1-docker.pkg.dev/conecta-ai-499103/wbot
Imágenes:    wbot:latest, wbot:SHA
```

### Cloud Run
```
Servicio:        wbot
Región:          us-central1
Plataforma:      Managed
Min instancias:  1
Autenticación:   Deshabilitada (Allow Unauthenticated)
Puerto:          8080
```

### IAM Service Account
```
Cuenta:  github-deployer@conecta-ai-499103.iam.gserviceaccount.com
Roles:   - Cloud Run Admin
         - Artifact Registry Writer
         - Cloud SQL Client
         - Secret Manager Secret Accessor
         - Service Account User
```

### Secret Manager
```
✓ WHATSAPP_ACCESS_TOKEN
✓ ANTHROPIC_API_KEY
✓ OPENAI_API_KEY
```

---

## Pasos Siguientes

### 1️⃣ Esperar despliegue a Cloud Run (5-10 minutos)

```bash
# Monitorear progreso
gcloud run services describe wbot \
  --region us-central1 \
  --project conecta-ai-499103 \
  --format="value(status.url)"
```

### 2️⃣ Obtener URL del servicio

Una vez desplegado:
```bash
URL=$(gcloud run services describe wbot \
  --region us-central1 \
  --project conecta-ai-499103 \
  --format="value(status.url)")

echo "Webhook URL: $URL/webhook"
```

### 3️⃣ Actualizar Webhook en Meta Business Platform

1. Ve a: **https://developers.facebook.com/apps**
2. Selecciona tu app
3. WhatsApp → Configuración
4. Webhook URL: `https://wbot-XXXXXX-uc.a.run.app/webhook`
5. Token verificación: `ff46df85ca6a5fa3973fc824511287a501123a85c82ca6b3ff518fde207eedd0`
6. Haz clic en Verificar y guardar

### 4️⃣ Inicializar Base de Datos

Una vez que Cloud Run está corriendo y conectado a Cloud SQL:

```bash
# La BD se inicializa automáticamente al primer request que intenta
# leer/escribir en las tablas. O ejecuta manualmente:

gcloud sql connect wbot-db \
  --user=postgres \
  --project=conecta-ai-499103 < /tmp/init-wbot.sql
```

Schema incluye:
- `productos` (catálogo)
- `pedidos` (órdenes)
- `cotizaciones` (análisis de cotizaciones)

### 5️⃣ Pruebas

```bash
# Health check
curl https://wbot-XXXXXX-uc.a.run.app/health

# Stats
curl https://wbot-XXXXXX-uc.a.run.app/stats

# Dashboard
https://wbot-XXXXXX-uc.a.run.app/dashboard.html
  User: admin
  Pass: demo.20.26
```

---

## Variables de Entorno (Configuradas)

| Variable | Valor |
|---|---|
| `DB_SOCKET_PATH` | `/cloudsql/conecta-ai-499103:us-central1:wbot-db` |
| `DB_DATABASE` | `WBot` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `WBot.Prod.2026!` |
| `WHATSAPP_PHONE_NUMBER_ID` | `1082819168257082` |
| `WHATSAPP_VERIFY_TOKEN` | `ff46df85ca6a5fa3973fc824511287a501123a85c82ca6b3ff518fde207eedd0` |
| `VENDEDOR_PHONE` | `56942855506` |
| `BUSINESS_NAME` | `Conecta AI` |
| `SESSION_SECRET` | (generado al crear secrets) |
| `DASHBOARD_USER` | `admin` |
| `DASHBOARD_PASS` | `demo.20.26` |
| `DEV_TOOLS` | `false` |
| `PORT` | `8080` |

---

## Monitoreo

### Logs
```bash
gcloud run logs read wbot \
  --limit 50 \
  --region us-central1 \
  --project conecta-ai-499103
```

### Métricas
```bash
# Dashboard: https://console.cloud.google.com/run/detail/us-central1/wbot
```

### Alertas (recomendado configurar)
- CPU > 80%
- Memoria > 80%
- Error rate > 1%
- Latencia p99 > 2s

---

## Costos Estimados (Mensual)

| Servicio | Estimado |
|---|---|
| Cloud Run | ~$1-5 USD (depends on traffic) |
| Cloud SQL | ~$10-15 USD (db-f1-micro) |
| Secret Manager | ~$0.60 USD |
| **Total** | **~$12-21 USD/mes** |

---

## Deshacer (si es necesario)

```bash
# Eliminar Cloud Run service
gcloud run services delete wbot \
  --region us-central1 \
  --project conecta-ai-499103

# Eliminar Cloud SQL
gcloud sql instances delete wbot-db \
  --project conecta-ai-499103

# Eliminar Artifact Registry
gcloud artifacts repositories delete wbot \
  --location us-central1 \
  --project conecta-ai-499103

# Eliminar Service Account
gcloud iam service-accounts delete \
  github-deployer@conecta-ai-499103.iam.gserviceaccount.com \
  --project conecta-ai-499103
```

---

## Contacto & Soporte

- **GCP Console:** https://console.cloud.google.com
- **Cloud Run Service:** https://console.cloud.google.com/run/detail/us-central1/wbot
- **Cloud SQL Instance:** https://console.cloud.google.com/sql/instances/wbot-db
- **GitHub Actions:** https://github.com/dxfactor/WBot/actions
