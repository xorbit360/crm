# 📘 MANUAL DEL PROYECTO — Xorbit 360 CRM

> **Documento vivo.** Actualizar cada vez que se agregue una funcionalidad,
> se cambie una regla o se tome una decisión arquitectónica importante.
> Última actualización: 2026-10-14

---

## 1. REGLAS CRÍTICAS (nunca romper)

### 1.1 Aislamiento multiusuario
- **Cada usuario es independiente. Ningún usuario puede ver ni tocar datos de otro.**
- Jerarquía: `Superadmin` (Oscar, dueño plataforma) > `Admin` (cliente que paga) > `Miembro` (equipo del admin).
- Datos aislados por `userKey` en `currentDB.userData[userKey]`: productos, pedidos, clientes, chats, config IA, wallet, comentarios sociales.
- Canales WhatsApp: `currentDB.whatsappProvidersByUser[userKey]`.
- Cuentas Zernio: `currentDB.zernioAccountOwners[accountId] = userKey`.
- Webhooks: `platform.webhooks.{userKey}` en Supabase `app_settings`.
- Live Selling: `tenantId()` usa la sesión real, NUNCA `DEFAULT_TENANT` compartido.
- El equipo trabaja dentro de la cuenta del Admin (no pagan canales por separado).

### 1.2 Seguridad
- Webhook de Bold DEBE validar firma HMAC-SHA256. Sin `BOLD_SECRET_KEY` se loguea advertencia.
- Login con rate-limit: 10 intentos por IP cada 15 minutos.
- Headers de seguridad HTTP activos (XSS, clickjacking, etc.).
- Nunca guardar contraseñas, tokens o claves API en memoria, archivos, Git o logs.
- Nunca inventar resultados, certificaciones o pruebas E2E.

### 1.3 Despliegue seguro
- NUNCA `docker compose down` antes de que la imagen nueva esté construida y sana.
- Orden: build → verificar `dist/server.js` → health-check → recrear → retirar anterior.
- No tocar sin autorización: `menu_data.json`, `Dockerfile.runtime-backup`, `mcp.ts` de raíz.

### 1.4 Diseño y marca
- Diseño permanente: serio, oscuro y dorado. NUNCA pastel ni arcoíris.
- NADA visible de "Zernio" para usuarios finales (términos neutros: "conexión oficial").
- No reintroducir Odoo (eliminado por orden de Oscar).
- En URLs de ejemplo, NUNCA la palabra "ejemplo" en la URL.

### 1.5 Comunicación con Oscar
- Responder en español, directo, cálido, ejecutivo.
- Oscar opera desde el celular: instrucciones breves y copiables.
- Antes de enviar algo a terceros: mostrar borrador y obtener aprobación explícita.
- No pedirle terminal salvo bloqueo nuevo y verificado.

---

## 2. MODELO DE NEGOCIO

### 2.1 Precios (USD)
| Paquete | Precio | Conversaciones | Msgs IA |
|---------|--------|----------------|----------|
| Starter | $19 | 500 | 25 |
| Standard | $33 | 1,000 | 40 |
| Pro | $69 | 3,000 | 50 |
| Enterprise | $319 | 20,000 | 65 |

### 2.2 Cobro por canales
- Primer canal GRATIS.
- Cada paquete incluye 1 canal + 1 mes gratis.
- Canal adicional: **$10 USD/mes** recurrente.
- El agente IA no cuenta como canal.
- Canales ilimitados si están pagos (ej: 20 Instagrams).
- Al vencer el pago: se desconecta la cuenta y se elimina de Zernio.

### 2.3 Costos Zernio (referencia)
- Primeras 2 cuentas gratis; 3-10 a $6; 11-100 a $3; 101-2000 a $1 por cuenta/mes.

---

## 3. ARQUITECTURA

### 3.1 Infraestructura
- **CRM:** https://crm.xorbit360.com/
- **Web:** https://xorbit360.com/
- **Repo:** ~/workspace/crm-repo → https://github.com/xorbit360/crm
- **VPS:** root@srv1981453.hstgr.cloud
- **App:** /docker/crm-xorbit/app | **Compose:** /docker/crm-xorbit
- **Supabase ref:** wmxilttilpcnnqodkbqf

### 3.2 Componentes principales
```
server.ts                    # Servidor principal (Express)
server/auth.ts               # Autenticación y sesiones
server/liveSelling.ts        # Módulo Live Selling (tenant por usuario)
server/platformWebhooks.ts   # Webhooks entrantes (aislados por usuario)
server/zernio/routes.ts      # Integración Zernio (OAuth por usuario)
server/ads.ts                # Proxy Zernio Ads (8 plataformas)
src/App.tsx                  # Frontend principal
src/components/TeamManagementView.tsx  # Gestión de equipos
src/components/OnboardingWizard.tsx    # Onboarding 5 pasos
```

### 3.3 Helpers clave de aislamiento
```typescript
getUserKey(req)           // Key del usuario desde sesión
getEffectiveUserKey(req)  // Key efectiva (miembro → admin dueño)
getUserDataStore(userKey) // Datos aislados del usuario
getIsolatedData(req, key) // Lee dato aislado o global según rol
isAdminRequest(req)       // true si superadmin o admin
hasPermission(role, perm) // Verifica permiso por rol y nicho
```

---

## 4. FUNCIONALIDADES IMPLEMENTADAS

### 4.1 Multiusuario (2026-10-14)
- [x] Datos aislados por usuario (productos, pedidos, clientes, chats)
- [x] Canales WhatsApp por usuario
- [x] Cuentas Zernio por usuario (ownership tracking)
- [x] Live Selling con tenant real
- [x] Config IA por usuario (botPrompt, saludo)
- [x] Wallet/saldo por usuario
- [x] Webhooks por usuario
- [x] Comentarios sociales por usuario
- [x] Equipos con roles por nicho (6 nichos definidos)
- [x] Cobro por canales ($10/mes adicional)

### 4.2 Seguridad (2026-10-14)
- [x] Validación firma HMAC webhook Bold
- [x] Rate-limit login (10/15min)
- [x] Headers de seguridad HTTP
- [x] Logs sin datos sensibles

### 4.3 SaaS (2026-10-14)
- [x] Onboarding guiado (5 pasos)
- [x] Dashboard ROI (/api/roi/dashboard)
- [x] Logs auditoría equipo (/api/team/audit-log)

### 4.4 Canales
- WhatsApp: Evolution (QR) + Zernio coexistencia + Zernio solo-API
- Instagram/Facebook/TikTok vía Zernio (OAuth por usuario)
- Bot IA con auto-pausa al responder manual (se reactiva con 🤖)

### 4.5 Módulos activos (2026-10-14)
Solo módulos con funcionalidad real (backend integrado):
- [x] WhatsApp Bot AI & CRM (62 llamadas API)
- [x] Llamadas IA & Agente de Voz (30 llamadas API)
- [x] Gestión de Ads (18 llamadas API)
- [x] Live Selling & Streaming (16 llamadas API)
- [x] Generación de Video IA

### 4.6 Módulos eliminados (2026-10-14)
Eliminados por no tener funcionalidad real (0 llamadas API, 0 guardado):
- [x] Email Marketing AI (482 líneas)
- [x] Branding & Identidad Visual (1,426 líneas)
- [x] Estudio de Mercado & Nichos (1,023 líneas)
- [x] Landing Pages & Funnels (1,020 líneas)
- [x] Creación & Contenido UGC (1,225 líneas)
- Total: 5,176 líneas eliminadas
- Backup: rama `backup-antes-limpieza-2026-10-14`

### 4.5 Otros módulos
- Live Selling (landings, YouTube/Vimeo, comentarios simulados)
- Constructor de páginas (12 bloques, 13 plantillas)
- Ads/Tráfico (8 plataformas, piloto automático)
- Social + inbox único
- Telefonía (Twilio, agente voz IA)
- Diagnóstico de conversión
- Sistema de referidos (5 niveles, 40% total)
- Video IA (6 modelos OpenRouter)

---

## 5. ROLES POR NICHO

| Nicho | Roles |
|-------|-------|
| E-commerce | admin, confirmación, ventas, logística, soporte |
| Restaurante | admin, mesero, cocina, caja, delivery |
| Hotel | admin, recepción, reservas, limpieza |
| Clínica | admin, recepción, médico, enfermería |
| Inmobiliaria | admin, agente, captación, cierre |
| Servicios/General | admin, ventas, soporte |

---

## 6. ENDPOINTS CLAVE

```
POST /api/auth/login              # Login (con rate-limit)
GET  /api/team/niches             # Nichos disponibles
POST /api/team/niche              # Asignar nicho
GET  /api/team/members            # Miembros del equipo
POST /api/team/members            # Invitar miembro
GET  /api/channels/status         # Estado de canales
POST /api/channels/purchase       # Comprar canal adicional
GET  /api/roi/dashboard           # Métricas ROI por usuario
GET  /api/team/audit-log          # Auditoría del equipo
POST /api/integrations/bold/webhook  # Webhook pagos (firma HMAC)
```

---

## 7. PENDIENTES CONOCIDOS

- [ ] Rotar ADMIN_PASSWORD y MCP_SUPERADMIN_TOKEN (requiere autorización Oscar)
- [ ] Limpiar secretos del docker-compose
- [ ] Integrar OnboardingWizard en App.tsx (componente creado, falta render)
- [ ] Sección "Equipos/Multiusuario" en página principal xorbit360.com
- [ ] Job automático de vencimiento de canales
- [ ] Pruebas E2E multiusuario completas

### Deuda UX (auditoría 2026-10-14)
- [ ] Ads: tarjeta promete 4 funciones, sidebar muestra 2 (alinear)
- [ ] Live Selling: tarjeta promete 3 funciones, sidebar vacío (exponer submódulos)
- [ ] Contenido UGC: navegación duplicada (sidebar + botones en contenido)
- [ ] Dos copilotos IA superpuestos (unificar o diferenciar roles)
- [ ] Nombres poco claros: "Mis Embudos", "Radar"

---

## 8. ROLLBACK (revertir un despliegue malo)

Si producción falla después de un deploy:

```bash
# 1. Ver qué imagen anterior existe
docker images crm-xorbit-crm --format "{{.Tag}} {{.CreatedAt}}"

# 2. Volver a la imagen anterior (reemplaza TAG_ANTERIOR)
cd /docker/crm-xorbit
docker compose up -d --force-recreate crm
# Si no funciona, especificar imagen anterior en docker-compose.yml

# 3. Verificar
curl -s -o /dev/null -w "%{http_code}" https://crm.xorbit360.com/
# Debe responder 200

# 4. Ver logs del error
docker compose logs --tail=50 crm
```

**Regla:** nunca borrar las últimas 2 imágenes estables.

---

## 9. RESPUESTA A INCIDENTES

| Síntoma | Acción inmediata |
|---------|------------------|
| CRM responde 404 | Contenedor en restart loop → ver logs → rollback |
| CRM responde 502 | Traefik no alcanza el contenedor → `docker compose ps` |
| Login no funciona | Verificar SESSION_SECRET y Supabase |
| Webhook Bold no procesa | Verificar BOLD_SECRET_KEY y firma |
| Bot no responde | Verificar Zernio token y Evolution |
| Datos mezclados entre usuarios | EMERGENCIA → revisar `getEffectiveUserKey()` |

**Siempre:** capturar el error exacto antes de corregirlo. Nunca inventar la causa.

---

## 10. CHECKLIST PRE-LANZAMIENTO

Antes de cada release a producción:

- [ ] `npm run build` genera `dist/server.js` sin errores
- [ ] PROJECT_MANUAL.md actualizado con los cambios
- [ ] Ninguna regla crítica afectada (sección 1)
- [ ] Commit descriptivo en `main`
- [ ] Backup de Supabase `app_settings` (exportar)
- [ ] Deploy con procedimiento seguro (sección 1.3)
- [ ] Health-check: CRM responde 200
- [ ] Login funciona con usuario de prueba
- [ ] Aislamiento verificado: usuario A no ve datos de usuario B

---

## 11. HISTORIAL DE DECISIONES

---

> **Al modificar este proyecto:** leer este manual primero. Si tu cambio
> afecta alguna regla crítica, detenlo y consulta con Oscar antes de continuar.
