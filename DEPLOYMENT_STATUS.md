# 📦 Estado del Despliegue a Google Cloud Platform

**Fecha:** 2026-06-11  
**Estado:** ⏳ EN PROGRESO (GitHub Actions compilando)  
**Tiempo estimado:** 5-10 minutos

---

## ✅ Completado

### Infraestructura GCP
- ✓ Proyecto: `conecta-ai-499103`
- ✓ Cloud SQL PostgreSQL 15 (`wbot-db`, RUNNABLE)
- ✓ Artifact Registry (`us-central1-docker.pkg.dev/conecta-ai-499103/wbot`)
- ✓ Service Account GitHub Actions (`github-deployer`)
- ✓ Secret Manager (WHATSAPP_ACCESS_TOKEN, ANTHROPIC_API_KEY, OPENAI_API_KEY)

### GitHub Actions
- ✓ Workflow configurado (`.github/workflows/deploy.yml`)
- ✓ 12 GitHub Secrets creados
- ✓ Push triggerrado (commit `5dff078`)

### Documentación
- ✓ `GCP_DEPLOYMENT.md` (instrucciones detalladas)
- ✓ Dockerfile (multi-stage, optimizado)
- ✓ Configuración Cloud Run (Cloud SQL Proxy)

---

## ⏳ En Progreso

GitHub Actions está:
1. Descargando dependencias npm
2. Compilando TypeScript
3. Construyendo imagen Docker
4. Pusheando a Artifact Registry
5. Desplegando a Cloud Run

**Monitorear:**
- GitHub Actions: https://github.com/dxfactor/WBot/actions
- GCP Cloud Run: https://console.cloud.google.com/run/detail/us-central1/wbot?project=conecta-ai-499103

---

## 🚀 Próximo: Configurar Meta

Cuando Cloud Run esté listo (URL disponible), actualiza el webhook en Meta:

### En Meta Business Platform:
1. Ve a: https://developers.facebook.com/apps
2. Selecciona tu app
3. WhatsApp → Configuración
4. **Webhook URL:** `https://[CLOUD_RUN_URL]/webhook`
5. **Token verificación:** `ff46df85ca6a5fa3973fc824511287a501123a85c82ca6b3ff518fde207eedd0`
6. Haz clic en "Verificar y guardar"

---

## 📋 URLs Finales

Una vez desplegado:

```
🌐 Servicio: https://wbot-XXXXXX-uc.a.run.app

📱 Webhook:  https://wbot-XXXXXX-uc.a.run.app/webhook
📊 Dashboard: https://wbot-XXXXXX-uc.a.run.app/dashboard.html
💚 Health:    https://wbot-XXXXXX-uc.a.run.app/health
```

**Dashboard Login:**
- Usuario: `admin`
- Contraseña: `demo.20.26`

---

## 🗂️ Archivo de Referencia

Todas las instrucciones completas están en `GCP_DEPLOYMENT.md`:
- Variables de entorno
- Monitoreo y logs
- Costeo estimado
- Procedimiento de eliminación (si necesario)

---

## ❓ ¿Qué hacer si tarda mucho?

Si tras 15 minutos aún no está desplegado:

```bash
# Revisar logs de GitHub Actions
# → https://github.com/dxfactor/WBot/actions

# Revisar si hay errores en Cloud Run
gcloud run services describe wbot \
  --region us-central1 \
  --project conecta-ai-499103 \
  --format=json | jq .status

# Ver logs de Cloud Run si existe
gcloud run logs read wbot \
  --region us-central1 \
  --project conecta-ai-499103 \
  --limit 50
```

---

## ✨ Resumen Técnico

| Componente | Config |
|---|---|
| **Imagen Docker** | Node 20 Alpine, multi-stage |
| **Cloud SQL** | PostgreSQL 15, db-f1-micro, Socket Unix |
| **Cloud Run** | 1GB RAM, 1 CPU, min 1 instancia |
| **Puerto** | 8080 |
| **Auth Webhook** | Deshabilitada (Allow Unauthenticated) |
| **Región** | us-central1 |

