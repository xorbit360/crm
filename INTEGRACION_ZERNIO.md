# Integración Zernio + Xorbit 360

## Webhook

`https://crm.xorbit360.com/api/zernio/webhook`

El endpoint acepta la verificación GET de Zernio y eventos POST. Procesa eventos de conversaciones, mensajes, cuentas, entregas, lecturas, fallos, reacciones y comentarios.

## Canales disponibles

Instagram, TikTok, X/Twitter, Facebook Messenger, LinkedIn, YouTube, WhatsApp, Threads, Pinterest, Reddit, Bluesky, Telegram, Google Business, Snapchat, Discord y Slack.

La pantalla de Canales permite filtrar, conectar y revisar el estado de cada canal. La disponibilidad final depende de que la cuenta tenga permisos y aprobación de la plataforma correspondiente.

## Capacidades

- Conectar cuentas mediante OAuth de Zernio.
- Recibir mensajes y eventos por webhook.
- Normalizar conversaciones multicanal en el CRM.
- Enviar mensajes desde el endpoint unificado.
- Sincronizar cuentas conectadas y perfiles.
- Importar historial de conversaciones.
- Registrar eventos de entrega, lectura y error.
- Automatizar respuestas del bot y escalar al equipo humano.
- Asociar conversaciones a clientes, pedidos, embudos y etiquetas.
- Disparar notificaciones de logística: confirmado, despachado, novedad y entregado.
- Integrar Dropi, MasterShop y Effix para eventos logísticos.
- Mantener idempotencia de eventos y recuperación de eventos fallidos.

## Pruebas

1. En Zernio registra la URL del webhook.
2. Activa los eventos que necesites.
3. Ejecuta `Test webhook`.
4. Comprueba que la respuesta sea HTTP 200.
5. Conecta una cuenta desde Canales en Xorbit 360.
6. Envía un mensaje real y verifica que aparezca en Conversaciones.

## Endpoints internos principales

- `GET /api/zernio/config-status`
- `GET /api/zernio/accounts`
- `GET /api/zernio/connect-url?platform=instagram`
- `GET /api/zernio/webhook`
- `POST /api/zernio/webhook`
- `GET /api/zernio/webhook/status`
- `POST /api/zernio/webhook/register`
- `POST /api/zernio/send-message`
- `POST /api/zernio/history/import`
- `POST /api/zernio/logistics/notify`

## Recomendación de seguridad

Mantén la clave de Zernio únicamente en las variables de entorno del servidor. Una vez terminadas las pruebas, desactiva el modo de firmas legacy y deja activo solamente el webhook nuevo con firma HMAC.
